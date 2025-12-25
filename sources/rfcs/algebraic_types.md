# Native support for linear algebra types: vectors, matrices, and quaternions

- Feature Name: linal_types
- Start Date: 2025-12-25
- RFC PR: [rust-lang/rfcs#0000](https://github.com/rust-lang/rfcs/pull/0000)
- Rust Issue: [rust-lang/rust#0000](https://github.com/rust-lang/rust/issues/0000)

## Summary

Add built-in types for vectors (vecN<T> for N=2-4, T=f32/f64/i8-i64/u8-u64), matrices (matMxN<T> for M,N=2-4), and quaternions (quat<T>), with swizzle access (.xyzw/.rgba), array indexing, operator overloads, layout specifiers, and SIMD backend when available, falling back to scalar.

## Motivation

Rust lacks native linear algebra support, forcing reliance on fragmented crates like nalgebra, glam, vek, cgmath. This leads to duplication, conversion overhead, dependencies, and inconsistent syntax. Vectors align with hardware SIMD (most CPUs support SSE2+), yet lack builtins, unlike floats predating widespread IEEE754. Native types unify the ecosystem, enable optimizations, reduce compile times, and simplify usage for graphics, physics, and ML.

Use cases:
- Game development (Bevy, rapier): Seamless vector/matrix ops without crate glue.
- Graphics (Rust-GPU): Shader-like syntax for performance.
- ML: Efficient small-dimensional ops without heavy libs.

Without this, fragmentation persists, hindering Rust in math-heavy domains.

## Guide-level explanation

Teach as if in Rust: New types vecN<T>, matMxN<T>, quat<T> in core/std::num, with aliases like f32vec4 for vec4<f32>, vec4 for f32vec4.

Examples:

```rust
// Implicit casts in constructors
let v: vec4<f32> = vec4(1 as isize, 2.0, 3.0_f64, 4u32);

// Swizzles (read/write)
let swizzled: vec4 = v.xyzw; // same as v
let mut swizzled2: f32vec3 = v.xyx; // vec3(1.0, 2.0, 1.0)
swizzled2.xz += 100.0; // now vec3(101.0, 2.0, 101.0)
let color = v.rgba; // alias

// Array access
let elem = v[1]; // 2.0

// Overloads
let sum = v + vec4(5.0, 6.0, 7.0, 8.0); // element-wise
let dot = v.dot(sum); // builtin

// Matrices
let m: mat4x4<f32> = mat4x4::identity();
let col = m[2]; // vec4 column
let val = m[2][1]; // array access
let mul = m * v; // matrix-vector mul

// Quaternions
let q: quat<f32> = quat(0.0, 0.0, 0.0, 1.0);
let rotated = q * v; // quaternion rotation on vector

// Layouts
#[repr(simd)] // SIMD alignment
struct MyVec(vec4<f32>);

// Casts
let casted: vec4<i32> = v as vec4<i32>; // per-element
```

Impacts reading/maintaining code: Unified syntax reduces learning curve, improves interoperability. Existing programmers adapt via From/Into traits for old crates; new ones learn directly.

## Reference-level explanation

Types:
- vecN<T> (N=2,3,4; T=f32,f64,i8-i64,u8-u64; aliases TvecN, vecN=f32vecN)
- matMxN<T> (M,N=2,3,4; column-major default; aliases TmatMxN)
- quat<T> (struct {x,y,z,w: T}; aliases Tquat)

Swizzles: .x/.y/.z/.w/.r/.g/.b/.a; combos like .xyz return vec3<T>; writable.
Array: Index/IndexMut for vectors ([i]); matrices as vec of vecs ([j][i] or m[j].x).

Overloads: Element-wise +, -, *, /; matrix *, vector dot/cross; quaternion * for composition/rotation.

Backend: Leverage std::simd::Simd<T,N> for targets with SIMD; scalar fallback.

Layouts: #[repr(simd)] for SIMD; row/column-major attrs for matrices.

Casts: 'as' for same-size per-element; From/Into arrays/tuples; impl for crate compat.

Interactions: Builds on std::simd (stabilize relevant parts); no overlap with existing types.

Corners: Swizzles on <4D (e.g., vec3.w error); casts truncate/round as primitives.

## Drawbacks

Increases language complexity and compiler size/speed. 
Potential code breakage if crates use similar names (rare since lowercase types). Quaternions/complex might overlap.
Maybe this should be opt-in feature. 

## Rationale and alternatives

This design unifies via builtins, enabling swizzles/casts/optimizations impossible in libs (e.g., zero-cost swizzles). Alternatives: Libs (current fragmentation); arbitrary dims (mismatch ints/floats); fixed 2-4D (covers 99%, libs for more); up to AVX512 (e.g., u8vec64).

Libs fail: No agreement, slow compiles, suboptimal codegen.

Impact of not: Continued ecosystem split, poorer gamedev adoption.

Could be lib? No, syntax/HW mapping needs lang support (like floats vs. manual impls).

## Prior art

Shader langs (GLSL, WGSL, HLSL, Metal, CUDA) offer strong sugar for vec2-4/mat2-4: swizzles, overloads, constructors. Odin: Builtin vec/matrix/quat with swizzles/ops. Weak: Zig (@Vector ops, no swizzles); C extensions (vector_size, basic ops).

Verified examples (compile commands included):

GLSL example:
```glsl
// glslc -fshader-stage=vertex at.glsl

#version 460 core

void main() {
    // vector, implicit casting
    vec4 v = vec4(1, uint(2.0), float(3), 4*1.0);
    // overloaded fill
    vec4 v1 = vec4(1);
    // can inherit components from other vectors in constructor
    vec4 i1 = vec4(v1);
    vec4 i2 = vec4(1, v.gg, v.x);
    vec4 i3 = vec4(v.xyx, uint(7));
    
    // swizzle read
    vec4 swizzled = v.wyxx;
    swizzled = v.grab;
    
    // swizzle write + elementwise
    swizzled.yz += vec2(69.0, 420.0);
    
    // elementwise
    vec4 elem_ops = v + vec4(5.0, 6.0, 7.0, 8.0);
    
    // identity
    mat4 m = mat4(1.0);                
    // matrix * vector
    vec4 mul = m * v;
    
    // no special quaternion syntax
    vec4 q = vec4(0.0, 0.0, 0.0, 1.0); // 
    vec3 v3 = vec3(1.0, 2.0, 3.0);
    // no sugar
    vec3 rotated = v3 + cross(2.0 * q.xyz, cross(q.xyz, v3) + q.w * v3);
    
    // cast (constructor = explicit cast)
    ivec4 casted = ivec4(v);
    
    // valid swizzle on vec3
    v3.rbg = vec3(1.0);
    // error: no 'w' component on vec3
    // v3.w = 5.0; 
}
```

WGSL example:
```wgsl
// naga at.wgsl

@compute
@workgroup_size(1,1,1)
fn main() {
    // no implicit casting (apart from untyped), also vec4f is alias to vec4<f32>
    var v: vec4f = vec4<f32>(1.0, 2, 3, 4.0);
    // overloaded fill
    var v1: vec4f = vec4<f32>(1.0);
    // can inherit components from other vectors in constructor
    var i1: vec4f = vec4<f32>(v.xx, v.yy);
    var i2: vec4f = vec4<f32>(1, v.gg, 2.0);
    
    // swizzle (read + write)
    var swizzled: vec4<f32> = v.wyxx;
    swizzled = v.grab;
    
    // NO writable swizzles
    // error: WGSL does not support assignments to swizzles
    // swizzled.yz = swizzled.yz + vec2<f32>(69.0, 420.0);
    
    // elementwise operations
    let elem_ops: vec4<f32> = v + vec4<f32>(5.0, 6.0, 7.0, 8.0);
    
    // matrix * vector
    var m: mat4x4<f32> = mat4x4f(vec4f(1,0,0,0),vec4f(0,1,0,0),vec4f(0,0,1,0),vec4f(0,0,0,1));  // identity
    let mul = m * v;
    
    // quaternion * vector - no built-in, manual
    let q: vec4<f32> = vec4<f32>(0.0, 0.0, 0.0, 1.0);
    let v3: vec3<f32> = vec3<f32>(1.0, 2.0, 3.0);
    let rotated: vec3<f32> = v3 + cross(2.0 * q.xyz, cross(q.xyz, v3) + q.w * v3);
    
    // cast (constructor = explicit cast)
    let casted: vec4<i32> = vec4<i32>(v);
    
    // valid swizzle on vec3
    var temp_v3 = v3;
    let rgb = temp_v3.rbg;
    // compile-time error example (commented)
    // temp_v3.w = 5.0; // error: no 'w' component
}
```

Odin example:
```odin
// odin run at.odin -file

package main

import "core:math/linalg"

main :: proc() {
	// in Odin, vectors are sugar over arrays
	// no implicit casting (1 is casted from un-typed to float, but actual e.g. u32 wont work)
	v := [4]f32{1, 2.0, f32(3), 4}
	// no overloaded fill
	// v1 := [4]f32{1}
	// cant inherit
	// i := [4]{v.xx, v.yy}

	// swizzle syntax sugar
	swizzled := v.wyxx
	swizzled = v.grab
	// elementwise addition
	elem_ops := v + [4]f32{5, 6, 7, 8}
	// writeable swizzle plus "positive" syntax (sadly not in Rust)
	elem_ops.yz += +[2]f32{69, 420}

	// identity matrix
	m: matrix[4, 4]f32 = 1
	// matrix * vector
	mul := m * v

	// builtin quaternion type
	q: quaternion128 = linalg.quaternion_from_euler_angle_x_f32(0)

	v3 := [3]f32{1, 2, 3}
	v3.rbg = 1 // valid
	// ERROR: 'v3' of type '[3]f32' has no field 'w
	// v3.w = 5

	// quat * vector - NO syntax sugar
	rotated := linalg.quaternion_mul_vector3(q, v3)

	// cast - NO syntax sugar
	casted: [4]i32 = linalg.array_cast(v, i32)
}
```

HLSL example:
```hlsl
// fxc /T ps_5_0 at.hlsl

float4 main() : SV_Target {
    // vector, implicit casting
    float4 v = float4(1, uint(2.0), float(3), 4*1.0);
    
    // overloaded fill
    float4 v1 = float4(1.0);
    
    // can inherit components from other vectors in constructor
    float4 i1 = float4(v1);
    float4 i2 = float4(1.0, v.gg, v.x);
    float4 i3 = float4(v.xyx, uint(7));
    
    // swizzle read
    float4 swizzled = v.wyxx;
    swizzled = v.grab;
    
    // swizzle write + elementwise
    swizzled.yz += float2(69.0, 420.0);
    
    // elementwise
    float4 elem_ops = v + float4(5.0, 6.0, 7.0, 8.0);
    
    // identity
    float4x4 m = float4x4(1.0);                
    
    // matrix * vector
    float4 mul = mul(m, v);
    
    // no special quaternion syntax
    float4 q = float4(0.0, 0.0, 0.0, 1.0);
    float3 v3 = float3(1.0, 2.0, 3.0);
    
    // no sugar
    float3 rotated = v3 + cross(2.0 * q.xyz, cross(q.xyz, v3) + q.w * v3);
    
    // cast
    int4 casted = (int4)v;
    
    // valid swizzle on float3
    v3.rbg = 1.0;
    
    // error: no 'w' component
    // v3.w = 5.0;
    
    return float4(0,0,0,0);
}
```

C example:
```c
// gcc at.c -o at && ./at

#include <stdio.h>

typedef float v4f __attribute__((__vector_size__(16)));
typedef int   v4i __attribute__((__vector_size__(16)));

int main() {
    // vector, no implicit casting
    v4f v = {1.0f, 2.0f, 3.0f, 4.0f};
    
    // no overloaded fill
    // no inherit in initializer
    
    // no swizzles - manual indexing
    v4f swizzled = {v[3], v[1], v[0], v[0]};
    // no rgba swizzle
    
    // elementwise operations
    v4f elem_ops = v + (v4f){5.0f, 6.0f, 7.0f, 8.0f};
    
    // no matrix * vector built-in - manual
    v4f m[4] = {{1,0,0,0}, {0,1,0,0}, {0,0,1,0}, {0,0,0,1}};
    v4f mul = m[0]*v[0] + m[1]*v[1] + m[2]*v[2] + m[3]*v[3];
    
    // no special quaternion syntax
    v4f q = {0.0f, 0.0f, 0.0f, 1.0f};
    // no quat * vector sugar
    
    // cast (same size)
    v4i casted = (v4i)v;
    
    // no valid swizzle on smaller vectors
    
    printf("%f %f %d\n", elem_ops[0], mul[0], casted[0]);
    return 0;
}
```

Zig example:
```zig
// zig build-exe at.zig && ./at.zig

const std = @import("std");

pub fn main() !void {
    // vector, no implicit casting
    const v: @Vector(4, f32) = .{1.0, 2.0, 3.0, 4.0};
    
    // no overloaded fill
    // no inherit in initializer
    
    // no swizzles - manual indexing
    const swizzled: @Vector(4, f32) = .{v[3], v[1], v[0], v[0]};
    
    // elementwise operations
    const elem_ops: @Vector(4, f32) = v + @Vector(4, f32){5.0, 6.0, 7.0, 8.0};
    
    // no matrix * vector built-in - manual placeholder
    const mul: @Vector(4, f32) = v; // identity gives v
    
    // no special quaternion syntax
    // no quat * vector sugar
    
    // cast
    const casted: @Vector(4, i32) = @intFromFloat(v);
    
    // no swizzle on smaller vectors
    
    std.debug.print("{d} {d} {d}\n", .{elem_ops[0], mul[0], casted[0]});
}
```

Metal example:
```metal
// xcrun -sdk macosx metal -c at.metal -o at.air
// xcrun -sdk macosx metallib at.air -o at.metallib

#include <metal_stdlib>
using namespace metal;

kernel void main_metal([[maybe_unused]] uint id [[thread_position_in_grid]]) {
    // vector, implicit casting
    float4 v = float4(1, uint(2.0), float(3), 4*1.0);
    
    // overloaded fill
    float4 v1 = float4(1.0);
    
    // can inherit components from other vectors in constructor
    float4 i1 = float4(v1);
    float4 i2 = float4(1.0, v.gg, v.x);
    float4 i3 = float4(v.xyx, uint(7));
    
    // swizzle read
    float4 swizzled = v.wyxx;
    swizzled = v.grab;
    
    // swizzle write + elementwise
    swizzled.yz += float2(69.0, 420.0);
    
    // elementwise
    float4 elem_ops = v + float4(5.0, 6.0, 7.0, 8.0);
    
    // identity
    float4x4 m = float4x4(1.0);
    
    // matrix * vector
    float4 mul = m * v;
    
    // no special quaternion syntax
    float4 q = float4(0.0, 0.0, 0.0, 1.0);
    float3 v3 = float3(1.0, 2.0, 3.0);
    
    // no sugar
    float3 rotated = v3 + cross(2.0 * q.xyz, cross(q.xyz, v3) + q.w * v3);
    
    // cast
    int4 casted = int4(v);
    
    // valid swizzle on float3
    v3.rbg = 1.0;
    
    // error: no 'w' component
    // v3.w = 5.0;
}
```

CUDA example:
```cuda
// nvcc at.cu -o at && ./at

#include <stdio.h>

__global__ void kernel() {
    // vector types with implicit casting
    float4 v = make_float4(1, uint(2.0), float(3), 4*1.0);
    
    // no overloaded fill in single call
    float4 v1 = make_float4(1.0);
    
    // no inherit in make_
    
    // limited swizzle (xx etc exist, but no arbitrary like wyxx)
    float4 swizzled;
    swizzled.x = v.w;
    swizzled.y = v.y;
    swizzled.z = v.x;
    swizzled.w = v.x;
    // no grab
    
    // no writable swizzle assignment
    // elementwise manual
    
    float4 elem_ops = v + make_float4(5.0f, 6.0f, 7.0f, 8.0f);
    
    // no matrix types, manual
    // no matrix * vector built-in
    
    // no special quaternion syntax
    float4 q = make_float4(0.0f, 0.0f, 0.0f, 1.0f);
    float3 v3 = make_float3(1.0f, 2.0f, 3.0f);
    // manual rotation
    
    // no cast constructor, manual
    int4 casted = make_int4(__float2int_rn(v.x), __float2int_rn(v.y), __float2int_rn(v.z), __float2int_rn(v.w));
    
    // limited swizzle on float3
    v3 = make_float3(v3.z, v3.y, v3.x); // rgb reversed example
    
    printf("%f %f\n", elem_ops.x, casted.x);
}

int main() {
    kernel<<<1,1>>>();
    cudaDeviceSynchronize();
    return 0;
}
```

Table:

| Language                 | Swizzles syntax sugar                                                                                                             | constructors                                | elementwise operations                                                                                  | Matrix * Vector Mul                                                                                          | Quat * Vector Mul (rotation)                                  | vector casts                                                                                                       |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- | ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Odin                     | [Yes, with writes](https://odin-lang.org/docs/overview/) (.xyzw/rgba)                                                             | explicit casts                              | [Yes](https://odin-lang.org/docs/overview/)                                                             | [Yes](https://pkg.odin-lang.org/core/math/linalg/) (m * v)                                                   | [Yes](https://odin-lang.org/docs/overview/) (built-in linalg) | Yes (explicit, has downcasts)                                                                                      |
| GLSL                     | [Yes, with writes](https://www.khronos.org/opengl/wiki/Data_Type_(GLSL)#Swizzling) (.xyzw/rgba)                                   | fill, implicit casts, construct from others | [Yes](https://en.wikibooks.org/wiki/GLSL_Programming/Vector_and_Matrix_Operations)                      | [Yes](https://en.wikibooks.org/wiki/GLSL_Programming/Vector_and_Matrix_Operations) (m * v)                   | No                                                            | [Yes](https://wikis.khronos.org/opengl/Data_Type_(GLSL)#Implicit_conversion) (implicit/explicit, has downcasts)    |
| WGSL                     | [Yes, one-component writes only](https://www.w3.org/TR/WGSL/#vector-access-expr) (.xyzw/rgba)                                     | fill, implicit casts, construct from others | [Yes](https://www.w3.org/TR/WGSL/#arithmetic-expressions)                                               | [Yes](https://google.github.io/tour-of-wgsl/types/matrices/multiplication/) (m * v)                          | No                                                            | [Yes (explicit)]                                                                                                   |
| HLSL                     | [Yes, with writes](https://learn.microsoft.com/en-us/windows/win32/direct3dhlsl/dx-graphics-hlsl-per-component-math) (.xyzw/rgba) | implicit casts, construct from others       | [Yes](https://learn.microsoft.com/en-us/windows/win32/direct3dhlsl/dx-graphics-hlsl-per-component-math) | [Yes](https://learn.microsoft.com/en-us/windows/win32/direct3dhlsl/dx-graphics-hlsl-mul) (magical mul(m, v)) | No                                                            | [Yes (explicit)]                                                                                                   |
| Metal                    | [Yes, with writes](https://developer.apple.com/metal/Metal-Shading-Language-Specification.pdf) (.xyzw/rgba)                       | fill, implicit casts, construct from others | [Yes](https://developer.apple.com/metal/Metal-Shading-Language-Specification.pdf)                       | [Yes](https://developer.apple.com/metal/Metal-Shading-Language-Specification.pdf) (m * v)                    | No                                                            | [Yes (explicit)](https://developer.apple.com/metal/Metal-Shading-Language-Specification.pdf)                       |
| C (GCC/Clang extensions) | No                                                                                                                                |                                             | [Yes](https://gcc.gnu.org/onlinedocs/gcc/Vector-Extensions.html)                                        | No (no matrices)                                                                                             | No                                                            | [Yes (implicit/explicit)]                                                                                          |
| Zig                      | No                                                                                                                                | implicit casts                              | [Yes](https://ziglang.org/documentation/master/#Vectors)                                                | No (no matrices)                                                                                             | No                                                            | [Maybe](https://ziglang.org/documentation/master/#Vectors) (not very syntax sugary language, not sure what counts) |

Rust's std::simd is close but lacks sugar. Systems langs rarely overlap graphics, but this aids Rust gamedev.

## Unresolved questions

- Dimension limits: 2-4, up to SIMD max (u8vec64), or arbitrary?
- Quaternions necessary? Overlap with complex numbers?
- Alignment details.
- Default major (column/row)?
- Down/upcasts behavior.
- std::simd stabilization/integration timeline.

Resolve via RFC discussion; impl resolves corners before stabilize.

## Future possibilities

Extend to tensors/higher dims after arbitrary primitives. Add ops (SVD). SVE support. Deprecate conflicting crates.