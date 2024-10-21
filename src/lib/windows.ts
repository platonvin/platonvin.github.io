export interface Subcard {
    title: string;
    description?: string;
    problem?: string;
    solution?: string;
    image?: string;
}
export type Window = {
    id: number
    title: string
    githubLink: string
    screenshot?: string
    description: string
    subcards: Subcard[]
    //the way rendering in html works does not allow easy height quering
    //so it is either a lot of code or just clamp it manually. Manually is ~2 mins, code is ~2 days
    baseWidth: number //specified
    baseHeight: number //specified
    expandedHeight: number //calculated
    image?: string; //just content
    video?: string; //just content
}

export type Position = {
    x: number
    y: number
}

export const windows: Window[] = [
    {
        id: 1,
        title: 'Lum',
        githubLink: 'https://github.com/platonvin/lum',
        description: 'Voxel engine/renderer',
        // details: 'written with focus on low-end devices',
        video: "/lum.webm",
        baseWidth: 550,
        baseHeight: 550,
        expandedHeight: 0,
        subcards: [
            {
                title: 'Fully dynamic GI',
                image: "/lum.png",
                description: 'real-time GI that has enough perfomance to run on mobile',
                problem: 'challenge of achieving dynamic lighting while keeping high perfomance',
                solution: 'divide light into frequencies, compute them separatly via different (following) methods',
            },
            {
                title: 'Radiance probes',
                image: "/lum_probes.png", 
                description: 'per-block (low frequency) lighting',
                problem: 'perfomance of raytracing',
                solution: 'custom highly specialized voxel traversal algorithm, task-limited update-on-request system'
            },
            {
                title: 'Lightmaps',
                image: "/lum_lightmap.png", 
                description: 'sunlight PCF-filtered depth-buffer lightmapping',
            },
            {
                title: 'Ambient Occlusion',
                image: "/lum_ao.png", 
                description: 'Screen-space Horizon-Based Ambient Occlusion',
                problem: 'AO perfomance on low-end devices (registers limited, memory bandwidth)',
                solution: 'switch to HBAO, run-time computed lookup tables, weighted distribution of sample points in polar coordinate system'
            },
            {
                title: 'Reflections',
                image: "/lum_glossy.png", 
                description: 'raytraced glossy',
                problem: 'perfomance & support. Raytracing is slow in full resolution, and most devices do not support raytracing pipeline',
                solution: 'software raytracing in voxel space with custom acceleration structure'
            },
            {
                title: 'Foliage renderer',
                image: "/lum_grass.png", 
                description: 'grass and similar',
                problem: 'perfomance of existing techniques',
                solution: 'no memory stores/moves, gpu-driven grass placement'
            },
            {
                title: 'Water renderer',
                image: "/lum_water.png", 
                description: 'wavy water surface simluation',
                problem: 'DFT is slow, FFT is not enough',
                solution: 'divide water surface into cascades - sum of each sampled with different step gives unique height'
            },
            {
                title: 'Volumetrics',
                image: "/lum_smoke.png", 
                description: 'dynamik non-voxel smoke',
                problem: 'perfomance of existing techniques',
                solution: 'compute depth in screen-space, keep step count constant, cascade Perlin noise for dencity sampling'
            },
        ],
    },
    {
        id: 2,
        title: 'Lum-al',
        githubLink: 'https://github.com/platonvin/lum-al',
        description: 'Vulkan C++ low-level library',
        // details: 'Vulkan abstraction layer designed to create high-perfomance applications fast. Specific constraints allow it to stay simple',
        baseWidth: 300,
        baseHeight: 200,
        expandedHeight: 0,
        subcards: [
            {
                title: 'CPU syncronization',
                description: '',
                problem: 'syncronizing GPU reads with CPU writes is hard',
                solution: 'Frames In Flight with every CPU-GPU resource placed in ring buffers'
            },
            {
                title: 'Vulkan resources',
                description: '',
                problem: 'Framebuffer/Renderpass bloat',
                solution: 'cut of rarely used features to allow automatic management of complicated resources'
            },
        ]
    },
    {
        id: 3,
        title: 'Mangaka',
        githubLink: 'https://github.com/platonvin/mangaka',
        description: 'Manga-style renderer, written with Lum-al',
        // details: 'Manga-style renderer, written with Lum-al',
        video: "/mangaka.webm",
        baseWidth: 250,
        baseHeight: 350,
        expandedHeight: 0,
        subcards: [
            {
                title: 'Outline',
                description: 'anime style psewdo-ink  outline',
                problem: 'where to draw the line?',
                solution: 'Sobel-filtered normal & depth buffers for discontinuities'
            },
            {
                title: 'Ben-Day dots',
                description: 'Manga shading specifics',
                problem: 'precomputed textures are not appropriate',
                solution: 'math-driven approach to draw (and multisample!) dots'
            },
            {
                title: 'Animations',
                problem: 'how to animate things?',
                solution: 'write loader (integration with lum-al and rendering functions) for format such as gltf'
            },
        ]
    },
    {
        id: 4,
        title: 'RaVE',
        githubLink: 'https://github.com/platonvin/RaVE',
        description: 'multithreaded SIMD grid-aligned Raytracer for Voxel Engines, created for internal needs of Lum engine',
        // details: 'C99 sse4 + pthreads CPU grid-aligned voxel raytracer created for internal needs of Lum engine',
        image: "/rave.png",
        baseWidth: 320,
        baseHeight: 500,
        expandedHeight: 0,
        subcards: [
            {
                title: 'Multithreading',
                problem: 'How to distribute tasks?',
                solution: 'Dispatch concept - user provides functions to identify & store ray from invocation position in 3D workgroup space, then multiple are submitted at once and managed by RaVE (same pattern that compute shaders use)'
            },
            {
                title: 'SIMD',
                description: '',
                problem: 'perfomance',
                solution: 'SIMD intrinsics for vectors, zero branching in main loop for better flow'
            },
        ]
    },
    {
        id: 5,
        title: 'Assembler',
        githubLink: 'https://github.com/platonvin/Assembler',
        description: 'CPU emulator - custom instruction set, registers, memory, visual output, and assembly language with CPU emulator for them. Developed for greater real-world CPU understanding',
        // details: 'custom instruction set, registers, memory, visual output, and assembly language with CPU emulator for them. Developed for greater real-world CPU understanding',
        baseWidth: 220,
        baseHeight: 220,
        expandedHeight: 0,
        subcards: [
        ]
    },
    {
        id: 6,
        title: 'SL-vector',
        githubLink: 'https://github.com/platonvin/sl-vector',
        description: 'GLSL in C23',
        // details: 'powerful C23 macro-library to bring vector casts in C',
        baseWidth: 200,
        baseHeight: 180,
        expandedHeight: 0,
        subcards: [
            {
                title: 'Vec() casts',
                problem: 'type identification in C',
                solution: 'C23 added _Generic, which allows code generation with comptime branching on type'
            },
            {
                title: 'Swizzles',
                description: 'vec3 a = vec3(b).xxy',
                problem: 'struct members are not allowed to be accessed & stored this way',
                solution: 'macro-expand generated unions with memberes named as swizzles. Unfortunately not all swizzles possible'
            },
        ]
    },
    {
        id: 7,
        title: 'TWPP',
        githubLink: 'https://github.com/platonvin/twpp',
        description: 'Tailwind colors in C++',
        // details: 'powerful C23 macro-library to bring vector casts in C',
        baseWidth: 200,
        baseHeight: 180,
        expandedHeight: 0,
        subcards: [
            {
                title: 'vec3 c = twpp::rose(600)',
                solution: 'generated constexpr switches for shades in namespace twpp{}',
            },
        ]
    },
    {
        id: 8,
        title: 'Circuli-Bellum ',
        githubLink: 'https://github.com/platonvin/Circuli-Bellum ',
        description: 'C++ Vulkan ROUNDS clone',
        // image: "/image.png",
        video: "/cb.webm",
        baseWidth: 380,
        baseHeight: 370,
        expandedHeight: 0,
        subcards: [
            {
                title: 'Shapes',
                // description: 'vec3 a = vec3(b).xxy',
                problem: 'Circles via triangles is too slow',
                solution: 'Signed Distance Field\'s [fragment] + bounding box [vertex]'
            },
            {
                title: 'Bloom',
                solution: 'subpass extraction -> downsample compute kernel -> upsample+combine compute kernel -> apply subpass'
            },
            {
                title: 'Shadows',
                problem: 'structFast accurate runtime shadows',
                solution: '1D rasterized shadowmaps - map angle to U'
            },
            {
                title: 'Chromatic abberation',
                solution: 'UV triangle offset when combining',
            },
        ]
    },
]