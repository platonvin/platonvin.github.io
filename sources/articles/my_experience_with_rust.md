---
title: My Experience with Rust
lang: 
css: ../styles.css
backlink: ../index.html
googlefonts: true
headline: my experience with `Rust`
intro_footer: |
    <p><em>might look like too much highlighting for you - but it helps with readability for some people</em></p>
    <p><em>information is subjective. Treat it as a story about experience</em></p>
comments: true
---

## why?

A friend of mine was actively pitching `Rust` as new shiny thing i should try. I am always in search for a better language for gamedev, and after a week of attempts on integrating `C++20` modules (faster compile and no headers), which totally failed* - bugs, ICEs, docs so bad that reading source is more useful, - i realized how much time i spend on `CMake` (and earlier `Make` - I love slashes btw), dependency management, resolving compiler differences and other non-programming stuff, and thought that maybe `Rust` - which is praised for tooling - could solve that
*for the purpose of corectness, i revisited it and actually moved to modules - this time successfully

So, i ported my C++ Vulkan renderer to `Rust` (and some more)

<!-- not anymore LOL. Khm, you can still do it if you want. But i dont badly need it now -->
<!-- <small>If you are a `Rust` dev, i would really appreciate code review of [it (link)](https://github.com/platonvin/lum-rs). Suggestions about compile times are especially welcome.</small> -->

## (first impression) positives

`Cargo` is a build system that I don't think much about (i like that). Tooling is amazing: `rust-analyzer`, `clippy`, `fmt` (`Rust` is the only language where a formatter almost does not annoy me), plus community tools like `cargo-asm` and lots of others.

---

And `Rust` has a lot of nice features!

* Enums
* backtraces (i basically dont use a debugger)
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
* `include_bytes!()` (i wish it was auto-aligned)
* proc_macro let you rewrite language if something is missing
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

## (first impression) negatives

* I'm not sure if it clicked or not. I frequently wonder if im still missing a fundamental piece of `Rust` philosophy
* Sometimes i cant find any good examples. I thought i understood something and tried to utilize move semantics only to get mistmatch between drop (which takes `&mut` and not `mut`) and the fact that i need to take out a thing from a struct. I had to either wrap it in `Option<_>` or use `MaybeUninit`
* `Rust` is not really good with math - you need big libraries for basic quaternions and matrices, and syntax is still ugly (i have some plans on improving it with a bunch of proc_macro trics, but... it could have been just integrated into langauge, like slices.)
* Gamedev needs safe code that does not fall under safe `Rust` quite often. And vice versa, actually - gamedev writes "unsafe" code that falls under safe `Rust` - there's a trend to trick the borrow checker using `Vec[index]` as "virtual memory" (effectively disabling a borrow checker)
* Sometimes, you are not given control over things - other people decided you should not have it, and now you need to come up with weird solutions (for problems that could have not existed!). You cannot just disable slice bound checks for a scope - rewriting ops with proc_macro wont modify called functions, custom wrapper is ugly and has the same problem, replacing panic hook with unreachable breaks panics everywhere (not just for desired scope). Again, it is absolutely possible to have fine-grain control in `Rust` - its just ugly, verbose and unreadable. 

## some real info

* my binary sizes went from ~600 KB to ~700 KB (compared to `C++`) - likely due to stack slices (which is good: why heap-allocate if the stack suffices?). *btw, just removing thiserror and anyhow cut ~100kb*
* performance-wise nothing really changed: `Rust` is faster at low opt-levels (~2x faster (not precompiled std, i checked)), and on highest opt-levels the gap narrows (with gcc being slightly faster for `C++`).
* (incremental) compile times are ~4s for both languages for similar dev (some optimizations) build (hard to really compare, project strucutres are different), both noticably hurt iteration speed (i developed a habit of basically not running my code at all for a very long time. But lsps compensate it).
For debug build, `Rust` can recompile in around a second, while `C++` (even with modules) might take from 3~8 seconds, depending on a change

## blazingly fast

**Performance-wise, `Rust` is truly a rocket. But not all `Rust`.**

`C`-like* `Rust` is a beast. Simple references and struct hierarchy forces you into code that produces insane assembly. Enums for polymorphism are just regular functions. However, wrap everything in `Option`s, `Rc` `Cell`s and `Box`es, `dyn trait`s and deep nested containers, and it's not so fast anymore.

So far, most `Rust` code i've seen sticks to one of those two extremes - and people dont feel like telling you right away which one it is for a specific library

## libraries

There is just not that many great libraries. Initializing OpenGL with winit and glow is harder than with assembly. Algebra libraries are written by people who dont seem to code at all (compile times, syntax, hello?). Vulkan wrappers changing API and names dealt me even more pain than gltf loader (which is more complicated than thermodynamics). Peak frustration was when I couldn't figure out the MagicaVoxel (.vox) parser docs and ended up porting the `C++` parser instead (spent less time on that, huh).

In `Rust` you don't spend a day trying to make a library compile & link - you spend a day looking for one that doesn't suck. Crates refactor every few months and break APIs for no practical reason (semantic versioning helps). Documentation is often useless (says a lot, explains nothing), and logic is smeared acros dozen layers of tiny functions (std has better docs, but sufffers from unreadable source more).\
After reading docs, even when i feel like i understand most parts of the system, i usually have no idea how they connect to each other. Like std::random - i spent way to much time for something i would type in a minute in C. RandomSource? Great, i understand it. Distribution? Sure. How they connect? No idea. Feels like Rust libraries are written for people who understand the problem library is trying to solve. But this is why i use a library in the first place - if i understood the problem well, i would not need a library.\
I really miss C libraries where you go to function source and immediately understand what it is doing. And libraries pull dozens of dependencies (which is not a problem by itself, but ...). 

## overall
`Rust` seems like a solid language choice - all the listed problems are not that big compared to what language has to offer for me. It is something like local maximum for its "language idea". I dont like most libraries and i might need to rewrite Rust with a lot of proc_macro for nicer syntax, but i enjoy it, and my code works first try more often, and project structure feels more correct (i like to imagine that my code is like a "opus magnum" (game) solution, multiple small robotic peaces, moving and modifying data in a perfect tandem, except its far from perfect). Hope that one day it finally clicks
<br/>
I think i'll also try language on the other end of the complexity spectrum - something closer to C, likely `Odin` - more optional "safe", nicer syntax for "unsafe", first-class SIMD, much faster compile times, and more importantly - simplicity as a language idea, which library authors are aware of. I suspect that `Rust` is still going to be a better tradeoff for me, but why not give other languages a try?


1001 problems:
you cant trivially overwrite cargo crate (you need to trick cargo into thinking its a different source)
dynamic linking is kinda a thing but every crate you want to link dynamically needs to opt in
windows toolchain dependency

basically this:
{ // perfectly fine, we DO support partial borrows!
    let borrowed_field_1 = &mut self.field_1;
    let borrowed_field_2 = &mut self.field_2;
}

{ // Fuck You!
    let borrowed_field_1 = self.get_field_1();
    // Error: first mutable borrow occures in a line above
    let borrowed_field_2 = self.get_field_2();
}
Code structure for graphics programming tends to get easier for me when i can have megastructs, which are not compatible with rust borrowing rules
expect functions with 10+ arguments. Or restructure your code every 10 minutes after you change the smallest thing because now you have to move everything to other sub/structs


compilation model:
    i am 100% willing to sacrifice circular references in order to get rebuilds at the speed of C 

sometimes i feel like people have joined a cult of "no unsafe code"
no unsafe != what you dream about code doing. Unsafe != incorrect. Unsafe is just a fucking marker that requires explicit notion.
good lucking turning off integer zero division checks. Or forcing -ffast-math. Or turning asserts into debug_assert
someone literally decided "oh thats too unsafe our users are idiots we should not even have this as opt-in option"


you will have a problem, and there will be 3 crates with zero comparison between them, 10 flags each, no examples and documentation like 
/// A struct representing an apple
struct Appple {
    /// Seeds of this apple
    seeds: Vec<Seed> 
}
and you will dive through entirety of docs.rs and understand NOTHING. Same feeling after reading Vulkan spec and realising you remember everything but understand nothing
would be cool to see language that has **warning or recommendations** with Rust borrow checker tech where above would be expressable

Hyper abstraction. I literally ported a C magicavoxel parser cause i cant fucking understand how to use most popular (the only one) Rust version i found

rust is gonna eat your disk alive

libraries tend to have a lot of asserts (bounds checking, unwraps, etc.) that are not disableable. Each assert is truly nothing, but having them everywhere prevents compiler from reordering and "cancelling out" code

there are many "language features". You are not gonna know about them since the only place they are mentioned is "Unstable features - The rustdoc book". Googling "all rust features" will not land you there btw

80% of public Rust is for web, but web people do not bother telling you about that right away. They also have a very special measure of perfomance

there is nalgebra. And glam. And vek. And some custom solution somewhere.
Linear algebra vectors map closely to hw. But we do not have builtin types for them somehow?? - oh but not every CPU has SIMD - yes they do, even your browser like requires at least SSE4 to run. And we had floats before ieee754.
Imagine if every Rust crate implemented floats manually. There would be floats with usize, with u32, with different endians, and some would be generic over this, some would be generated in build script while others generate in proc/declarative macro, or are written manually. Some would do inline assembly, some would be purely safe, ... Imagine that hell. That is what is going on with vectors
Its also pain to do as u32 as usize as u64 all the time... Serialize as u32, usize for perfomance, u64 for GAPI

Rust build system is truly easy to start and requires only a few lines for most features... It is, however, one of the most complicated build systems out there. Go read a book (or 10) on Cargo (from capital letter, since... f you, Cargo developers just like Cargo.toml) 
quote from hn: `cargo is pretty straightforward for 95% of the cases, inconvenient for 3% of the cases, too limited for 1% of the cases, and extremely frustrating for the remaining cases`

1001 features:
design by commetee is really powerful. But only when language sparks joy and people DO want to be commetee and design a language

proc macros are less readable then declarative macros (since syntax for pasted words is same as code that pastes them you cant immideately see the difference. Fixable by changing code that colors it in my editor, but...)

containers are fast.

enums (tagged unions) are imo best drop-in inheritance replacement. If you want very C++ style, it is faster than C++ version - <dyn Trait> will be (*Struct, *virtual functions table), and calling a function from table is dereferencing one pointer, unlike C++, where it is two

stack traces

cross compilation to wasm

everything-from-source as build system idea (and static linking)

MIRI. And UB preconditions. Asserts are everywhere, and i mean non-trivial ones (like go try to cast 8-aligned pointer to 32-aligned struct pointer)