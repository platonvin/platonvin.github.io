---
title: My Experience with Rust
lang: 
backlink: ../index.html
headline: my experience with `Rust`
intro_footer: <p><em>information is subjective. Treat it as a story about experience</em></p>
# comments: true
---

Rust attracted attention in gamedev because it promised low-level control with safety, performance, productivity and excellent tooling. Cargo largely stays out of the way, rust-analyzer/clippy/rustfmt work reliably (rustfmt is one of the few formatters that rarely fights me, and RA is helpful), and utilities like cargo-asm help understand the language like black box. Features like tagged unions, built-in tests/benchmarks/docs, stack slices, default traits, associated types, `include_bytes!`, and macros are all there to help you. Dynamic dispatch via `dyn Trait` is less indirect than C++'s equivalent, default containers are fast & checked. MIRI catches UB that would slip elsewhere, and the design-by-committee process has produced an unusually refined language in many surface details.

Yet the deeper you gou [*especially* in gamedev] the more problems become visible.
I guess that for any given feature set, it is impossible to predict how usable the language would be, and we can only try out different features and select the ones that seemed to be increasing productivity. 

Performance is strong when code stays C-like: simple references, struct hierarchies, and enums produce excellent assembly. But the borrow checker pushes towards heavy wrappings with `Option`s, `Rc`/`Cell`s, `Box`es, `dyn` traits, hashtables -- all to satisfy its rules, and the result is noticeably slower.\
Many end up using `Vec` & indexing as "virtual memory" to bypass aliasing analysis entirely, which is defeating the point of having borrow checker in the first place (so you get zero benefits and all downsides). In many cases, ECS is cope for not dealing with borrow checker rules (and moving validation to runtime).
Hidden control flow, disability to alter codegen, branch predictor bloat and barriers from "safety" checks [why are we calling runtime validation "safety"?], complexity of shared allocations and custom allocators - all contribute to Rust being not even close to C.

That is not the main issue, however - core friction in gamedev is the borrow checker's hostility to megastructs. A `Player` with fields like `hand` and `stats` [imagine some generic roguelike deckbuilder] should allow iterating cards while modifying stats, but cross-function partial borrows fail. Workarounds exist - temporary removals (put things into Option - lower perfomance, less readable, more typing), separate parameters (pass separately in every function down in call stack) - all force constant restructuring and/or functions with 10+ arguments. Graphics, physics and gameplay code naturally gravitate toward large coherent objects; Rust makes that painful. We will see if Polonius fixes that.

Control is often withheld on principle. Disabling slice bounds checks for a scope requires ugly wrappers or insanity like replacing the panic hook with `unreachable_unchecked!` (which is not even possible rn). Per-function `-ffast-math` isn't possible without manual intrinsics (and you can't override it in dependencies, and macro system is not strong enough to properly cover that). Zero-division checks, overflow checks, turning asserts into `debug_assert` - all locked behind decisions that seem to assume programmers are reckless and dumb. Fine-grained control is technically possible, but verbose, unreadable and error-prone. The language frequently decides you shouldn't have an opt-in feature because someone might misuse it. Rust is for idiots to write hello world, not engineers building complicated systems.

Math support is surprisingly weak for a new systems language. No built-in SIMD vector types despite SSE being universal (your browser requires it) and entire industry agreeing on almost every implementation detail (to the point of having specialized instructions), so the ecosystem is flooded with competing and syntactically ugly libraries - `nalgebra`, `glam`, `vek`, `cgmath`, dozens more.
Constant casting between `u32`/`usize`/`u64`/`isize` for serialization/performance/APIs adds noise.

The other ecosystems reflect the same fragmentation. Finding a suiting library takes forever. OpenGL setup with `winit`/`glow` is more cumbersome than GLFW [took me multiple hours], Vulkan wrappers keep renaming things for no reason, popular crates like gltf loaders are over-engineered, and documentation often states facts without explaining connections (std::random is a classic: individual pieces clear, overall flow opaque. What do i do with struct X?). Libraries are written as if the reader already understands the problem they're solving - which is precisely why one reaches for a library [if i fully understand the problem, i can type it myself!]. Crates refactor frequently, break APIs unnecessarily (true 1.0.0 stability is rare, everyone just stays at 0.X.Y forever), pull forests of dependencies (staying below triple digits is practically impossible for most projects) [and overwriting dependency of dependency is not there].
Luckily disability of people to write good libraries will make you wanna do everything yourself anyways.
I once ported a simple C magicavoxel (voxel file format) parser because I couldn't decipher its Rust counterpart despite exhaustive reading of source, docs, and examples; yet its C version was crystal clear.

Actually, that is what bothers me the most in crates ecosystem: Rust abstraction mechanisms (as well as whatever latest C++ is pushing) are absolute bonkers for readers to use and understand.
I open a C library. What do i do? Read some struct declarations in **very distinct, separate, and clearly intended for that** header file. Read some function prototypes - "oh, yes, this one gets a Settings* and Allocator* and returns new Object". I know i can just construct the Settings struct myself. Maybe there is `Settings make_default_settings()`. 
How is memory for Object elements stored? That is simply - as a contiguous memory block, allocated with my allocator (or default one, but you can override it with define). How i iterate through them? Just index. How i copy one? Just copy.

Now, how would the Rust counterpart look like? First of, every struct would have a comment like:
```
/// A struct representing an object
struct Object {
    /// Elements of this object
    elements: Vec<elements> 
}
```
Second, the declarations will be scattered across 20 files each ~100loc . You have to jump around a bit. 
Now, how do i make an object? Docs dont really say anything, they just enumerate functions (methods and trait impls, with 90% being auto traits). So there is new function, but it needs some & ResolvedSettings. And you need to create some ConcreteSettings yourself, implement Settings trait and pass it after casting Settings into ResolvedSettings via Into trait. However, compiler is not really going to help here, you must figure out proper imports for that to magically start working (since Trait impls need to be imported, and they magically add methods to structs). 
The library is also going to be async (but its fine, just add some dependencies like pollster and do block_on(future)) with types like ` Pin<Box<dyn Future<Output = ...`. It will come with few traits you need to implement (and per orphan rule, make wrapper types). Also the only way to read its memory is via iterators. Oh, it also does not implement Clone because of author decided to save some memory and play around with references; that is also why you wont be able to move code into helper function (!!!) without erasing lifetimes (i.e. casting everything to 'static).

Two out of three headline claims on the Rust website - *fast*, reliable, *productive* - feel overstated. 
It isn't as fast as C [struct layout optimization is not there, compilers can largely figure out aliasing for C even if restrict is not present, and hidden Rust control flow breaks important reordering optimizations. Luckily, you can ignore large programs and only do micro benchmarks where Rust is not noticeably slower and claim almost the same speed].
Productivity suffers in large non-uniform codebases [multiple big studios tried Rust for games and walked away. Seriously, go to any Rust/gamedev subreddit and try to find "Rust is faster to make a game in" opinion].
"Reliability" rests on a lifetime model that can't express many real patterns without escape hatches or reinvention of pointers/allocators. 

In relation to real safety, Rust is moving in opposite direction - dependency hell certainly does not help with it, as well as static linking.
Bundled dependencies hide vulnerabilities, delay patches, make package management hard.

Rust is not based on some fundamental simple and beautiful theory, and neither it is build for programmers to create real world complex systems on real world silicon - it is more of a collection of hacks that try to look like both. There is many examples to it, like famous 2015 bug casting local lifetimes to `'static` (that instance patched), or its "safety~performance" policy.
Enum variants are not types, there is exception to every feature rule, and assembly is far from optimal.

Good memory management cant be expressed in lifetimes - arenas, linked lists, circular structures need custom handling. Alloca is not there, even scoped allocators are not there.

Rust **does** provide good static analysis. But so do C compilers.

Pin Box Dyn Future with Output = Result < Generic < ... is not even crazy by many rustaceans.

Async creates parallel code universes with pinning and cancellation concerns.

2 main reasons to use Rust for me: winit + wgpu.

[imho] Rust is better than C++ [i.e., faster to make *target* game in if following idiomatic patterns], but against C the trade is less clear: it  adds slow compiles and fat binaries for half-baked functional features and a region model that steers toward unmaintainable architectures.

We need real reflection for inspectors, serialization, and UI. Instead, we have a build-time text generation system that is very complex to write, slow to run, has weird quirks and is limited in power yet hard to cache.

Hot reloading is... Is not. I am not brave enough to try it. Am i gonna break soundness that is only catchable by MIRI?

Despite many problems, my Rust code more often works on the first try, the structure **feels** [but has not **proven** to be] mechanically [more] sound - small pieces transforming data in tandem. I like to imagine it is an Opus Magnum [game] solution. But it is far from the language that trusts both theory and the programmer; and many of promised features solve problems that were never present at expense of noticeable inconvenience. I hope by the time i finish my Rust project, there will be something more fitting available.

Compiling Rust for cross-platform is not as easy as C. For example, none of the officially provided ways for cross compiling to win 7 or wasm work for me [and without understanding of linkers & build systems you likely wont figure it out on yourself].

I would not necessarily call Rust systems programming language in same way C is. Rust is more of a "what C++ should have been but with bad reflection and no respect for the programmer"
Concepts? Traits.
Templates? Constraint-based generics.
Inheritance? fat dyn Trait pointers.
Modules? Modules that work.
...

:)