// dxc /T ps_6_0 at.hlsl

float4 main() : SV_Target {
    // vector, implicit casting
    float4 v = float4(1, uint(2.0), float(3), 4*1.0);
    
    // no overloaded fill
    // float4 v1 = float4(1);
    
    // weird because CAN inherit components from other vectors in constructor
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
    
    // identity, no syntax again
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