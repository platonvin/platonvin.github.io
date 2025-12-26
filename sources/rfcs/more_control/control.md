Add options to turn some runtime UB checks off

Currently, there are some choices made for the programmer in relation to safety. Specifically,
- very precise math\*
- zero division checks
- bounds checks (for slices)
- defined overflow
\* not like super precise, just different. 

You absolutely can write Rust code that does not have these checks:
- fdiv_fast, fmul_fast, ...
- unchecked_div
- get_unchecked
- unchecked_add

However, consider following syntactically
```rust
let c = a * a + b * 2.0;
```
versus
```rust
let c = a.fmul_fast(a).fadd_fast(b.fmul_fast(2.0f32));
```

Second example is less readable and more error prone. Same goes for integers

Proposal: add rustc and Cargo options to turn those checks off. Ideally, this should be doable on binary, library and scope level (so you would be able to build all of your code with this flag, or code in some function only (e.g. hot loop), or a library (e.g. image processing library))

Together with linear algebra primitives, this could make manual SIMD intrinsics redundant in some places.

Ability to disable bounds checks would make following workflow possible:
1) write perfectly safe Rust library
2) benchmark it
3) turn all checks off 
4) benchmark it again
5) if performance differs too much, it means those checks were costly. Identify hot paths and restructure code to have less checks (or, if you can prove validness, use unchecked versions)

It is understandable why those checks exist - they make software in Rust more robust. However, it is important to give developers choice. 

alternatives: custom wrappers that overload operations to their unchecked versions (if e.g. some feature is set)
problems: 
- no custom `as` casts
- no control over libraries
- bloat and complexity of wrappers (in comparison to a flag/attribute)

can this be implemented as a library? Kind of.
You can have a proc macro go through the scope, find all e.g. additions, replace them with function calls specialized for e.g. floats and integers as unchecked and for everything else as normal. However, running all of your code through proc macro does not sound great.

some people dont even know that Rust has zero division and bounds checks in release 

prior art:
Clang C/C++ compilers, GCC C/C++/Fortran compilers
Zig
D