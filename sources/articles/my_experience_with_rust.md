---
title: My Experience with Rust
lang: 
css: ../styles.css
backlink: ../index.html
googlefonts: true
headline: my experience with `Rust`
intro_footer: <p><em>information is subjective. Treat it as a story about experience</em></p>
comments: true
---

## why i tried it

A friend of mine was actively pitching `Rust` as new shiny thing i should try. I am always in search for a better language for gamedev, and after a week of attempts on integrating `C++20` modules (faster compile and no headers), which totally failed* - bugs, ICEs, docs so bad that reading source is more useful, - i realized how much time i spend on `CMake` (and earlier `Make` - i love slashes btw), dependency management, resolving compiler differences and other non-programming stuff, and thought that maybe `Rust` - which is praised for tooling - could solve that.

\* *for the purpose of correctness, i revisited it and actually moved to modules - this time successfully*

> NOTE: i do gamedev/GPUs. Web `Rust` is different. Kernel `Rust` is different.

<!-- NOTE: not anymore. You can still do it if you want. But i don't super-badly need it now -->
<!-- <small>If you are a `Rust` dev, i would really appreciate code review of [it (link)](https://github.com/platonvin/lum-rs). Suggestions about compile times are especially welcome.</small> -->

## first impressions/ positives

`Cargo` is a build system that i don't think much about (I like that). Tooling is amazing: `rust-analyzer`, `clippy`, `fmt` (`Rust` is the only language where a formatter almost does not annoy me), plus community tools like `cargo-asm` and lots of others.

---

And `Rust` has a lot of nice features!

* enums
* stack traces (i basically don't use a debugger)
* built-in checks (out-of-bounds, alignment, overflows / zero-div). I wish they were more optional though
* No constructors (seriously, there are more constructors in `C++` than there are math subjects). 
<details>
    <summary>
        Click to see C++ constructors meme
    </summary>
    <span><video autoplay muted loop playsinline width="60%">
        <source src="/media/cpp_constructors_meme.webm" type="video/webm" />
    </video>
    </span>
</details>
* built-in tests, benchmarks (`#![feature(test)]` + `black_box` makes it soooo easy) and docs (fn arg docs when?)
* stack slices with nice syntax, default trait functions, associated types, delegation - a lot of qol stuff
* `include_bytes!()` (I wish it was auto-aligned)
* `#[proc_macro]` let you rewrite language if something is missing
* simple wasm builds (though you do need some extra tooling (and `--target-cpu=mvp` now)).
<details>
    <summary>
        Click to see my renderer running in web! (right here)
    </summary>
    <div class="lum-canvas-container">
        <canvas class="lum-canvas" id="lum_canvas"></canvas>
    </div>
    <div class="project-preview">
        <script type="module">
            import init from '/../pkg/demo_lib.js';
            async function start_lum() {
                try {
                    await init('/../pkg/demo_lib_bg.wasm');
                    const canvas = document.getElementById('lum_canvas');
                    if (canvas) {
                        canvas.blur();
                    }
                } catch (e) {
                    console.error('Failed to init WASM:', e);
                }
            }
            start_lum();
        </script>
    </div>
</details>

## real info

* my binary sizes went from ~600 KB to ~700 KB (compared to `C++`). Likely, due to a lot of implicit assertions
*btw, just removing thiserror and anyhow cut like ~100kb*
* performance-wise nothing really changed: `Rust` is faster at low opt-levels (~2x faster (not precompiled std, i checked)), and on highest opt-levels the gap narrows (with gcc being slightly faster for `C++`).
* (incremental) compile times are ~4s for both languages for similar dev (some optimizations) build (hard to really compare, project structures are different), both noticeably hurt iteration speed (i developed a habit of basically not running my code at all for a very long time. But lsps compensate it).
For debug build, `Rust` can recompile in around a second, while `C++` (even with modules) might take from 3~8 seconds, depending on a change

---

**Performance-wise, `Rust` is truly a rocket. But not all `Rust`.**

`C`-like `Rust` is a beast. Simple references and struct hierarchy forces you into code that produces insane assembly. Enums for polymorphism are just regular functions. However, wrap everything in `Option`s, `Rc` `Cell`s and `Box`es, `dyn trait`s, hashtables to fight borrow checker, and it's not so fast anymore.

## negatives

Not sure if it clicked or not. I frequently wonder if I'm still missing a fundamental piece of `Rust` philosophy
I thought i understood move semantics and tried to utilize it only to get mismatch between drop (which takes `&mut` and not `mut`) and the fact that i want to take out a thing from a struct. I had to either wrap it in `Option<_>` or use `MaybeUninit`

---

Gamedev needs safe code that does not fall under safe `Rust` quite often. And vice versa, actually - gamedev writes "unsafe" code that falls under safe `Rust` - there's a trend to trick the borrow checker using `Vec[index]` as "virtual memory" (effectively disabling a borrow checker via virtual memory)

---

You are not always given control over things - other people decided you should **not** have it, and now you have a problem. You cannot just disable slice bound checks for a scope - rewriting ops with `proc_macro` wont modify called functions, custom wrapper is ugly and has the same scope problem, replacing `#[panic_hook]` with `unreachable_unchecked!()` is insanity.
It is absolutely possible to have fine-grain control in `Rust` - its just ugly, verbose and unreadable. You want "-ffast-math" in function? Good luck! You cant change it for dependencies, and have to use intrinsics*. Is it possible? Sure, but you better off code it in `C` and link with LTO. Or just code in `C`.
\* not literally intrinsics, but methods that call intrinsics. They are not overloaded.\
Sometimes i feel like people have joined a cult of "no unsafe <strike>code</strike>"
no unsafe != what you dream about code doing. Unsafe != incorrect. Unsafe is just a marker that demands explicit acknowledgement.
good luck turning off integer zero division checks. Or forcing `-ffast-math`. Or turning asserts into debug_assert
someone literally decided "oh thats too unsafe, `Rust` programmers are idiots and we should not even have this as opt-in option". It is probably fixable with a custom MIR pass.

---

`Rust` is not really good with math - you need big libraries for basic quaternions and matrices, and syntax is still ugly.
There is [`nalgebra`](https://crates.io/crates/nalgebra). And [`glam`](https://crates.io/crates/glam). And [`vek`](https://crates.io/crates/vek). And [`cgmath`](https://crates.io/crates/cgmath). And dozen more libraries. And custom vector solutions everywhere.
Linear algebra vectors map closely to hw. But we do not have builtin types for them somehow?? - oh but not every CPU has SIMD - yes they do, your browser likely requires at least SSE2 to run. Just to read this sentence. And we had floats before `ieee754`!

Imagine if every `Rust` crate implemented floats manually. There would be floats with usize, with u32, with different endians, and some would be generic over this, some would be generated in build script while others generate in proc/declarative macro, or are written manually. Some would do inline assembly, some would be purely safe, ... Imagine that hell. That is what is going on with vectors.

Its also pain to do as u32 as usize as u64 as isize ... all the time. Serialize as u32, usize for performance, u64 for GAPI

## libraries & ecosystem

There is just not that many great libraries. Initializing `OpenGL` with `winit` and `glow` is harder than with `GLFW` (I literally spent few hours figuring it out). Algebra libraries are written by people who don't seem to code at all (compile times, syntax, hello?). `Vulkan` wrappers changing API and names dealt me pain. A popular `gltf` loader is more complicated than thermodynamics. I couldn't figure out the `MagicaVoxel (.vox)` parser docs and ended up porting the `C` parser instead (spent less time on that, huh).

In `Rust` you don't spend a day trying to make a library compile & link - you spend a day looking for one that doesn't suck. Crates refactor every few months and break APIs for no practical reason (semantic versioning - 1.0.0 - should help, but most crates are never gonna reach it). Documentation is often useless (says a lot, explains nothing), and logic is smeared across dozen layers of tiny functions (std has better docs, but suffers from unreadable source more).

After reading docs, even when i feel like i understand most parts of the system, i usually have no idea how they connect to each other. Like std::random - i spent way too much time for something i would type in a minute in C. RandomSource? Great, i understand it. Distribution? Sure. How they connect? No idea. Feels like `Rust` libraries are written for people who understand the problem library is trying to solve. But this is why i use a library in the first place - if i understood the problem well, i would not need a library. 
I really miss `C` libraries where you go to function source and immediately understand what it is doing. And libraries pull dozens of dependencies (which is not a problem by itself, but ...).

---
You will have a problem, and there **will** be 3 crates with zero comparison between them, 10 feature flags each, no examples and with documentation like
```
/// A struct representing an apple
struct Apple {
    /// Seeds of this apple
    seeds: Vec<Seed> 
}
```

and you will dive through entirety of docs.rs and understand NOTHING 

Libraries tend to have a lot of asserts that are not disableable. Each one is truly nothing, but having them everywhere prevents compiler from reordering and "cancelling out" code. And also bloats your binaries.

Lots of public `Rust` is for web, but web people do not bother telling you about that right away. They also have a very specific measure of performance

## deeper issues

basically this:

``` rust
{ // perfectly fine, we DO support partial borrows!
    let borrowed_field_1: &mut Field_1 = &mut self.field_1;
    let borrowed_field_2: &mut Field_2 = &mut self.field_2;
}

{ // Not across function boundaries tho
    let borrowed_field_1: &mut Field_1 = self.mut_field_1();
    // Error: first mutable borrow occurs in a line above
    let borrowed_field_2: &mut Field_2 = self.mut_field_2();
}
```

You can fight this to some degree by generating declarative macro in proc/declarative macro, but this is ugly and incomplete.

*would be cool to see memory-oriented language that has **warning or recommendations** with `Rust` borrow checker tech where above would be expressible*

Code structure for graphics programming tends to get easier for me when i can have megastructs, which are not compatible with `Rust` borrowing rules.
You NEED functions with 10+ arguments. Or restructure your code every 10 minutes after you change the smallest thing because now you have to move everything to other sub/structs.
i like how result usually looks like, but i wish i could just remove restriction on partial borrows.
\

* orphan rule wants you to wrap everything.

* there are many "language features". You are not gonna know about them since the only place they are mentioned is "Unstable features - The rustdoc book". Googling "all `Rust` features" will not get you there btw

* `Rust` is gonna eat your disk alive. Modern `Rust` async web frameworks builds are larger than lots of games.

* dynamic linking is kind of a thing but every crate you want to link dynamically needs to opt in

* windows toolchain dependency on windows

* `Cargo` is complicated
    > quote from hn : __"cargo is pretty straightforward for 95% of the cases, inconvenient for 3% of the cases, too limited for 1% of the cases, and extremely frustrating for the remaining cases"__

    i once tried linking my `C` code to not port it, and ended up unable to pass linker arguments to `rustc` (`Cargo` was stripping them from extra compiler arguments. Without notice). I ended up implementing `libm` functions in inline assembly.

* proc macros are less readable than declarative macros (syntax for pasted tokens looks the same as code that pastes them), which are not powerful enough.

* i am 100% willing to sacrifice circular references in order to get rebuilds at the speed of `C` 

* would also be cool if we could do `Odin`-like thing where we paste directories with .rs files and they are treated like dependencies. I would 100% use it.

## cool aspects

* design by committee is really powerful. But only when language sparks joy and people DO want to be committee and design a language. You can expect `Rust` to be very polished. Unbelievably polished sometimes.

* default containers are fast, checked, and free from a lot of problems.

* enums (tagged unions) are also imo best drop-in inheritance replacement. If you want dynamic dispatch, it is faster than `C++` version - `<dyn Trait>` will be (*struct, *virtual functions table), and getting a function pointer from table is one level of indirection, unlike `C++`, where it is two (vtable ptr stored in class memory)

* everything-from-source as build system idea (and static linking)

* MIRI (Interpreter for Rust with runtime UB checks) . And UB preconditions. Asserts are everywhere, and i mean non-trivial ones (like casting 8-aligned pointer to 32-aligned *struct)

## the end
`Rust` fits you better if you "prototype" in your head, and only code "final" solutions.

`Rust` is close to local maximum for its "language idea" (which is slowly changing). I enjoy it, my code usually works first try, project structure feels better (i like to imagine that my code is an "opus magnum" (game) solution, multiple small mechanical pieces, moving and modifying data in a perfect tandem, except its far from perfect).

<!-- If you think i can only complain - im in the process of trying to fix those issues. -->
:)
