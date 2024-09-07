'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, X, FileText, Download, Github, Sparkles} from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { initFractalRenderer,stopFractalRenderer } from '@/lib/fractalRenderer'

// document.body.style.overflow = "hidden"

const projects = [
  {
    id: 1,
    title: 'Lum',
    description: 'Voxel engine/renderer',
    details: 'written with focus on low-end devices',
    github: 'https://github.com/platonvin/lum',
    subcards: [
      {
        title: 'Fully dynamic GI',
        description: 'real-time GI that has enough perfomance to run on mobile',
        problem: 'challenge of achieving dynamic lighting while keeping high perfomance',
        solution: 'divide light into frequencies, compute them separatly via different (following) methods'
      },
      {
        title: 'Radiance probes',
        description: 'per-block (low frequency) lighting',
        problem: 'perfomance of raytracing',
        solution: 'custom highly specialized voxel traversal algorithm, task-limited update-on-request system'
      },
      {
        title: 'Lightmaps',
        description: 'sunlight PCF-filtered depth-buffer lightmapping',
      },
      {
        title: 'Ambient Occlusion',
        description: 'Screen-space Horizon-Based Ambient Occlusion',
        problem: 'AO perfomance on low-end devices (registers limited, memory bandwidth)',
        solution: 'switch to HBAO, run-time computed lookup tables, weighted distribution of sample points in polar coordinate system'
      },
      {
        title: 'Reflections',
        description: 'raytraced glossy',
        problem: 'perfomance & support. Raytracing is slow in full resolution, and most devices do not support raytracing pipeline',
        solution: 'software raytracing in voxel space with custom acceleration structure'
      },
      {
        title: 'Foliage renderer',
        description: 'grass and similar',
        problem: 'perfomance of existing techniques',
        solution: 'no memory stores/moves, gpu-driven grass placement'
      },
      {
        title: 'Water renderer',
        description: 'wavy water surface simluation',
        problem: 'DFT is slow, FFT is not enough',
        solution: 'divide water surface into cascades - sum of each sampled with different step gives unique height'
      },
      {
        title: 'Volumetrics',
        description: 'dynamik non-voxel smoke',
        problem: 'perfomance of existing techniques',
        solution: 'compute depth in screen-space, keep step count constant, cascade Perlin noise for dencity sampling'
      },
    ]
  },
  {
    id: 2,
    title: 'Lum-al',
    description: 'Vulkan C++ low-level library',
    details: 'Vulkan abstraction layer designed to create high-perfomance applications fast. Specific constraints allow it to stay simple',
    github: 'https://github.com/platonvin/lum-al',
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
    title: 'mangaka',
    description: 'Manga-style renderer',
    details: 'Manga-style renderer, written with Lum-al',
    github: 'https://github.com/platonvin/mangaka',
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
    description: 'multithreaded SIMD Raytracer for Voxel Engines',
    details: 'C99 sse4 + pthreads CPU grid-aligned voxel raytracer created for internal needs of Lum engine',
    github: 'https://github.com/platonvin/RaVE',
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
    description: 'CPU emulator',
    details: 'custom instruction set, registers, memory, visual output, and assembly language with CPU emulator for them. Developed for greater real-world CPU understanding',
    github: 'https://github.com/platonvin/Assembler',
    subcards: [
    ]
  },
  {
    id: 6,
    title: 'sl-vector',
    description: 'GLSL in C23',
    details: 'powerful C23 macro-library to bring vector casts in C',
    github: 'https://github.com/platonvin/sl-vector',
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
]

const cvContent = /*html*/`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Platon Vinnichek - Graphics Engineer</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 0;
        }
        .container {
            max-width: 800px;
            margin: 0 auto;
            background: #fff;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 0 10px rgba(0,0,0,0.1);
        }
        h1, h2, h3 {
        }
        .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .header a {
            text-decoration: none;
            margin-right: 10px;
        }
        .icon {
            margin-right: 5px;
        }
        ul {
            list-style: none;
            padding-left: 0;
        }
        li {
            margin-bottom: 10px;
        }
        a {
        }
        .alink {
          color: blue;
        }
    </style>
</head>
<body>
    <div class="container">
        <header>
            <div class="header">
                <h1>Platon Vinnichek</h1>
                <div class="CVcontact">
                <a href="mailto:platonvin@gmail.com">
                  <span class="icon">&#9993;</span> platonvin@gmail.com
                </a>
                <a href="https://t.me/platonvin"> 
                  <svg xmlns="http://www.w3.org/2000/svg" width="1.7em" height="1.7em" viewBox="0 0 256 256"><defs><linearGradient id="logosTelegram0" x1="50%" x2="50%" y1="0%" y2="100%"><stop offset="0%" stop-color="#2aabee"/><stop offset="100%" stop-color="#229ed9"/></linearGradient></defs><path fill="url(#logosTelegram0)" d="M128 0C94.06 0 61.48 13.494 37.5 37.49A128.04 128.04 0 0 0 0 128c0 33.934 13.5 66.514 37.5 90.51C61.48 242.506 94.06 256 128 256s66.52-13.494 90.5-37.49c24-23.996 37.5-56.576 37.5-90.51s-13.5-66.514-37.5-90.51C194.52 13.494 161.94 0 128 0"/><path fill="#fff" d="M57.94 126.648q55.98-24.384 74.64-32.152c35.56-14.786 42.94-17.354 47.76-17.441c1.06-.017 3.42.245 4.96 1.49c1.28 1.05 1.64 2.47 1.82 3.467c.16.996.38 3.266.2 5.038c-1.92 20.24-10.26 69.356-14.5 92.026c-1.78 9.592-5.32 12.808-8.74 13.122c-7.44.684-13.08-4.912-20.28-9.63c-11.26-7.386-17.62-11.982-28.56-19.188c-12.64-8.328-4.44-12.906 2.76-20.386c1.88-1.958 34.64-31.748 35.26-34.45c.08-.338.16-1.598-.6-2.262c-.74-.666-1.84-.438-2.64-.258c-1.14.256-19.12 12.152-54 35.686c-5.1 3.508-9.72 5.218-13.88 5.128c-4.56-.098-13.36-2.584-19.9-4.708c-8-2.606-14.38-3.984-13.82-8.41c.28-2.304 3.46-4.662 9.52-7.072"/></svg>
                </a>
                <a href="https://github.com/platonvin"> 
                  <svg xmlns="http://www.w3.org/2000/svg" width="2em" height="2em" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M16.24 22a1 1 0 0 1-1-1v-2.6a2.15 2.15 0 0 0-.54-1.66a1 1 0 0 1 .61-1.67C17.75 14.78 20 14 20 9.77a4 4 0 0 0-.67-2.22a2.75 2.75 0 0 1-.41-2.06a3.7 3.7 0 0 0 0-1.41a7.7 7.7 0 0 0-2.09 1.09a1 1 0 0 1-.84.15a10.15 10.15 0 0 0-5.52 0a1 1 0 0 1-.84-.15a7.4 7.4 0 0 0-2.11-1.09a3.5 3.5 0 0 0 0 1.41a2.84 2.84 0 0 1-.43 2.08a4.07 4.07 0 0 0-.67 2.23c0 3.89 1.88 4.93 4.7 5.29a1 1 0 0 1 .82.66a1 1 0 0 1-.21 1a2.06 2.06 0 0 0-.55 1.56V21a1 1 0 0 1-2 0v-.57a6 6 0 0 1-5.27-2.09a3.9 3.9 0 0 0-1.16-.88a1 1 0 1 1 .5-1.94a4.9 4.9 0 0 1 2 1.36c1 1 2 1.88 3.9 1.52a3.9 3.9 0 0 1 .23-1.58c-2.06-.52-5-2-5-7a6 6 0 0 1 1-3.33a.85.85 0 0 0 .13-.62a5.7 5.7 0 0 1 .33-3.21a1 1 0 0 1 .63-.57c.34-.1 1.56-.3 3.87 1.2a12.16 12.16 0 0 1 5.69 0c2.31-1.5 3.53-1.31 3.86-1.2a1 1 0 0 1 .63.57a5.7 5.7 0 0 1 .33 3.22a.75.75 0 0 0 .11.57a6 6 0 0 1 1 3.34c0 5.07-2.92 6.54-5 7a4.3 4.3 0 0 1 .22 1.67V21a1 1 0 0 1-.94 1"/>
                  </svg>
                </a>
              </div>
            </div>
            <strong><strong><h2>3D graphics programmer</h2></strong></strong>
        </header>
        <section>
            <ul>Experience</ul>
            <ul>
                <li>
                    <strong>Lum Engine</strong> — <a class = "alink" href="https://github.com/platonvin/lum">Repository</a> (C++17)
                    <ul>
                        <li>Created a Vulkan C++ voxel engine from scratch, focusing on performance, with fully dynamic global illumination, ray-traced reflections, and modern rendering pipelines</li>
                        <li><strong>Software Voxel Raytracer (RaVE)</strong> — <a class = "alink" href="https://github.com/platonvin/RaVE">Repository</a> (C99)
                            <ul>
                                <li>Developed a CPU multithreaded SIMD raytracer, designed for simple integration in any voxel engine</li>
                            </ul>
                        </li>
                        <li><strong>Deferred Renderer</strong>
                            <ul>
                                <li>Implemented a subpass-based deferred renderer, achieving high performance on Tile-Based GPUs through subpass management and custom compression algorithms.</li>
                            </ul>
                        </li>
                        <li><strong>Radiance Field GI</strong>
                            <ul>
                                <li>Created a real-time, fully dynamic global illumination system for low-frequency light using custom ray-tracing algorithm and acceleration structure</li>
                            </ul>
                        </li>
                        <li><strong>Reflections</strong>
                            <ul>
                                <li>Developed a real-time raytraced reflections system for glossy surfaces</li>
                            </ul>
                        </li>
                        <li><strong>Volumetrics Renderer</strong>
                            <ul>
                                <li>Designed a high-performance screen-space volumetric renderer based on Lambert's law and 3D Perlin noise for realistic effects.</li>
                            </ul>
                        </li>
                        <li><strong>Foliage Renderer</strong>
                            <ul>
                                <li>Engineered a GPU-driven foliage renderer, capable of rendering hundreds of thousands of grass blades in hundreds of microseconds".</li>
                            </ul>
                        </li>
                        <li><strong>Realtime Denoiser</strong> (Currently unused)
                            <ul>
                                <li>Developed an edge-avoiding À-trous wavelet-based spatial filtering algorithm for efficient low spp path-traced global illumination denoising.</li>
                            </ul>
                        </li>
                    </ul>
                </li>
                <li>
                    <strong>Lum-al</strong> — <a class = "alink" href="https://github.com/platonvin/lum-al">Repository</a> (C++ Vulkan)
                    <ul>
                        <li>Designed a low-level Vulkan library optimized for high-performance applications with a simple and efficient architecture.</li>
                        <li><strong>Vulkan Resources Management</strong>
                            <ul>
                                <li>Reduced complexity by cutting useless for game engines features, enabling automated resource management for streamlined performance.</li>
                            </ul>
                        </li>
                        <li><strong>CPU Synchronization</strong>
                            <ul>
                                <li>Implemented Frames In Flight, utilizing ring buffers for every CPU-GPU resource to enhance performance while keeping syncronization easy</li>
                            </ul>
                        </li>
                    </ul>
                </li>
                <li>
                    <strong>Mangaka</strong> — <a class = "alink" href="https://github.com/platonvin/mangaka">Repository</a> (C++ Vulkan)
                    <ul>
                        <li>Developed a manga-style renderer using Lum-al, achieving fast, high-quality rendering of stylized content.</li>
                        <li><strong>Outline Rendering</strong>
                            <ul>
                                <li>Sobel-filtered normal & depth buffers for efficient outline rendering via discontinuity detection.</li>
                            </ul>
                        </li>
                        <li><strong>Ben-Day Dots</strong>
                            <ul>
                                <li>Designed a math-driven, software multi-sampled dot rendering algorithm for Manga shading effects.</li>
                            </ul>
                        </li>
                        <li><strong>GLTF</strong>
                            <ul>
                                <li>Implemented GLTF file support.</li>
                            </ul>
                        </li>
                    </ul>
                </li>
                <li>
                    <strong>Assembler</strong> — <a class = "alink" href="https://github.com/platonvin/Assembler">Repository</a> (C99)
                    <ul>
                        <li>Created a CPU emulator with a custom instruction set, registers, memory and visual output to learn more about real-world CPUs</li>
                    </ul>
                </li>
                <li>
                    <strong>SL-Vec</strong> — <a class = "alink" href="https://github.com/platonvin/sl-vector">Repository</a> (C23)
                    <ul>
                        <li>Designed a macro library for GLSL vector types, casts, and functions in C23.</li>
                    </ul>
                </li>
                <li>
                    <strong>Fractal Raymarcher</strong> — <a class = "alink" href="https://github.com/platonvin/platonvin.github.io">Repository</a> | <a class = "alink" href="https://platonvin.github.io/">Live Demo: click button in bottom-right</a> (JavaScript)
                    <ul>
                        <li>Implemented a WebGL 4D Julia set (fractal) renderer for raymarching</li>
                    </ul>
                </li>
            </ul>
        </section>

        <section>
            <h3>Awards & Honors</h3>
            <ul><strong>Gold Medalist</strong> — International Al-Farghani Physics Olympiad (IAFPhO), 2021</ul>
        </section>

        <section>
        <h3>Education</h3>
        <ul><strong>Moscow Institute of Physics and Technology (MIPT)</strong> — Applied Mathematics and Physics <br>
        <i>2022 - 2023 (completed 1 year)</i></ul>
    </section>
    </div>
</body>
</html>
`

export default function ProjectShowcase() {
  const [expandedCards, setExpandedCards] = useState<Record<number, boolean>>({})
  const [expandedSubcards, setExpandedSubcards] = useState<Record<string, boolean>>({})
  const [showCV, setShowCV] = useState(false)
  const [showFractal, setShowFractal] = useState(false)
  const [isDarkMode, setIsDarkMode] = useState(false);

  const toggleCard = (id: number) => {
    setExpandedCards(prev => ({ ...prev, [id]: !prev[id] }))
  }

  const toggleSubcard = (cardId: number, subcardIndex: number) => {
    const key = `${cardId}-${subcardIndex}`
    setExpandedSubcards(prev => ({ ...prev, [key]: !prev[key] }))
  }

  useEffect(() => {
    if (showFractal) {
      const canvas = document.getElementById('backgroundCanvas') as HTMLCanvasElement;
      if (canvas) {
        initFractalRenderer(canvas);
      }
    }
  
    return () => {
      // if (showFractal) {
        stopFractalRenderer();
      // }
    };
  }, [showFractal]);

  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowCV(false)
      }
    }
    window.addEventListener('keydown', handleEsc)

    return () => {
      window.removeEventListener('keydown', handleEsc)
    }
  }, [])

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
      setIsDarkMode(true);
      document.documentElement.classList.add('dark');
    }
  }, []);

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
    if (!isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };
  
  const colorVariants = [
    'from-pink-400 to-purple-500',
    'from-green-400 to-blue-500',
    'from-yellow-400 to-orange-500',
    'from-red-400 to-pink-500',
    'from-indigo-400 to-cyan-500',
    'from-pink-500 to-purple-400',
  ]
  const darkColorVariants = [
    'from-blue-800 to-purple-800',
    'from-green-800 to-blue-900',
    'from-blue-800 to-teal-700',
    // 'from-teal-900 to-cyan-900',
    'from-green-900 to-blue-800',
    'from-indigo-900 to-cyan-800',
    'from-purple-900 to-teal-800',
    'from-purple-900 to-indigo-800',
    'from-teal-900 to-blue-800',
    'from-indigo-900 to-pink-900',
    'from-blue-900 to-pink-800',
    'from-cyan-900 to-indigo-900',
    'from-purple-900 to-pink-900',
  ];

  const openFractalRenderer = () => {
    setShowFractal(true)
  }

  return (
    <div
      className={`min-h-screen py-12 px-4 sm:px-6 lg:px-8 ${
        isDarkMode ? 'bg-gray-900 text-white' : 'bg-gradient-to-br from-blue-100 via-purple-100 to-pink-100'
      }`}
    >
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-12">
          <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600">
            My Projects Showcase
          </h1>
          <button
            onClick={toggleTheme}
            className="px-4 py-2 bg-gray-200 text-black rounded dark:bg-gray-700 dark:text-white"
          >
            {isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">  
          {projects.map((project, index) => (
            <Card key={project.id} className={`overflow-hidden bg-gradient-to-br ${
              isDarkMode
                ? darkColorVariants[index % darkColorVariants.length]
                : colorVariants[index % colorVariants.length]
            } text-white`}
            >
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-2">
                  <h2 className="text-2xl font-semibold">{project.title}</h2>
                  <div className="flex items-center">
                    <a href={project.github} className="mr-2">Link:</a>
                    <a href={project.github} target="_blank" rel="noopener noreferrer" className="text-white hover:text-gray-200 transition-colors">
                      <Github className="h-6 w-6" />
                      {/* <Icon icon="eva:github-outline" width="1.5em" height="1.5em"/> */}
                      <span className="sr-only">GitHub repository</span>
                    </a>
                  </div>
                </div>
                <p className="mb-4">{project.description}</p>
                <Button 
                  variant="outline"
                  onClick={() => toggleCard(project.id)}
                  aria-expanded={expandedCards[project.id]}
                  className="w-full justify-between bg-white bg-opacity-20 hover:bg-opacity-30 transition-colors duration-200"
                >
                  {expandedCards[project.id] ? 'Hide Details' : 'Show Details'}
                  <ChevronDown
                    className={`ml-2 h-4 w-4 transition-transform duration-200 ${
                      expandedCards[project.id] ? 'rotate-180' : ''
                    }`}
                  />
                </Button>
                <AnimatePresence>
                  {expandedCards[project.id] && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3 }}
                      className="mt-4"
                    >
                      <p className="mb-4">{project.details}</p>
                      {project.subcards.map((subcard, subIndex) => (
                        <div key={subIndex} className="mb-4 bg-white bg-opacity-10 rounded-lg border border-white border-opacity-20 transition-all duration-200 hover:bg-opacity-20 hover:border-opacity-30">
                          <Button
                            variant="ghost"
                            onClick={() => toggleSubcard(project.id, subIndex)}
                            aria-expanded={expandedSubcards[`${project.id}-${subIndex}`]}
                            className="w-full justify-between text-left font-semibold p-4 hover:bg-white hover:bg-opacity-10 rounded-t-lg"
                          >
                            {subcard.title}
                            <ChevronDown
                              className={`ml-2 h-4 w-4 transition-transform duration-200 ${
                                expandedSubcards[`${project.id}-${subIndex}`] ? 'rotate-180' : ''
                              }`}
                            />
                          </Button>
                          <AnimatePresence>
                            {expandedSubcards[`${project.id}-${subIndex}`] && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: 0.2 }}
                                className="px-4 pb-4"
                              >
                                <p className="mb-2">{subcard.description}</p>
                                {subcard.problem && (
                                  <div className="mt-2">
                                    <h4 className="font-medium">Problem:</h4>
                                    <p className="ml-2 mb-2">{subcard.problem}</p>
                                  </div>
                                )}
                                {subcard.solution && (
                                  <div className="mt-2">
                                    <h4 className="font-medium">Solution:</h4>
                                    <p className="ml-2">{subcard.solution}</p>
                                  </div>
                                )}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="mt-12 flex justify-center space-x-4">
          <Button onClick={() => setShowCV(true)} className="bg-gradient-to-r from-purple-600 to-pink-600 text-white">
            <FileText className="mr-2 h-4 w-4" />
            View CV
          </Button>
          <Button onClick={() => window.open('https://raw.githubusercontent.com/platonvin/platonvin.github.io/main/cv.pdf', '_blank')} className="bg-gradient-to-r from-pink-600 to-purple-600 text-white">
            <Download className="mr-2 h-4 w-4" />
            Download CV (PDF)
          </Button>
          <Button onClick={openFractalRenderer} className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white">
            <Sparkles className="mr-2 h-4 w-4" />
            (Fun button) Open Fractal Renderer
          </Button>
        </div>
      </div>
      <AnimatePresence>
        {showCV && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50"
            onClick={() => setShowCV(false)}
          >
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              className="relative w-full max-w-4xl max-h-[90vh] overflow-auto bg-white bg-opacity-80 backdrop-blur-md rounded-lg shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
                onClick={() => setShowCV(false)}
              >
                <X className="h-6 w-6" />
                <span className="sr-only">Close</span>
              </Button>
              <div className="p-8">
                <div className="prose max-w-none text-gray-800" dangerouslySetInnerHTML={{ __html: cvContent }} />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showFractal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
            onClick={() => setShowFractal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full h-full"
              onClick={(e) => e.stopPropagation()}
            >
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-4 right-4 text-white hover:text-gray-200 z-10"
                onClick={() => setShowFractal(false)}
              >
                <X className="h-6 w-6" />
                <span className="sr-only">Close</span>
              </Button>
              <canvas id="backgroundCanvas" className="w-full h-full" />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}