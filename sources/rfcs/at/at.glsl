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