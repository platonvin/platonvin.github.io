## Native support for linear algebra types: vectors, matrices, and quaternions

### Summary
Add built-in types for vectors (T? vec2/3/4<T>? where T is f32/f64/i32/u32/etc.), matrices (T, matMxN<T>?), and quaternions (T?quat<T>?), with swizzle access (xyzw/rgba), array indexing, operator overloads, layout specifiers, and SIMD "backend" when available.

### Motivation
Rust lacks native math support, users rely on fragmented crates like nalgebra, glam, vek, cgmath, leading to duplication, a lot of conversion code and dependencies, and ugly/incomplete syntax. Vectors map to hardware SIMD, yet no builtins exist, unlike floats (which existed before hw IEEE754). Most CPUs support at least SSE2 (browser that you use to read this likely requires it). Native types unify, optimize, and simplify linear algebra for graphics, physics, ML.

## Syntax
vec<N, T> could be "real" syntax, with TvecN being alias, and vecN being alias for f32vecN
Use like:
```rust
let v: vec4<f32> = vec4(1 as isize, 2.0, 3.0_f64, 4u32); // all get casted to f32
let swizzled_1: vec4 = v.xyzw; // same as v. vec4 is alias to f32vec4 or vec4<f32>
let mut swizzled_2: f32vec3 = v.xyx; // vec3(1.0, 2.0, 1.0); 
swizzled_2.xz += 100.0; // now vec3(101.0, 2.0, 101.0); 
let color = v.rgba; // alias
let elem = v[1]; // 2.0
let sum = v + vec4(5.0, 6.0, 7.0, 8.0); // element-wise
let dot = v.dot(sum); // builtin

let m: mat4x4<f32> = mat4x4::identity();
let col = m[2]; // vec4 column
let val = m[2][1]; // array access
let mul = m * v; // matrix-vector mul

let q: quat<f32> = quat(0.0, 0.0, 0.0, 1.0);
let rotated = q * v; // quaternion mul on vector

#[repr(simd)] // layout specifier for SIMD
struct MyVec(vec4<f32>);

let casted: vec4<i32> = v as vec4<i32>; // per-element cast
```

### Reference-level explanation
Types in std::num or core:

* vecN<T> for N=2,3,4; T=f32,f64,i8..i64,u8..u64, with aliases as TvecN
* matMxN<T> for M,N=2,3,4; column-major, with aliases as TmatMxN
* quat<T>: struct with x,y,z,w; ops for rotation, with aliases as Tquat

Swizzles: .x .y .z .w .r .g .b .a; combinations like .xyz return/modify vec3.
Array access: v[i] for vectors; m[j][i] or m[j].x for matrices.
Overloads: element-wise: +, -, *, /; matrix/quaternion mul *,.
Quaternion: mul for composition, vector rotation.
Backend: Use std::simd. 
Layouts: column-major or row-major for matrices.
Casts: 'as' between same or into-smaller size vectors, per-element. Casts from/into arrays should also be a thing.
Existing linal crates can implement from/into for easier integration.

### Drawbacks
As always, language complexity, slower & larger compiler. 
Potential code breakage - some crates may have used that syntax. This should be rare, since lowercase types are rare outside of builtin ones.

### Rationale
Why not just a lib?
* unifies ecosystem
* more optimizations
* swizzles
* casts
* faster compilation time
* maps close to HW

Imagine if every crate implemented floats manually. There would be floats with usize, with u32, with different endians, some would be generic over type, some would be generated in build script while others would generate in proc/declarative macro, or written manually. Some would do inline assembly, some would be purely safe. Having language-level support for floats is not "required" - they can absolutely be implemented in libraries. It is just very handy - 99% of users need same thing, build times/sizes and syntax sugar are totally worth it.

Primary target audience is graphics/physics (gamedev), possibly ML. Web crates are not likely to get any benefits (apart from less dependencies and faster builds from their graphics backends)

Practical usage: replacement of glam/nalgebra/vec/cgmath/... in 99% of usecases. Rust-gpu, Bevy, rapier,

I see 3 directions in terms of dimensions:
* 2,3,4 dimensions only. Covers 99% of needs. Rest is done by libraries
* up to whatever largest SIMD has (i.e. u8vec64) right now. Rest is done by libraries
* arbitrary (would be weird without arbitrary floats/ints) - i.e. i256vec512. Rest (dynamic) is done by libraries

Do we need this **in** language?
Strictly speaking, no. It is absolutely possible to implement 100% of the functionality manually in intrinsics, or use a library like glam. For syntax, you can wrap Rust in some build step where you desugar swizzles / casts. Main rationale for this feature is convenience. One step closer to Rust in gamedev/shader. A lot of languages have SPIR-V as a target, but syntax-complexity tradeoff is on the side of shading languages.

One could argue that it is not obvious what matrix\*vector or quaternion\*vector does. I would argue that floating point implementation details or integer overflow rules and endians are non-trivial too. We do, however, have special syntax sugar for latter

### Prior art
Examples of syntax (standalone examples, verified with corresponding compilers) for other languages can be found at: TODO:
| Language                 | Swizzles syntax sugar                                                                                                             | Per-element Operations                                                                                  | Matrix * Vector Mul                                                                                  | Quat * Vector Mul (rotation)                                  | Casts                                                                                            |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Odin                     | [Yes, with writes](https://odin-lang.org/docs/overview/) (.xyzw/rgba)                                                             | [Yes](https://odin-lang.org/docs/overview/)                                                             | [Yes](https://pkg.odin-lang.org/core/math/linalg/) (built-in linalg)                                 | [Yes](https://odin-lang.org/docs/overview/) (built-in linalg) | Yes (implicit/explicit)                                                                          |
| GLSL                     | [Yes, with writes](https://www.khronos.org/opengl/wiki/Data_Type_(GLSL)#Swizzling) (.xyzw/rgba)                                   | [Yes](https://en.wikibooks.org/wiki/GLSL_Programming/Vector_and_Matrix_Operations)                      | [Yes](https://en.wikibooks.org/wiki/GLSL_Programming/Vector_and_Matrix_Operations) (m * v)           | No (user-implemented)                                         | [Yes](https://wikis.khronos.org/opengl/Data_Type_(GLSL)#Implicit_conversion) (implicit/explicit) |
| WGSL                     | [Yes](https://www.w3.org/TR/WGSL/#vector-access-expr) (.xyzw/rgba)                                                                | [Yes](https://www.w3.org/TR/WGSL/#arithmetic-expressions)                                               | [Yes](https://google.github.io/tour-of-wgsl/types/matrices/multiplication/) (matrix mul)             | No (user-implemented)                                         | Yes (explicit with type deduction)                                                               |
| HLSL                     | [Yes, with writes](https://learn.microsoft.com/en-us/windows/win32/direct3dhlsl/dx-graphics-hlsl-per-component-math) (.xyzw/rgba) | [Yes](https://learn.microsoft.com/en-us/windows/win32/direct3dhlsl/dx-graphics-hlsl-per-component-math) | [Yes](https://learn.microsoft.com/en-us/windows/win32/direct3dhlsl/dx-graphics-hlsl-mul) (mul(m, v)) | No (user-implemented)                                         | Yes                                                                                              |
| Metal                    | [Yes, with writes](https://developer.apple.com/metal/Metal-Shading-Language-Specification.pdf) (.xyzw/rgba)                       | [Yes](https://developer.apple.com/metal/Metal-Shading-Language-Specification.pdf)                       | [Yes](https://developer.apple.com/metal/Metal-Shading-Language-Specification.pdf) (matrix mul)       | No (user-implemented)                                         | Yes                                                                                              |
| C (GCC/Clang extensions) | No                                                                                                                                | [Yes](https://gcc.gnu.org/onlinedocs/gcc/Vector-Extensions.html)                                        | No (user-implemented)                                                                                | No                                                            | Yes (cast to same size)                                                                          |
| Zig                      | No                                                                                                                                | [Yes](https://ziglang.org/documentation/master/#Vectors)                                                | No (user-implemented)                                                                                | No                                                            | [Yes](https://ziglang.org/documentation/master/#Vectors) (@as or coerce)                         |

### Unresolved questions
Larger vector support details (support for up-to-largest-SIMD size makes sense, maybe it should not restrained at all) , std::simd integration.
Do we need actually need quaternions? What about complex numbers?
