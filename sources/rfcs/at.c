// gcc at.c -o at && ./at

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