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
