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
---

## why?

A friend of mine was actively pitching `Rust` as new shiny thing i should try. I am always in search for a better language for my gamedev needs, and after a week of attempts on integrating `C++23` modules into my renderer (for faster compile times without headers), which totally failed - bugs, ICEs, docs so bad that reading source is more useful, - i realized how much time I spend on `CMake` (and earlier `Make` - I love slashes btw), dependency management, resolving compiler differences and other non-programming stuff, and thought that maybe `Rust` - which is praised for tooling - could solve that

So, i ported my C++ Vulkan renderer to `Rust` 

<small>If you are a `Rust` dev, i would really appreciate code review of [it (link)](https://github.com/platonvin/lum-rs). Suggestions about compile times are especially welcome.</small>

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
* performance-wise nothing really changed: `Rust` is faster at low opt-levels (~2x faster (not precompiled std, i checked)), and on highest opt-levels the gap narrows (with gcc being slightly faster for C++).
* compile times are almost the same (~4.5s -> ~4.4s for similar dev build, but i cant really tell since im unable to build my C++ anymore and dont want to go through pain of fixing CMake again), both `C++` and `Rust` compile times hurt iteration speed (i developed a habit of basically not running my code at all for a very long time. But lsps compensate it).

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
