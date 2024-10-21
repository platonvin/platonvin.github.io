'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import Image from 'next/image'
import { ChevronDown, ChevronUp, Github, /*Sparkles,*/ Download, FileText, X } from 'lucide-react'
// import { debug } from 'console'
import { initFractalRenderer, stopFractalRenderer } from '@/lib/fractalRenderer'
import { Button } from "@/components/ui/button"
import { motion, AnimatePresence } from 'framer-motion'
import { /*Subcard,*/ Window, Position, windows } from "@/lib/windows"
import CV from '../components/CV/CV';

const SPACING = +12
const SCALE_GENERAL = 1.0;
const SCALE_SPECIAL = 1.01;

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
  // const [isImageHovered, setIsImageHovered] = useState(false)
  const contentRef = useRef<HTMLDivElement>(null)
  const subcardRefs = useRef<{ [key: number]: HTMLDivElement | null }>({})

  const calculateExpandedHeight = useCallback(() => {
    if (!contentRef.current) {
      console.log("!contentRef.current")
      return -1
    }

    // const contentHeight = contentRef.current.scrollHeight;

    const subcardsTotalHeight = window.subcards.reduce((total, subcard, index) => {
      const subcardEl = subcardRefs.current[index];
      // console.log(index, "subcardEl?.scrollHeight", subcardEl?.scrollHeight)
      return total + (subcardEl ? subcardEl.scrollHeight : 0);
    }, 0);

    return (subcardsTotalHeight + window.baseHeight) * SCALE_SPECIAL + 1; // +1 to open them and actually calculate size. *SCALE_GENERAL to cover scale
  }, [window.baseHeight, window.subcards, openSubcardIds]);

  const toggleSubcards = () => {
    if (isExpanded) {
      setOpenSubcardIds(new Set())
      onExpand(window.id, window.baseHeight)
    } else {
      // for open-all-initially
      // const newOpenSubcardIds = new Set(window.subcards.map((subcard, index) => index))
      // setOpenSubcardIds(newOpenSubcardIds)
      // for open-none-initially
      setOpenSubcardIds(new Set())
      const expandedHeight = calculateExpandedHeight()
      onExpand(window.id, expandedHeight)
    }
  }

  const toggleSubcard = (index: number) => {
    // console.log("index", index)

    // console.log("PREV")
    // var expandedHeight = calculateExpandedHeight()
    // console.log("expandedHeight", expandedHeight)
    // console.log("window.baseHeight", window.baseHeight)
    onExpand(window.id, Math.ceil(window.expandedHeight))
    // var expandedHeight = calculateExpandedHeight()
    // console.log("expandedHeight", expandedHeight)
    // console.log("ENDPREV")
    // expandedHeight = calculateExpandedHeight()
    // onExpand(window.id, expandedHeight)

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
    <motion.div
      className={`absolute border rounded-xl shadow-lg overflow-hidden transition-all duration-500 ease-in-out ${isDarkMode
        ? 'bg-gradient-to-br from-gray-800 to-gray-900 border-gray-700'
        : 'bg-gradient-to-br from-white to-gray-100 border-gray-200'
        }`}
      style={{
        left: Math.ceil(window.x),
        top: Math.ceil(window.y),
        width: Math.ceil(window.baseWidth),
        height: Math.ceil(isExpanded ? window.expandedHeight : window.baseHeight),
        // willChange: 'transform',  // optimize for scaling
      }}
      whileHover={{ scale: SCALE_GENERAL, boxShadow: '0 10px 30px rgba(0,0,0,0.2)' }}
    >
      <div
        className={`p-3 rounded-t-xl flex justify-between items-center ${isDarkMode
          ? 'bg-gradient-to-r from-purple-400 to-pink-500 text-transparent bg-clip-text'
          : 'bg-gradient-to-r from-purple-900 to-indigo-900 text-transparent bg-clip-text'
          }`}
      >
        <h2 className="font-bold text-lg">{window.title}</h2>
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

        {window.image && !window.video && (
          <div className="mb-4">
            <Image
              src={window.image}
              alt={`${window.title} preview`}
              width={Math.ceil(window.baseWidth-30)}
              height={Math.ceil(window.baseHeight-30)}
              quality={100}
              className="rounded-lg object-cover"
            />
          </div>
        )}
        
        {window.video && (
          <div className="mb-4">
            <video
              // preload = {true}
              width={Math.ceil(window.baseWidth-30)}
              height={Math.ceil(window.baseHeight-30)}
              className="rounded-lg object-cover"
              // style={{ willChange: 'transform' }} // optimize
              autoPlay={true}
              muted
              controls
              preload='true'
              loop
            >
              <source src={window.video} type="video/webm" />
              Your browser does not support the video tag.
            </video>
          </div>
        )}

        {window.subcards.length > 0 && (
          <motion.button
            className={`flex items-center justify-between w-full p-3 rounded-md transition-all ${isDarkMode
              ? 'bg-gradient-to-r from-gray-700 to-gray-800 hover:from-gray-600 hover:to-gray-700 text-gray-300'
              : 'bg-gradient-to-r from-gray-100 to-gray-200 hover:from-gray-200 hover:to-gray-300 text-gray-700'
              }`}
            onClick={toggleSubcards}
            whileHover={{ scale: SCALE_SPECIAL }}
            whileTap={{ scale: 1.03 }}
          >
            <span>Show details</span>
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </motion.button>
        )}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-2 space-y-2"
            >
              {window.subcards.map((subcard, index) => (
                <motion.div
                  key={index}
                  ref={(el) => {
                    if (el) subcardRefs.current[index] = el;
                  }}
                  className={`border rounded p-2 cursor-pointer transition-all ${isDarkMode
                    ? 'border-gray-600 hover:bg-gray-700 text-gray-300'
                    : 'border-gray-200 hover:bg-gray-50 text-gray-600'
                    }`}
                  onClick={() => toggleSubcard(index)}
                  whileHover={{ scale: SCALE_SPECIAL }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="flex justify-between items-center mb-1">
                    <h3 className="font-semibold">{subcard.title}</h3>
                    {openSubcardIds.has(index) ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </div>
                  {subcard.description && <p className="text-sm">{subcard.description}</p>}
                  {openSubcardIds.has(index) && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-2 space-y-2"
                    >
                      {subcard.image && (
                        <div className="mb-2">
                          <Image
                            src={subcard.image}
                            alt={`${subcard.title} preview`}
                            width={400}
                            height={200}
                            className="rounded-lg object-cover"
                          />
                        </div>
                      )}
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
                    </motion.div>
                  )}
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}

function FractalWindowComponent({ window, isDarkMode }: { window: Window & Position; isDarkMode: boolean }) {
  const [isExpanded, setIsExpanded] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (isExpanded && canvasRef.current) {
      initFractalRenderer(canvasRef.current)
    }
    return () => {
      stopFractalRenderer()
    }
  }, [isExpanded])

  const toggleExpand = () => {
    setIsExpanded(!isExpanded)
  }

  return (
    <motion.div
      className={`absolute border rounded-xl shadow-lg overflow-hidden transition-all duration-500 ease-in-out ${isDarkMode
        ? 'bg-gradient-to-br from-gray-800 to-gray-900 border-gray-700'
        : 'bg-gradient-to-br from-white to-gray-100 border-gray-200'
        }`}
      style={{
        left: Math.ceil(window.x),
        top: Math.ceil(window.y),
        width: Math.ceil(window.baseWidth),
        height: Math.ceil(isExpanded ? window.expandedHeight : window.baseHeight),
        // backgroundColor: "rgba(1,1,1,0)"
      }}
      whileHover={{ scale: SCALE_SPECIAL, boxShadow: '0 10px 30px rgba(0,0,0,0.2)' }}
    >
      <div
        className={`p-3 rounded-t-xl flex justify-between items-center ${isDarkMode
          ? 'bg-gradient-to-r from-purple-400 to-pink-500 text-transparent bg-clip-text'
          : 'bg-gradient-to-r from-purple-900 to-indigo-900 text-transparent bg-clip-text'
          }`}
      >
        <h2 className="font-bold text-lg">{window.title}</h2>
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleExpand}
          className={`transition-all ${isDarkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-600 hover:text-gray-900'}`}
        >
          {isExpanded ? <ChevronUp className="w-16 h-16" /> : <ChevronDown className="w-16 h-16" />}
        </Button>
      </div>
      <div className={`p-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
        <p className="text-sm m-4 font-light">{window.description}</p>
        {isExpanded && (
          <canvas
            ref={canvasRef}
            className="w-full h-[385px]"
          />
        )}
      </div>
    </motion.div>
  )
}

export default function Page() {
  const [packedWindows, setPackedWindows] = useState<(Window & Position)[]>([])
  const [containerWidth, setContainerWidth] = useState(0)
  const [showCV, setShowCV] = useState(false)
  const [showFractal, setShowFractal] = useState(false)
  const [isDarkMode, setIsDarkMode] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null)

  // const openFractalRenderer = () => {
  //   setShowFractal(true)
  // }

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

  // const allWindows = windows
  const allWindows = useMemo(() => [
    ...windows,
    { //unique one
      id: windows.length + 1,
      title: "Fractal Renderer",
      description: "WebGL Julia Set renderer",
      githubLink: 'https://github.com/platonvin/platonvin.github.io',
      baseWidth: 602,
      baseHeight: 151,
      expandedHeight: 500,
      subcards: [],
    }
  ], [])

  useEffect(() => {
    if (containerWidth === 0) return

    const isMobile = containerWidth < 768
    const adjustedWindows = allWindows.map(window => ({
      ...window,
      width: isMobile ? Math.min(window.baseWidth, containerWidth - SPACING * 2) : window.baseWidth,
    }))

    setPackedWindows(packWindows(adjustedWindows, containerWidth))
  }, [containerWidth])

  // const maxHeight = Math.max(...packedWindows.map(w => w.y + (w.expandedHeight || w.baseHeight)), 0)

  return (
    <div
      ref={containerRef}
      className={`overflow-y-auto overflow-x-hidden transition-all duration-500 ease-in-out ${isDarkMode
        ? "bg-gradient-to-br from-gray-900 via-purple-950 to-indigo-950 text-white"
        : "bg-gradient-to-br from-purple-100 via-pink-200 to-indigo-100 text-black"
        }`}
        style={{
          minHeight: "100%", // Allow the content to dynamically expand
          display: "flex",
          flexDirection: "column",
        }}
    >
      <motion.div
        className="flex p-3"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1
          className={`mr-10 text-4xl font-bold bg-clip-text transition-all duration-500 ease-in-out ${isDarkMode
            ? "text-transparent bg-gradient-to-r from-purple-400 to-pink-600"
            : "text-transparent bg-gradient-to-r from-purple-600 to-pink-600"
            }`}
        >
          My Projects
        </h1>
        <div className="gap-4 flex items-center">
          <Button
            onClick={() => setShowCV(true)}
            className={`w-full sm:w-auto transition-all duration-500 ${isDarkMode
              ? "bg-gradient-to-r from-purple-700 to-indigo-700 text-white hover:from-purple-600 hover:to-indigo-600"
              : "bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-500 hover:to-pink-500"
              }`}
          >
            <FileText className="mr-2 h-4 w-4" />
            View my CV (short)
          </Button>
          <Button
            onClick={() =>
              window.open(
                "https://raw.githubusercontent.com/platonvin/platonvin.github.io/main/cv.pdf?v=1",
                "_blank"
              )
            }
            className={`w-full sm:w-auto transition-all duration-500 ${isDarkMode
              ? "bg-gradient-to-r from-indigo-700 to-purple-700 text-white hover:from-indigo-600 hover:to-purple-600"
              : "bg-gradient-to-r from-pink-600 to-purple-600 text-white hover:from-pink-500 hover:to-purple-500"
              }`}
          >
            <Download className="mr-2 h-4 w-4" />
            Download my CV (PDF, detailed)
          </Button>
          <Button
            onClick={toggleTheme}
            className={`px-4 py-2 rounded transition-all duration-500 ${isDarkMode
              ? "bg-gradient-to-r from-gray-700 to-gray-600 text-white hover:from-gray-600 hover:to-gray-500"
              : "bg-gradient-to-r from-gray-200 to-gray-100 text-black hover:from-gray-300 hover:to-gray-200"
              }`}
          >
            {isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
          </Button>
        </div>
      </motion.div>
      <div className={`relative p-1 ${isDarkMode ? "text-white" : "text-black"}`}>
        {packedWindows.map((window) =>
          // window.title === "Fractal Renderer" ? (
          window.id === (windows.length + 1) ? (
            <FractalWindowComponent
              key={window.id}
              window={window}
              isDarkMode={isDarkMode}
            />
          ) : (
            <WindowComponent
              key={window.id}
              window={window}
              onExpand={handleExpand}
              isExpanded={window.expandedHeight > window.baseHeight}
              isDarkMode={isDarkMode}
            />
          )
        )}
      </div>
      <AnimatePresence>
        {showFractal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black"
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
      <AnimatePresence>
        {showCV && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-25"
            onClick={() => setShowCV(false)}
          >
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              className={`relative w-full max-w-4xl max-h-[90vh] overflow-auto backdrop-blur-3xl rounded-lg shadow-xl ${isDarkMode ? 'bg-white bg-opacity-10 text-slate-300' : 'bg-white bg-opacity-10 text-slate-950'
                }`}
              onClick={(e) => e.stopPropagation()}
            >
              <Button
                variant="ghost"
                size="icon"
                className={`absolute top-4 right-4${isDarkMode ? 'text-white' : 'text-black'
                  }`}
                onClick={() => setShowCV(false)}
              >
                <X className="h-6 w-6 " />
                <span className="sr-only">Close</span>
              </Button>
              <div>
                <CV />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}