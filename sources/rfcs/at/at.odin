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
