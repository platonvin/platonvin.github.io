// zig build-exe at.zig

const std = @import("std");

pub fn main() !void {
    // vector, no implicit casting
    const v: @Vector(4, f32) = .{ 1.0, 2.0, 3.0, 4.0 };

    // no overloaded fill
    // no inherit in initializer

    // no swizzles - manual indexing
    const swizzled: @Vector(4, f32) = .{ v[3], v[1], v[0], v[0] };

    // elementwise operations
    const elem_ops: @Vector(4, f32) = v + @Vector(4, f32){ 5.0, 6.0, 7.0, 8.0 };

    // no matrix * vector built-in - manual placeholder
    const mul: @Vector(4, f32) = v; // identity gives v

    // no special quaternion syntax
    // no quat * vector sugar

    // cast
    const casted: @Vector(4, i32) = @intFromFloat(v);

    _ = swizzled;
    _ = elem_ops;
    _ = mul;
    _ = casted;
    // no swizzle on smaller vectors
}
