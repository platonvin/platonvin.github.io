---
title: My Experience with Rust
lang: 
backlink: ../index.html
headline: my experience with `Rust`
intro_footer: <p><em>hey its a subjective opinion</em></p>
# comments: true
---

Rust attracted attention in gamedev because it promises low-level control with safety, performance, productivity and excellent tooling. Cargo "just works", rustfmt is one of the very few formatters i agree with, rust-analyzer is most feature-packed (not perfect) LSP i have ever seen, there are testing, benchmarking, inspecting (assembly) tools that "work out of the box". Tagged unions, built-in docs, stack slices, [default] traits, associated types, `include_bytes!` - whatever you can think of! Dynamic dispatch (less indirect than C++), default containers are fast & checked. MIRI to catch UB, and overall the design-by-committee process has produced an unusually refined language in many surface details.

Yet the deeper you gou [*especially* for games] the more problems become visible.
I guess for any feature set, it is impossible to predict its usability, we can only try features out and select ones that worked, but once they get into some programming language, that language is bound to carry them around, which in turn impacts what new other features can be added.

Performance is strong when code stays simple (C-like): (non-aliasing) references, struct hierarchies, and enums produce excellent assembly. But the borrow checker pushes towards heavy wrappings with `Option`s, `Rc`/`Cell`s, `Box`es, `dyn` traits, hashtables - and the result is noticeably slower.\
Many end up using `Vec` / hashtables & indexing as "virtual memory" to bypass aliasing analysis entirely, which is defeating the point of having borrow checker in the first place (so you get no benefits and most downsides). In many cases, ECS is just cope for not dealing with borrow checker rules (and moving validation to runtime).
Go to any example Rust project with any mature ECS, e.g. Bevy ECS, and just look at enormous complexity - many traits, many proc/decl macros, multiple crates, lifetime shinenigans and overall insane amount of code for something that is usually just few pointers and a function call in C.
I understand "why does it exist" for every part of Rust, but combine, they just seem insane.
Hidden control flow, disability to alter codegen, bloated barriers from "safety" checks [why are we calling runtime validation "safety"?] which also hurt branch predictor, complexity of shared allocations and custom allocators (no one does that) - all contribute to Rust being not even close to C.

Another friction in gamedev is the borrow checker's hostility to megastructs. A `Player` with fields like `hand` and `stats` [imagine some generic roguelike deckbuilder] should allow iterating cards while modifying stats, but cross-function partial borrows fail (simple example would be using self. instead of Self::). Workarounds - temporary removals (put things into Option - lower performance, less readable, more typing), separate parameters (pass separately in every function down in call stack) - all force constant restructuring and/or functions with 10+ arguments. Graphics, physics and gameplay code naturally gravitate toward large coherent objects; Rust makes that painful. [we'll see if Polonius helps with that].

Control is often withheld on principle. Disabling slice bounds checks for a scope requires ugly wrappers or insanity like replacing the panic hook with `unreachable` (im not sure if thats a thing rn). Per-function `-ffast-math` isn't possible without manual intrinsics (you can't override it in dependencies, and macro system is not strong enough to properly cover even your code). Zero-division checks, overflow checks, turning asserts into `debug_assert` - all locked behind decisions that seem to assume programmers are reckless and dumb. Fine-grained control is technically possible, but verbose, unreadable, error-prone, and takes unreasonable amount of work. Wanna see if ffast math would improve perf for a library? Yeah, for it and rewrite it manually. The language frequently decides you shouldn't have an opt-in feature because someone might misuse it. Rust is for idiots to write "hello world", not engineers building complicated systems. And oh boy hello world looks nice and compiles fast.
That is my another issue with Rust. Both people who make the language and those who are public about it are always trying to make decisions for me and impose a solution. Are we programming in isolated emulator or in systems PL? 

You cannot modify allocator for a library/scope. Yeah, fork that lib and make it generic over an Allocator.
Also, i still prefer C preprocessor over Rust decl macros - it is 1) faster 2) simpler 3) more powerful!
You can alter language syntax if you want to! `#defines` can change language syntax, create invisible caching, create declarative DSLs.

Math support is surprisingly weak for a modern systems language. No built-in SIMD vector types despite SSE being universal (your browser requires it) and entire industry agreeing on almost every implementation detail (to the point of having specialized instructions), so the ecosystem is flooded with competing and syntactically ugly (cause no sugar) libraries - `nalgebra`, `glam`, `vek`, `cgmath`, dozens more - and all doing somewhat the same.
Constant casting between `u32`/`usize`/`u64`/`isize`/`NonZero`/`CustomIntegerTrait` because APIs cant agree on integers adds noise. 

Ecosystems in general has this fragmentation problem. Finding a suiting library takes forever. OpenGL setup with `winit`/`glow` is hard for no reason [took me multiple hours; i know all the calls that need to happen under the hood but cant figure out how to use fucking wrappers], Vulkan wrappers keep renaming things for no reason, popular crates like gltf loaders are over-engineered, and documentation often states facts without explaining connections and reasons (std::random: each individual piece is clear, but its usage is opaque to me from reading docs. What do i do with struct X?). Libraries are written as if the reader already understands the problem they're solving - which is precisely why one reaches for a library [if i fully understand the problem, i can type solution myself!]. Crates refactor frequently, break APIs unnecessarily (true 1.0.0 stability is rare, everyone just stays at 0.X.Y forever), pull forests of dependencies (under triple digits is practically impossible for most projects) [and overwriting dependency of dependency is not a thing!*].
Luckily disability of people to write good libraries will make you wanna do everything yourself anyways.
I once ported a simple C magicavoxel (voxel file format) parser because I couldn't decipher its Rust counterpart despite exhaustive reading of its source, docs, and examples. Porting from C was just easier.
* you are not allowed to dictate Cargo which versions of crates to use. It will just compile 10 duplicates and bloat your binary - it knows better.

What bothers me the most in crates ecosystem: Rust abstraction mechanisms (as well as whatever latest C++ is pushing) are absolute bonkers for readers to use and understand.
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
Second, the declarations will be scattered across 20 files each ~100loc and 10 different trait impls. You have to jump around a bit. 
Now, how do i make an object? Docs dont really say anything, they just enumerate functions (methods and trait impls, with 90% being auto traits). So there is new function, but it needs some & ResolvedSettings. And you need to create some ConcreteSettings yourself, implement Settings trait and pass it after casting Settings into ResolvedSettings via Into trait. However, compiler is not really going to help here, you must figure out proper imports for that to magically start working (since Trait impls need to be imported, and they magically add methods to structs). 
The library is also going to be async (but its fine, just add some dependencies like pollster and do block_on(future)) with types like ` Pin<Box<dyn Future<Output = ...`. It will come with few traits you need to implement (and per orphan rule, make wrapper types). Also the only way to read its memory is via iterators. Oh, it also does not implement Clone because of author decided to save some memory and play around with references; that is also why you wont be able to move code into helper function (!!!) without erasing lifetimes (i.e. casting everything to 'static).

Like, seriously. Take some abstract problem and go look at idiomatic Rust and C solutions and just compare complexity and mental overhead for both.

Two out of three headline claims on the Rust website - *fast*, reliable, *productive* - feel overstated. 
It isn't as fast as C [struct layout optimization is not there, compilers can largely figure out aliasing for C even if restrict is not present, and hidden Rust control flow breaks important reordering optimizations. Luckily, you can ignore large programs and only do micro benchmarks where Rust is not noticeably slower and claim the same speed].
Productivity suffers in large non-uniform codebases [multiple big studios tried Rust for games and walked away. Seriously, go to any Rust/gamedev subreddit and try to find "Rust is faster to make a game of same/higher quality in" opinion].
"Reliability" rests on a lifetime model that can't express many real patterns without escape hatches or reinvention of pointers/allocators. 

In relation to real safety, Rust is moving in opposite direction - dependency hell certainly does not help with it, as well as static linking.
Bundled dependencies hide vulnerabilities and delay patches (!). Seriously, dynamic linking exists for a reason! 

Rust is not based on some fundamental simple and beautiful theory, and neither it is build for programmers to create real world complex systems on real world silicon - it is more of a collection of hacks that try to look like both. There is many examples to it, like famous 2015 bug casting local lifetimes to `'static` (that instance patched), or its "safety~performance" policy.
Enum variants are not types, there is exception to every feature rule, and assembly is far from optimal (everyone thinks that Rust type information allows for much greater compiler optimization yet no progress is made in that direction).

Good memory management cant be expressed in lifetimes - arenas, linked lists, circular structures need ugly handling. Alloca is not there, even scoped allocators are not there. Good luck getting hot reload - something trivial in C - working in your Rust project.

Rust **does** provide good static analysis. But so do C compilers.

Pin Box Dyn Future with Output = Result < Generic < ... is not even crazy by many rustaceans.

Async creates parallel code universes (like just look at it. Is it not crazy?)

Why can you not overwrite dependency version? Someone decided that is not safe... Made the decision for you, now go fork like a hundred crates to fix it.

For me, 2 main reasons to use Rust are Wasm and WGPU. If not them, i would be using C with C++20 modules. Thanks, Kvark.

[imho] Rust is better than C++ [i.e., faster to make *target quality* game in if following idiomatic patterns], but against C the trade is less clear: i would say that half of the features make it better and other half makes it worse and its kinda equal in the end.

We need real reflection for inspectors, serialization, and UI. Instead, we have a build-time text generation system that is very complex to write, slow to run, has weird quirks and is limited in power and does not even cache.

Despite many problems, my Rust code more often works on the first try (most people, including me, don't use debugger on regular basis), program structure **feels** [but has not **proven** to be] mechanically [more] sound - small pieces transforming data in tandem. I like to imagine it is an Opus Magnum [game] solution. But it is far from the language that trusts me as a programmer; and many of promised features solve problems that were never present at expense of noticeable inconvenience. I hope by the time i finish my Rust projects, there will be something more fitting available.

Compiling Rust for cross-platform is not as easy as C. For example, none of the officially provided ways for cross compiling to win 7 or wasm work for me [and without understanding of linkers & build systems you likely wont figure it out on yourself, and if you have that you might as well do same in C/++].

I would not call Rust a system programming language the same way C is. Rust is more of a "What C++ should have been but with no respect for the programmer"
:)