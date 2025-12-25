# Native support for linear algebra types: vectors, matrices, and quaternions

- Feature Name: linear_algebra_types
- Start Date: 2025-12-25
- RFC PR: [rust-lang/rfcs#0000](https://github.com/rust-lang/rfcs/pull/0000)
- Rust Issue: [rust-lang/rust#0000](https://github.com/rust-lang/rust/issues/0000)

## Summary
[summary]: #summary

Add built-in vector, matrix and quaternion types with swizzles (.xyzw/.rgba), indexing, math overloads and SIMD backend.

## Motivation
[motivation]: #motivation

Fragmented ecosystem (nalgebra, glam, vek, cgmath, dozen others and manual implementations (to not add dependencies)) cause duplication, conversion overhead (cognitive and performance), extra deps, inconsistent and inconvenient syntax. Vectors match SIMD. Builtins would unify, optimize, cut compile times for graphics (realtime, offline for 3d software, image processing, game engines)/physics (both 2d and 3d)/ML.
This would make Rust a step close to being adopted by gamedev industry and a step ahead multiple other languages, including its usage as GPU shading language.
Value of syntax sugar for mathematics is high, some features of e.g. C++ (templates/overloads) are often the only used features and used for math (e.g. GLM).

## Guide-level explanation
[guide-level-explanation]: #guide-level-explanation

New types; aliases f32vec4=vec4<f32>, vec4=f32vec4.

```rust
let v: vec4<f32> = vec4(1 as isize, 2.0, 3.0_f64, 4u32); // implicit casts
let swizzled: vec4 = v.xyzw; // .xyzw swizzled in same order as original elements 
let mut sw2: f32vec3 = v.xyx; // .xyx swizzled first three elements
let v2: f32vec4 = vec4(v); // v2 is constructed from entire v
let v3: f32vec4 = vec4(v.xx, v.yy); // v3 is constructed from two copies of first and two copies second elements of v
let v4: f32vec4 = vec4(v.zzz, 42); // v4 is constructed from three copies of third elements of v and 42_f32
sw2.xz += 100.0; // add 100.0 to first and third elements
let color = v.rgba; // alternative syntax for swizzles, corresponding to .xyzw. Represents color
let elem = v[1]; // access second element with indexing syntax
let sum = v + vec4(5.0, 6, 7, 8.0); // element-wide math
let dot = v.dot(sum); // method `dot` represents mathematical dot product

let m: mat4x4<f32> = mat4x4::identity();
let col = m[2];
let val = m[2][1];
let mul = m * v; // multiplies vector by matrix, e.g. 3d geometry transformations in rasterization 

let q: quat<f32> = quat(0.0,0.0,0.0,1.0);
let rotated = q * v; // rotation by quaternion

let casted: vec4<i32> = v as i32vec4; // same as per-element `as` cast
```

## Reference-level explanation
[reference-level-explanation]: #reference-level-explanation

vecN<T> (N=2-4; T=f32/f64/i8-i64/u8-u64; aliases); matMxN<T> (column-major default); quat<T> ({x,y,z,w}).

- writable/readable swizzles; indexing; element-wise ops; matrix/quat mul and other overloads
- casts: 'as' same-size; From/Into arrays.
- backend: std::simd.

## Drawbacks
[drawbacks]: #drawbacks

Extra complexity, syntactical exceptions, "magic", compiler speed/size. 

## Rationale and alternatives
[rationale-and-alternatives]: #rationale-and-alternatives

Built-ins enable syntax that libs can't. Fixed 2-4D covers 99% of usecases. In many projects linear algebra is primary reason for operator overloads to exist. Pretty much every game/graphics/physics library depends on one or more linear algebra library, and when combining those you have to "glue" them together.
Adding this feature would make gamedev a lot more appealing in Rust, make graphics programming less painful, help projects like Rust-GPU (and integrate with things like std::offload). Syntax sugar for vectors would be primary reason to use shading languages (e.g. GLSL) instead of Rust (if all other issues were resolved).

Could this be done in a library or macro instead? Yes, this is mostly syntactical change. I do think, however, this is a syntactical sugar that is worth it for enumerated areas.

## Prior art
[prior-art]: #prior-art

| Language                 | Swizzles syntax sugar                | Constructors                                 | Elementwise operations | Matrix * Vector Mul | Quat * Vector Mul (rotation) sugar | Vector casts                         |
| ------------------------ | ------------------------------------ | -------------------------------------------- | ---------------------- | ------------------- | ---------------------------------- | ------------------------------------ |
| Odin                     | Yes, with writes                     | explicit elements                            | Yes                    | Yes (m * v)         | No                                 | explicit per-element                 |
| GLSL                     | Yes, with writes                     | overloaded fill, implicit casts, from others | Yes                    | Yes (m * v)         | No                                 | explicit constructors, downcasts     |
| WGSL                     | Yes, reads + single-component writes | overloaded fill, from others                 | Yes                    | Yes (m * v)         | No                                 | explicit constructors, down/up casts |
| HLSL                     | Yes, with writes                     | implicit casts, from others                  | Yes                    | Yes (mul(m, v))     | No                                 | implicit/explicit, downcasts         |
| Metal                    | Yes, with writes                     | overloaded fill, implicit casts, from others | Yes                    | Yes (m * v)         | No                                 | explicit                             |
| C (GCC/Clang extensions) | No                                   | explicit elements                            | Yes                    | No (manual)         | No                                 | implicit/explicit same-size          |
| Zig                      | No                                   | explicit elements                            | Yes                    | No (manual)         | No                                 | explicit                             |

Code for verifying these features in enumerated languages at the bottom.

Odin (which many people know as gamedev-oriented language) had success with vectors/matrices/quaternions that are closest in sugar level to proposed.
It is hard to judge other languages in that regard because of unique differences and the fact we are comparing syntax.

## Unresolved questions
[unresolved-questions]: #unresolved-questions

Dims limit; quats/complex; alignment; (row/column) major; casts; at which level is this implemented. (e.g. desugared directly into std::simd or to some std::linal?)

## Future possibilities
[future-possibilities]: #future-possibilities

Arbitrary-sized integers/floats in vectors and vector sizes.

## Other language features

C:
```c
// clang at.c

#include <stdio.h>

typedef float v4f __attribute__((__vector_size__(16)));
typedef int   v4i __attribute__((__vector_size__(16)));

typedef float v3f __attribute__((__vector_size__(12)));
typedef int   v3i __attribute__((__vector_size__(12)));

int main() {
    // vector, no implicit casting
    v4f v = {1.0f, 2.0f, 3.0f, 4.0f};
    
    // no overloaded fill
    // no inherit in initializer
    
    // no swizzles - manual indexing
    v4f swizzled = {v[3], v[1], v[0], v[0]};
    
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
    v4i implicit_casted = v;
    // v3i down_casted = (v3i)v;
    // v4i up_casted = (v4i)down_casted;
    
    // no valid swizzle on smaller vectors
    
    printf("%f %f %d\n", elem_ops[0], mul[0], casted[0]);
    return 0;
}
```

GLSL:
```glsl
// glslc -fshader-stage=vertex at.gls

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
    ivec3 down_casted = ivec3(v);
    // ivec4 up_casted = ivec4(down_casted);
    
    // valid swizzle on vec3
    v3.rbg = vec3(1.0);
    // error: no 'w' component on vec3
    // v3.w = 5.0; 
}
```

HLSL:
```hlsl
// dxc /T ps_6_0 at.hlsl

float4 main() : SV_Target {
    // vector, implicit casting
    float4 v = float4(1, uint(2.0), float(3), 4*1.0);
    
    // no overloaded fill
    // float4 v1 = float4(1);
    
    // weird because it CAN inherit components from other vectors in constructor
    float4 i1 = float4(v);
    float4 i2 = float4(1.0, v.gg, v.x);
    float4 i3 = float4(v.xyx, uint(7));
    
    // swizzle read
    float4 swizzled = v.wyxx;
    swizzled = v.grab;
    
    // swizzle write + elementwise
    swizzled.yz += float2(69.0, 420.0);
     
    // elementwise
    float4 elem_ops = v + float4(5.0, 6.0, 7.0, 8.0);
    
    // identity, no syntax 
    float4x4 m = {
        { 1, 0, 0, 0 }, 
        { 0, 1, 0, 0 }, 
        { 0, 0, 1, 0 }, 
        { 0, 0, 0, 1 }  
    };              
    
    // matrix * vector
    float4 res = mul(m, v);
    
    // no special quaternion syntax
    float4 q = float4(0.0, 0.0, 0.0, 1.0);
    float3 v3 = float3(1.0, 2.0, 3.0);
    // and ofcourse no sugar
    float3 rotated = v3 + cross(2.0 * q.xyz, cross(q.xyz, v3) + q.w * v3);
    
    // cast
    int4 casted = (int4)v;
    int4 implicit_casted = v;
    int3 down_casted = (int3)v;
    // int4 up_casted = (int4)down_casted;
    
    // valid swizzle on float3
    v3.rbg = 1.0;
    
    // error: no 'w' component
    // v3.w = 5.0;
    
    return float4(0,0,0,0);
}
```

Metal:
```metal
// https://shader-playground.timjones.io/ - i dont have access to Apple device

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
    
    // and ofcourse no sugar
    float3 rotated = v3 + cross(2.0 * q.xyz, cross(q.xyz, v3) + q.w * v3);
    
    // cast
    int4 casted = int4(v);
    
    // valid swizzle on float3
    v3.rbg = 1.0;
    
    // error: no 'w' component
    // v3.w = 5.0;
}
```

Odin:
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
	// casted: [4]i32 = linalg.array_cast(v, i32)
}
```

WGSL:
```wgsl
// cargo binstall naga-cli
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
    
    //  no built-in for quaternions
    let q: vec4<f32> = vec4<f32>(0.0, 0.0, 0.0, 1.0);
    let v3: vec3<f32> = vec3<f32>(1.0, 2.0, 3.0);
    // and ofcourse no sugar
    let rotated: vec3<f32> = v3 + cross(2.0 * q.xyz, cross(q.xyz, v3) + q.w * v3);
    
    // cast (constructor = explicit cast)
    let casted: vec4<i32> = vec4<i32>(v);
    // let implicit_casted: vec4<i32> = v;
    let down_casted: vec3<i32> = vec3<i32>(v);
    let up_casted: vec4<i32> = casted;
    
    // valid swizzle on vec3
    var temp_v3 = v3;
    let rgb = temp_v3.rbg;
    // compile-time error example (commented)
    // temp_v3.w = 5.0; // error: no 'w' component
}
```

Zig:
```zig
// zig build-exe at.zig

const std = @import("std");

pub fn main() !void {
    // vector, no implicit casting
    const t: u32 = 2;
    const v: @Vector(4, f32) = .{ 1.0, t, 3.0, 4.0 };

    // no overloaded fill
    // error: expected 4 vector elements; found 1
    // const v1: @Vector(4, f32) = .{1.0};

    // const v2: @Vector(2, f32) = .{ 1.0, 2.0 };
    // no inherit in initializer
    // const i: @Vector(4, f32) = .{ v2, v2 };

    // no swizzles - manual indexing
    const swizzled: @Vector(4, f32) = .{ v[3], v[1], v[0], v[0] };

    // elementwise operations
    const elem_ops: @Vector(4, f32) = v + @Vector(4, f32){ 5.0, 6.0, 7.0, 8.0 };

    // no matrix / quaternion built-in
    const mul: @Vector(4, f32) = v;

    // cast
    const casted: @Vector(4, i32) = @intFromFloat(v);

    _ = swizzled;
    _ = elem_ops;
    _ = mul;
    _ = casted;
    // no swizzle on smaller vectors
}
```