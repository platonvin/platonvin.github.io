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