'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import Image from 'next/image'
import { ChevronDown, ChevronUp, Github, Sparkles, Download, FileText, X } from 'lucide-react'
import { debug } from 'console'
import { initFractalRenderer, stopFractalRenderer } from '@/lib/fractalRenderer'
import { Button } from "@/components/ui/button"
import { motion, AnimatePresence } from 'framer-motion'

interface Subcard {
  title: string;
  description?: string;
  problem?: string;
  solution?: string;
}
type Window = {
  id: number
  title: string
  githubLink: string
  screenshot?: string
  description: string
  subcards: Subcard[]
  baseWidth: number //specified
  baseHeight: number //specified
  expandedHeight: number //calculated
}

type Position = {
  x: number
  y: number
}

const SPACING = +12

function packWindows(windows: Window[], containerWidth: number): (Window & Position)[] {
  const packedWindows: (Window & Position)[] = []
  let maxHeight = 0

  windows.forEach((window) => {
    const bestPosition = findBestPosition(packedWindows, window, containerWidth)
    packedWindows.push({ ...window, ...bestPosition })
    maxHeight = Math.max(maxHeight, bestPosition.y + (window.baseHeight))
  })

  return packedWindows
}

function findBestPosition(packedWindows: (Window & Position)[], window: Window, containerWidth: number): Position {
  let bestPosition: Position = { x: 0, y: 0 }
  let minY = Infinity

  // to have arbitrary point as "attractor", change to actual distance calculation or smth 
  for (let x = SPACING; x <= containerWidth - window.baseWidth; x += SPACING) {
    let y = SPACING
    while (true) {
      const position = { x, y }
      if (isValidPosition(packedWindows, window, position)) {
        if (y < minY) {
          minY = y
          bestPosition = position
        }
        break
      }
      y += SPACING
    }
  }

  return bestPosition
}

function isValidPosition(packedWindows: (Window & Position)[], window: Window, position: Position): boolean {
  return !packedWindows.some((packedWindow) => {
    const horizontalOverlap =
      position.x < packedWindow.x + packedWindow.baseWidth + SPACING &&
      packedWindow.x < position.x + window.baseWidth + SPACING
    const verticalOverlap =
      position.y < packedWindow.y + (packedWindow.expandedHeight || packedWindow.baseHeight) + SPACING &&
      packedWindow.y < position.y + (window.expandedHeight || window.baseHeight) + SPACING
    return horizontalOverlap && verticalOverlap
  })
}

function WindowComponent({ window, onExpand, isExpanded, isDarkMode }: {
  window: Window & Position;
  onExpand: (id: number, expandedHeight: number) => void;
  isExpanded: boolean;
  isDarkMode: boolean;
}) {
  const [openSubcardIds, setOpenSubcardIds] = useState<Set<number>>(new Set())
  const [isImageHovered, setIsImageHovered] = useState(false)
  const contentRef = useRef<HTMLDivElement>(null)
  const subcardRefs = useRef<{ [key: number]: HTMLDivElement | null }>({})

  const calculateExpandedHeight = useCallback(() => {
    if (!contentRef.current) {
      console.log("!contentRef.current")
      return -1
    }

    const contentHeight = contentRef.current.scrollHeight;

    const subcardsTotalHeight = window.subcards.reduce((total, subcard, index) => {
      const subcardEl = subcardRefs.current[index];
      return total + (subcardEl ? subcardEl.scrollHeight : 0);
    }, 0);

    return (subcardsTotalHeight + window.baseHeight)*1.02 + 1; // +1 to open them and actually calculate size. *1.02 to cover scale
  }, [window.baseHeight, window.subcards, openSubcardIds]);

  const toggleSubcards = () => {
    if (isExpanded) {
      setOpenSubcardIds(new Set())
      onExpand(window.id, window.baseHeight)
    } else {
      setOpenSubcardIds(new Set())
      const expandedHeight = calculateExpandedHeight()
      onExpand(window.id, expandedHeight)
    }
  }

  const toggleSubcard = (index: number) => {
    setOpenSubcardIds(prev => {
      const newSet = new Set(prev)
      if (newSet.has(index)) {
        newSet.delete(index)
      } else {
        newSet.add(index)
      }
      return newSet
    })
  }

  useEffect(() => {
    if (isExpanded) {
      const expandedHeight = calculateExpandedHeight()
      onExpand(window.id, expandedHeight)
    }
  }, [isExpanded, openSubcardIds, calculateExpandedHeight, onExpand, window.id])

  return (
    <div
      className={`absolute border rounded-xl shadow-lg overflow-hidden hover:shadow-xl hover:scale-[1.02] transition-all duration-500 ease-in-out ${
        isDarkMode
          ? 'bg-gray-800 border-gray-700'
          : 'bg-white/80 border-gray-200'
      }`}
      style={{
        left: window.x,
        top: window.y,
        width: window.baseWidth,
        height: isExpanded ? window.expandedHeight : window.baseHeight,
      }}
    >
      <div
        className={`p-3 rounded-t-xl flex justify-between items-center shadow-md ${
          isDarkMode
            ? 'bg-gradient-to-r from-gray-900 to-gray-800 text-gray-100'
            : 'bg-gradient-to-r from-gray-50 to-white text-gray-900'
        }`}
      >
        <h2 className={`font-semibold ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>
          {window.title}
        </h2>
        <a
          href={window.githubLink}
          target="_blank"
          rel="noopener noreferrer"
          className={`transition-all ${isDarkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-600 hover:text-gray-900'}`}
        >
          <Github className="w-6 h-6" />
        </a>
      </div>
      <div
        ref={contentRef}
        className={`p-4 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}
      >
        <p className="text-sm mb-2 font-light">{window.description}</p>
  
        <button
          className={`flex items-center justify-between w-full p-3 rounded-md transition-all ${
            isDarkMode
              ? 'bg-gray-700 hover:bg-gray-600 text-gray-300'
              : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
          }`}
          onClick={toggleSubcards}
        >
          <span>Subcards ({window.subcards.length})</span>
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
        {isExpanded && (
          <div className="mt-2 space-y-2">
            {window.subcards.map((subcard, index) => (
              <div
                key={index}
                ref={(el) => {
                  if (el) subcardRefs.current[index] = el;
                }}
                className={`border rounded p-2 cursor-pointer transition-all ${
                  isDarkMode
                    ? 'border-gray-600 hover:bg-gray-700 text-gray-300'
                    : 'border-gray-200 hover:bg-gray-50 text-gray-600'
                }`}
                onClick={() => toggleSubcard(index)}
              >
                <div className="flex justify-between items-center mb-1">
                  <h3 className="font-semibold">{subcard.title}</h3>
                  {openSubcardIds.has(index) ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </div>
                {subcard.description && <p className="text-sm">{subcard.description}</p>}
                {openSubcardIds.has(index) && (
                  <div className="mt-2 space-y-2">
                    {subcard.problem && (
                      <div>
                        <h4 className="font-semibold text-sm">Problem:</h4>
                        <p className="text-sm">{subcard.problem}</p>
                      </div>
                    )}
                    {subcard.solution && (
                      <div>
                        <h4 className="font-semibold text-sm">Solution:</h4>
                        <p className="text-sm">{subcard.solution}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default function Page() {
  const [packedWindows, setPackedWindows] = useState<(Window & Position)[]>([])
  const [containerWidth, setContainerWidth] = useState(0)
  const [showCV, setShowCV] = useState(false)
  const [showFractal, setShowFractal] = useState(false)
  const [isDarkMode, setIsDarkMode] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null)

  const openFractalRenderer = () => {
    setShowFractal(true)
  }

  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        stopFractalRenderer();
        setShowFractal(false);
      }
    }
    //its fine stopFractal is just bool=false
    window.addEventListener('keydown', handleEsc)

    if (showFractal) {
      const canvas = document.getElementById('backgroundCanvas') as HTMLCanvasElement;
      if (canvas) {
        initFractalRenderer(canvas);
      }
    }

    return () => {
      stopFractalRenderer();
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

  const updateSize = useCallback(() => {
    if (containerRef.current) {
      setContainerWidth(containerRef.current.offsetWidth)
    }
  }, [])

  useEffect(() => {
    window.addEventListener('resize', updateSize)
    updateSize()

    return () => window.removeEventListener('resize', updateSize)
  }, [updateSize])

  const handleExpand = useCallback((id: number, expandedHeight: number) => {
    setPackedWindows((prevWindows) => {
      const updatedWindows = prevWindows.map((window) => {
        if (window.id === id) {
          return { ...window, expandedHeight: expandedHeight }
        }
        return window
      })
      return packWindows(updatedWindows, containerWidth)
    })
  }, [containerWidth])
  
  useEffect(() => {
    if (containerWidth === 0) return
    
    // Sample windows data
    const windows: Window[] = [
      {
        id: 1,
        title: 'Lum',
        githubLink: 'https://github.com/platonvin/lum',
        description: 'Voxel engine/renderer',
        // details: 'written with focus on low-end devices',
        baseWidth: 550,
        baseHeight: 200,
        expandedHeight: 0,
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
        description: 'Manga-style renderer',
        // details: 'Manga-style renderer, written with Lum-al',
        baseWidth: 250,
        baseHeight: 190,
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
        description: 'multithreaded SIMD Raytracer for Voxel Engines',
        // details: 'C99 sse4 + pthreads CPU grid-aligned voxel raytracer created for internal needs of Lum engine',
        baseWidth: 300,
        baseHeight: 200,
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
        description: 'CPU emulator',
        // details: 'custom instruction set, registers, memory, visual output, and assembly language with CPU emulator for them. Developed for greater real-world CPU understanding',
        baseWidth: 200,
        baseHeight: 200,
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
        baseHeight: 200,
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
    ]

    // Adjust window sizes for mobile
    const isMobile = containerWidth < 768
    const adjustedWindows = windows.map(window => ({
      ...window,
      width: isMobile ? Math.min(window.baseWidth, containerWidth - SPACING * 2) : window.baseWidth,
    }))

    setPackedWindows(packWindows(adjustedWindows, containerWidth))
  }, [containerWidth])

  const maxHeight = Math.max(...packedWindows.map(w => w.y + (w.expandedHeight || w.baseHeight)), 0)

  return (
    <div
      ref={containerRef}
      className={`overflow-y-auto transition-transform duration-500 ease-in-out ${isDarkMode
        ? "bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white"
        : "bg-gradient-to-br from-purple-100 via-red-200 to-pink-100 text-black"
        }`}
      style={{
        minHeight: "100vh",
        // height: `${maxHeight + 20}px`,
      }}
    >
      <div className="flex p-3">
        <h1
          className={`mr-10 text-4xl font-bold bg-clip-text transition-transform duration-500 ease-in-out ${isDarkMode
            ? "text-transparent bg-gradient-to-r from-gray-400 to-gray-600"
            : "text-transparent bg-gradient-to-r from-purple-600 to-pink-600"
            }`}
        >
          My Projects Showcase
        </h1>
        <div className="gap-4 flex items-center">
          <Button
            onClick={() => setShowCV(true)}
            className={`w-full sm:w-auto transition-colors duration-500 ${isDarkMode
              ? "bg-gradient-to-r from-gray-700 to-gray-500 text-white"
              : "bg-gradient-to-r from-purple-600 to-pink-600 text-white"
              }`}
          >
            <FileText className="mr-2 h-4 w-4" />
            View CV
          </Button>
          <Button
            onClick={() =>
              window.open(
                "https://raw.githubusercontent.com/platonvin/platonvin.github.io/main/cv.pdf?v=1",
                "_blank"
              )
            }
            className={`w-full sm:w-auto transition-colors duration-500 ${isDarkMode
              ? "bg-gradient-to-r from-gray-700 to-gray-500 text-white"
              : "bg-gradient-to-r from-pink-600 to-purple-600 text-white"
              }`}
          >
            <Download className="mr-2 h-4 w-4" />
            Download CV (PDF)
          </Button>
          <Button
            onClick={openFractalRenderer}
            className={`w-full sm:w-auto transition-colors duration-500 ${isDarkMode
              ? "bg-gradient-to-r from-gray-700 to-gray-500 text-white"
              : "bg-gradient-to-r from-blue-600 to-cyan-600 text-white"
              }`}
          >
            <Sparkles className="mr-2 h-4 w-4" />
            (Fun button) Open Fractal Renderer
          </Button>
          <Button
            onClick={toggleTheme}
            className={`px-4 py-2 rounded transition-colors duration-500 ${isDarkMode
              ? "bg-gray-700 text-white hover:bg-gray-600"
              : "bg-gray-200 text-black hover:bg-gray-300"
              }`}
          >
            {isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
          </Button>
        </div>
      </div>
      <div className={`relative p-1 ${isDarkMode ? "text-white" : "text-black"}`}>
        {packedWindows.map((window) => (
          <WindowComponent
            key={window.id}
            window={window}
            onExpand={handleExpand}
            isExpanded={window.expandedHeight > window.baseHeight}
            isDarkMode={isDarkMode}
          />
        ))}
      </div>
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
  );
}