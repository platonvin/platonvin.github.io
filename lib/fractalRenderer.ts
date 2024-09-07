let animationFrameId: number;

let isRendering: boolean = true;

export function initFractalRenderer(canvas: HTMLCanvasElement) {
    // const canvas = document.getElementById(canvasId) as HTMLCanvasElement;
    // if (!canvas) {
    //     console.error(`Canvas element with id '${canvasId}' not found`);
    //     return;
    // }

    const gl = canvas.getContext('webgl2');
    if (!gl) {
        console.error('WebGL2 not supported');
        return;
    }

    // Vertex shader source code
    const vertexShaderSource = 
/*glsl*/`#version 300 es
#pragma vscode_glsllint_stage: vert

precision highp float;

uniform vec2 u_resolution;

layout(location = 0) in vec4 a_position;

out vec3 ray_pos;
out vec3 ray_dir;


void main() {
    vec2 pix_pos = a_position.xy;
    // pix_pos -= 0.5;
    // pix_pos *= 2.0;

    vec2 scaled_pix_pos = pix_pos * u_resolution.xy / 1000.0;

    vec3 camera_dir = normalize(vec3(-1,-1,-0.5));
    vec3 camera_pos = vec3(1.1,1.1,0.5);
        // camera_pos -= camera_dir*2.0;
    //  camera_pos.x += 0.25 * sin(u_time/2.12);
    //  camera_pos.y += 0.25 * sin(u_time/4.12);
    //  camera_pos.z += 0.25 * sin(u_time/2.12);
    //  camera_pos.z += 0.25 * sin(u_time/2.12);
    vec3 horizline = normalize(vec3(1,-1,0));

    vec3 vertiline = normalize(cross(camera_dir, horizline));

    ray_pos = camera_pos + horizline*scaled_pix_pos.x*0.6 + vertiline*scaled_pix_pos.y*0.6;
    // vec3 ray_dir = normalize(camera_dir + horizline*scaled_pix_pos.x*0.1 + vertiline*scaled_pix_pos.y*0.1);
    ray_dir = camera_dir;
    
    gl_Position = a_position;
    // clip_pos = a_position;
}
    `;

    // Fragment shader source code
    const fragmentShaderSource = 
/*glsl*/`#version 300 es
#pragma vscode_glsllint_stage: frag

precision highp float;

uniform float u_time;
uniform vec2 u_resolution;
uniform vec2 u_mouse;
uniform float u_scroll;

//calculated on cpu
uniform vec4 u_C;
//calculated on cpu
uniform float u_SwizzleMix;

//calculated in vertex shader
in vec3 ray_pos;
in vec3 ray_dir;

layout(location = 0) out vec4 fragColor;

//actually just sphere
// float estimate_distance_sphere(const vec3 ray_pos){
//     float dist;
//     dist = abs(length(vec3(3.1) - ray_pos)) - 0.9;
//     return dist;
// }
vec4 quat_mul(in vec4 q1, in vec4 q2){
    vec4 r;
    r.x = q1.x*q2.x - dot( q1.yzw, q2.yzw );
    r.yzw = q1.x*q2.yzw + q2.x*q1.yzw + cross( q1.yzw, q2.yzw );
    return r;
}
vec4 quat_square(vec4 q){
    vec4 r;
    r.x = q.x*q.x - dot( q.yzw, q.yzw );
    r.yzw = 2.0*q.x*q.yzw;
    return r;
}
float quat_length_squared(in vec4 q){
    return dot(q,q);
}
vec4 quat_cube(in vec4 q){
    vec4 q2 = q*q;
    return vec4(q.x * (q2.x - 3.0*q2.y - 3.0*q2.z - 3.0*q2.w), 
    q.yzw * (3.0*q2.x - q2.y - q2.z - q2.w));
}

const float ESCAPE_THRESHOLD = 42.0;
const int MAX_ITERATIONS_DF = 10; //actually, very few steps needed
const int MAX_ITERATIONS_MARCH = 65;
const float epsilon = 1e-3;

float get_sdf(in vec3 pos, in vec4 C){
    vec4 z = vec4(pos, 0.0);
    float dz2 = 1.0;
	float m2  = 0.0;
    float orbit   = 1e10;
    
    for(int i=0; i < MAX_ITERATIONS_DF; i++) {
        //for ^3
		dz2 *= 9.0*quat_length_squared(quat_square(z));
		z = quat_cube( z ) + C;

        //for ^2
		// dz2 *= 4.0*quat_length_squared(z);
		// z = quat_square( z ) + C;
        
        m2 = quat_length_squared(z);

        // "orbit trapping"
        // point, plane or 3d space. Plane (two values) just looks better
        vec2 swizzle = mix(z.xy, z.wz, u_SwizzleMix); //mixing this just for fun
            //  swizzle = mix(swizzle, z.yw, sin(u_time / 5.663)); //mixing this just for fun
            // swizzle = z.xy;
        vec2 point = (vec2(+0.5,-0.3));
        orbit = min(orbit, (length(swizzle - point)-0.2)); //arbitrary swizzling, point and difference 
        
        if(m2 > ESCAPE_THRESHOLD) break;				 
	}
	float d = log2(m2)*sqrt(m2/dz2) / 4.0; // / 4.0 cause its lower bound

    d = min(orbit,d);
    // d = max(d, p.z); //to cut in half TODO use angle

	return float(d);        
}

struct marching_res {
    float dist;
    float iter;
};

vec2 zero_sphere_dist(in vec3 pos, in vec3 dir, in float radius, out bool intersects){
	float b = dot(pos, dir);
	float c = dot(pos, pos) - radius*radius;
	float h = b*b - c;
	if(h < 0.0) {
        intersects = false;
        return vec2(0);
    }
    h = sqrt(h);
    intersects = true;
    return vec2(-b-h, -b+h);
}
marching_res intersect_julia(inout vec3 ray_origin, in vec3 ray_direction, in vec4 C, in float epsilon){
    float bounding_radius = 1.2;

    //teleport to bounding sphere to save time
    // float sd = zero_sphere_dist(ray_origin, ray_direction, bounding_radius);
    // ray_origin = ray_origin + sd*ray_direction;

    // float dist = 0.0;
    // int iter;
    // for (iter=0; iter<MAX_ITERATIONS_MARCH; iter++){
    //     dist = get_sdf(ray_origin, C);
    //     ray_origin += dist*ray_direction;

    //     if((dist < epsilon) 
    //         || (dot(ray_origin, ray_origin) > bounding_radius*bounding_radius*1.0)
    //     ) {
    //         break;
    //     }
    // }

    float T = 0.0;
    // teleport to bounding sphere to save time
    bool intersects = false;
    vec2 bounding_T = zero_sphere_dist(ray_origin, ray_direction, bounding_radius, intersects);
    if(!intersects) {
        marching_res res;
        res.dist = 1e10;
        res.iter = float(0);
        return res;
    }

    T = bounding_T.x;

    float dist = 0.0;
    int iter;
    for (iter=0; iter<MAX_ITERATIONS_MARCH; iter++){
        dist = get_sdf(ray_origin + T*ray_direction, C);
        T += dist;

        if((dist < epsilon) 
            || ((T) > bounding_T.y)
        ) {
            break;
        }
    }

    ray_origin = ray_origin + T*ray_direction;
    
    marching_res res;

    res.dist = dist;
    res.iter = float(iter);
    
    return res;
}
vec3 estimate_normals(in vec3 pos, in vec4 C, in float epsilon){
    vec2 e = vec2(1.0,-1.0)*0.5773*epsilon;
    return normalize(e.xyy*get_sdf(pos + e.xyy, C)+ 
					 e.yyx*get_sdf(pos + e.yyx, C)+ 
					 e.yxy*get_sdf(pos + e.yxy, C)+ 
					 e.xxx*get_sdf(pos + e.xxx, C));
}

//why df fine does not work (even with hint)?
// vec3 estimate_normals_local_diff(vec3 position){
//     vec3 p = position * 10.0;
//     vec3 X = dFdx(p);
//     vec3 Y = dFdy(p);
//     return normalize(cross(X,Y));
// }
float luminance(in vec3 color){
    vec3 luminance_const = vec3(0.2126, 0.7152, 0.0722);
    return dot(color, luminance_const);
}
vec3 rgb2hsv(in vec3 c){
    vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
    vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
    vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));

    float d = q.x - min(q.w, q.y);
    float e = 1.0e-10;
    return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
}
vec3 hsv2rgb(in vec3 c){
    vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
    vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
    return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}
vec3 hex2rgb (in int u_color){
    int r = (u_color / 256 / 256) % 256;
    int g = (u_color / 256      ) % 256;
    int b = (u_color            ) % 256;

    return vec3(r,g,b) / 256.0;
}

//why ## does not work?
// #define extrude_color_from_hex(c1,c2,c3,c4,c5)
// palette[0] = hex2rgb(0x ## c1);
// palette[1] = hex2rgb(0x ## c2);
// palette[2] = hex2rgb(0x ## c3);
// palette[3] = hex2rgb(0x ## c4);
// palette[4] = hex2rgb(0x ## c5);

//WHER IS MY __VA_ARGS__
// #define interpolator(color_count, ...)

vec3 interpolate_palette(in float x) {
    const int color_count = 8;
    
    vec3 palette[color_count];
    palette[0] = hex2rgb(0x191d1b); // Darker tones for shadow depth
    palette[1] = hex2rgb(0x2b3634);
    palette[2] = hex2rgb(0x474848);
    palette[3] = hex2rgb(0x8a6e61); // Warmer midtones
    palette[4] = hex2rgb(0xdca290); // Vivid highlights
    palette[5] = hex2rgb(0xf3dbc6);
    palette[6] = hex2rgb(0xfffefe); // Brightest highlight
    palette[7] = hex2rgb(0xffe0b5);

    float section_count = float(color_count - 1);
    float scaled_x = x * section_count;

    int section = int(floor(scaled_x)); // More stable interpolation
    float fraction = fract(scaled_x);

    vec3 color1 = palette[section];
    vec3 color2 = palette[section + 1];
    vec3 color = mix(color1, color2, smoothstep(0.0, 1.0, fraction)); // Smoother interpolation

    return color;
}

vec3 color_surface(in vec3 pos, in vec3 normal, in float iter) {
    vec3 rgb_color = interpolate_palette(0.5 + sin(iter / 10.0 + u_time * 0.5) * 0.5); // More dynamic modulation

    // Lighting
    float ambient = 0.2; // Slightly stronger ambient light for more visibility
    vec3 sun_dir = normalize(vec3(-1.0, -1.0, 1.0));
    float sun_light = max(0.0, dot(normal, sun_dir)) * 0.6;

    // Point light
    vec3 plight_pos = vec3(1.5 * sin(u_time * 0.5), 1.5 * cos(u_time * 0.5), 0.5); // Smoothly rotating
    vec3 plight_dir = normalize(plight_pos - pos);
    float point_light = max(0.0, dot(normal, plight_dir)) * 0.4;

    // Specular highlight (for a glossy effect)
    vec3 view_dir = normalize(ray_dir);
    vec3 half_vec = normalize(plight_dir + view_dir);
    float specular = pow(max(0.0, dot(normal, half_vec)), 32.0) * 0.5; // Shininess

    // Combine lighting
    float lighting = ambient + sun_light + point_light + specular;
    lighting = clamp(lighting, 0.0, 1.5);

    rgb_color *= lighting;

    return rgb_color;
}
//how close is already point of set
void main() {
    vec3 pos = ray_pos;
    vec3 dir = ray_dir;

    vec4 C = u_C;

    marching_res marching_res = intersect_julia(pos, dir, C, epsilon);
    float distance_to_set = marching_res.dist;

    vec3 color = vec3(0.2);
    if(distance_to_set <= epsilon) {
        vec3 normal = estimate_normals(pos, C, 0.00002);
        // color = normal;
        color = color_surface(pos, normal, (marching_res.iter));
    }
    fragColor = vec4(vec3(color), 1.0);
}
    `;

    const createShader = (gl: WebGL2RenderingContext, type: number, source: string): WebGLShader | null => {
        const shader = gl.createShader(type);
        if (!shader) {
            console.error('Error creating shader');
            return null;
        }
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            console.error(gl.getShaderInfoLog(shader));
            gl.deleteShader(shader);
            return null;
        }
        return shader;
    };

    const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);

    if (!vertexShader || !fragmentShader) {
        return;
    }

    const program = gl.createProgram();
    if (!program) {
        console.error('Error creating program');
        return;
    }

    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error(gl.getProgramInfoLog(program));
        return;
    }

    gl.useProgram(program);

    // Fullscreen triangle
    const vertices = new Float32Array([
        -1, 1,
        3, 1,
        -1, -3
    ]);

    const buffer = gl.createBuffer();
    if (!buffer) {
        console.error('Error creating buffer');
        return;
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    const positionLocation = gl.getAttribLocation(program, 'a_position');
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    const timeUniform = gl.getUniformLocation(program, 'u_time');
    const resolutionUniform = gl.getUniformLocation(program, 'u_resolution');
    const mouseUniform = gl.getUniformLocation(program, 'u_mouse');
    const scrollUniform = gl.getUniformLocation(program, 'u_scroll');
    const constantUniform = gl.getUniformLocation(program, 'u_C');
    const swizzleMixUniform = gl.getUniformLocation(program, 'u_SwizzleMix');

    gl.hint(gl.FRAGMENT_SHADER_DERIVATIVE_HINT, gl.NICEST);
    
    function resizeCanvas(): void {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        if(gl == null) return;
            gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
    }

    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    const startTime = Date.now();
    let mouseX = 0, mouseY = 0;
    let scrollY = 0;

    window.addEventListener('mousemove', (e: MouseEvent) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
    });

    window.addEventListener('scroll', () => {
        scrollY = window.scrollY;
    });

    if(animationFrameId) 
    isRendering = true;
    else 
    isRendering = true;

    function render(): void {
        if(isRendering){
            console.error('r');
            const currentTime = 10.0 + (Date.now() - startTime) / 1000;

            if(gl == null) return;

            gl.clear(gl.COLOR_BUFFER_BIT);

            gl.uniform1f(timeUniform, currentTime);
            gl.uniform2f(resolutionUniform, canvas.width, canvas.height);

            const C_x = -0.65 + -0.65 * 0.15 * Math.sin((currentTime + 23.0) / 2.12);
            const C_y = -0.3 + -0.3 * 0.15 * Math.sin((currentTime + 23.0) / 3.523);
            const C_z = 0.6 + 0.6 * 0.15 * Math.sin((currentTime + 23.0) / 5.634);
            const C_w = -0.2 + -0.2 * 0.15 * Math.sin((currentTime + 23.0) / 7.6345);

            gl.uniform1f(swizzleMixUniform, Math.sin(currentTime / 3.312));
            gl.uniform4f(constantUniform, C_x, C_y, C_z, C_w);

            gl.uniform2f(mouseUniform, mouseX, canvas.height - mouseY);
            gl.uniform1f(scrollUniform, scrollY);

            gl.drawArrays(gl.TRIANGLES, 0, 3);
            animationFrameId = requestAnimationFrame(render);
        }
    }

    render();
    // isRendering = false;
    // Return a cleanup function
    // return () => {
    //     cancelAnimationFrame(animationFrameId);
    //     // Any other cleanup (e.g., deleting WebGL contexts, buffers, etc.)
    // };
}

export function stopFractalRenderer(){
        isRendering = false;
        console.error('stop 1');
    return () => {
        // isRendering = false;
        console.error('stop 2');
        // if (animationFrameId) {
        //     cancelAnimationFrame(animationFrameId);
        //     const gl = canvas.getContext('webgl2');
        //     gl?.disable;
        // }
        // Any other cleanup (e.g., deleting WebGL contexts, buffers, etc.)
    };
}