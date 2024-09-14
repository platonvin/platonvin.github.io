'use client'
import { useState, useEffect, useCallback, useRef } from 'react';
// import { ChevronUp, ChevronDown,  } from 'react-feather'; // Ensure you have these icons
import { ChevronUp, ChevronDown, X, FileText, Download, Github, Sparkles} from 'lucide-react'
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
// import { packWindows, Window, Position, Subcard, SPACING } from './your-utils'; // Adjust imports accordingly


type Subcard = {
  id: string
  title: string
  description: string
  problem: string
  solution: string
}

type Window = {
  id: string
  title: string
  githubLink: string
  screenshot?: string
  description: string
  subcards: Subcard[]
  width: number
  height: number
}

type Position = {
  x: number
  y: number
}

const SPACING = 22

function packWindows(windows: Window[], containerWidth: number): (Window & Position)[] {
  const packedWindows: (Window & Position)[] = []
  let maxHeight = 0

  windows.forEach((window) => {
    const bestPosition = findBestPosition(packedWindows, window, containerWidth)
    packedWindows.push({ ...window, ...bestPosition })
    // maxHeight = Math.max(maxHeight, bestPosition.y + window.height)
  })

  return packedWindows
}

function findBestPosition(packedWindows: (Window & Position)[], window: Window, containerWidth: number): Position {
  let bestPosition: Position = { x: 0, y: 0 }
  let minY = Infinity

  for (let x = SPACING; x <= containerWidth - window.width; x += SPACING) {
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
      position.x < packedWindow.x + packedWindow.width + SPACING &&
      packedWindow.x < position.x + window.width + SPACING
    const verticalOverlap =
      position.y < packedWindow.y + packedWindow.height + SPACING &&
      packedWindow.y < position.y + window.height + SPACING
    return horizontalOverlap && verticalOverlap
  })
}

function WindowComponent({ window, onExpand, isExpanded }: { window: Window & Position; onExpand: (id: string, expandedHeight: number) => void; isExpanded: boolean }) {
  const [areSubcardsOpen, setAreSubcardsOpen] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const subcardsContainerRef = useRef<HTMLDivElement>(null);

  const calculateExpandedHeight = useCallback(() => {
    console.log("expanded")
    if (!contentRef.current) return window.height;
  
    const contentHeight = contentRef.current.scrollHeight;
    const subcardsHeight = subcardsContainerRef.current?.scrollHeight || 0;
  
    return Math.max(contentHeight, window.height) + (areSubcardsOpen ? subcardsHeight : 0) + SPACING;
  }, [window.height, areSubcardsOpen]);

  const toggleSubcards = () => {
    setAreSubcardsOpen(prev => !prev);
  };

  useEffect(() => {
    if (isExpanded) {
      const expandedHeight = calculateExpandedHeight();
      onExpand(window.id, expandedHeight);
      // isExpanded = true
    }
  }, [isExpanded, areSubcardsOpen, calculateExpandedHeight, onExpand, window.id]);

  return (
    <div
      className="absolute bg-white border border-gray-300 rounded shadow overflow-hidden transition-all duration-300 ease-in-out"
      style={{
        left: window.x,
        top: window.y,
        width: window.width,
        height: window.height,
      }}
    >
      <div className="p-2 bg-gray-200 border-b border-gray-300 flex justify-between items-center">
        <h2 className="font-bold">{window.title}</h2>
        <a href={window.githubLink} target="_blank" rel="noopener noreferrer" className="text-gray-600 hover:text-gray-900">
          <Github className="w-5 h-5" />
        </a>
      </div>
      <div ref={contentRef} className="p-2">
        {window.screenshot && (
          <div className="relative w-full h-40 mb-2">
            <Image src={window.screenshot} alt={`Screenshot of ${window.title}`} layout="fill" objectFit="cover" />
          </div>
        )}
        <p className="text-sm mb-2">{window.description}</p>

        <button
          className="flex items-center justify-between w-full p-2 bg-gray-100 hover:bg-gray-200 rounded"
          onClick={toggleSubcards}
        >
          <span>Subcards ({window.subcards.length})</span>
          {areSubcardsOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {areSubcardsOpen && (
          <div ref={subcardsContainerRef} className="mt-2 space-y-2">
            {window.subcards.map((subcard) => (
              <Subcard key={subcard.id} subcard={subcard} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Subcard({ subcard }: { subcard: Subcard }) {
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleExpand = () => {
    setIsExpanded(prev => !prev);
  };

  return (
    <div 
      className="border rounded p-2 hover:bg-gray-50 transition-all duration-300 ease-in-out cursor-pointer" 
      onClick={toggleExpand}
    >
      <div className="flex justify-between items-center mb-1">
        <h3 className="font-semibold">{subcard.title}</h3>
        <button onClick={toggleExpand}>
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>
      <p className="text-sm text-gray-600">{subcard.description}</p>
      {isExpanded && (
        <div className="mt-2 space-y-2">
          <div>
            <h4 className="font-semibold text-sm">Problem:</h4>
            <p className="text-sm">{subcard.problem}</p>
          </div>
          <div>
            <h4 className="font-semibold text-sm">Solution:</h4>
            <p className="text-sm">{subcard.solution}</p>
          </div>
        </div>
      )}
    </div>
  );
}


export default function Page() {
  const [packedWindows, setPackedWindows] = useState<(Window & Position)[]>([]);
  const [containerWidth, setContainerWidth] = useState(0);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [showCV, setShowCV] = useState(false);
  const [showFractal, setShowFractal] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const updateSize = useCallback(() => {
    if (containerRef.current) {
      setContainerWidth(containerRef.current.offsetWidth);
    }
  }, []);

  useEffect(() => {
    window.addEventListener('resize', updateSize);
    updateSize();

    return () => window.removeEventListener('resize', updateSize);
  }, [updateSize]);

  const handleExpand = useCallback((id: string, height: number) => {
    setPackedWindows((prevWindows) => {
      const updatedWindows = prevWindows.map((window) => {
        if (window.id === id) {
          return { ...window, height: Math.max(window.height, height) };
        }
        return window;
      });
      return packWindows(updatedWindows, containerWidth);
    });
  }, [containerWidth]);

  useEffect(() => {
    if (containerWidth === 0) return;

    // Sample windows data
    const windows: Window[] = [
      {
        id: '1',
        title: 'Project Alpha',
        githubLink: 'https://github.com/example/alpha',
        screenshot: '/placeholder.svg?height=160&width=320',
        description: 'Description of Project Alpha',
        subcards: [
          { id: 'a1', title: 'Subcard A1', description: 'Description of A1', problem: 'Problem A1', solution: 'Solution A1' },
          { id: 'a2', title: 'Subcard A2', description: 'Description of A2', problem: 'Problem A2', solution: 'Solution A2' },
        ],
        width: 320,
        height: 400,
      },
      {
        id: '2',
        title: 'Project Beta',
        githubLink: 'https://github.com/example/beta',
        description: 'Streamlining workflows for maximum productivity.',
        subcards: [
          {
            id: 'b1',
            title: 'Module 1',
            description: 'Automated task management',
            problem: 'Manual assignment causing bottlenecks',
            solution: 'Developed AI-driven task allocation system'
          }
        ],
        width: 280,
        height: 350+100,
      },
      {
        id: '3',
        title: 'Project Gamma',
        githubLink: 'https://github.com/example/gamma',
        screenshot: '/placeholder.svg?height=160&width=320',
        description: 'Revolutionizing user interfaces with cutting-edge design.',
        subcards: [
          {
            id: 'g1',
            title: 'UI Component',
            description: 'Adaptive color scheme',
            problem: 'Poor accessibility in varying light conditions',
            solution: 'Implemented dynamic contrast adjustment based on ambient light'
          },
          {
            id: 'g2',
            title: 'Animation System',
            description: 'Fluid micro-interactions',
            problem: 'Jerky transitions on low-end devices',
            solution: 'Optimized animation pipeline for consistent performance across devices'
          }
        ],
        width: 320,
        height: 420+100,
      },
      {
        id: '4',
        title: 'Project Gamma',
        githubLink: 'https://github.com/example/gamma',
        screenshot: '/placeholder.svg?height=160&width=320',
        description: 'Revolutionizing user interfaces with cutting-edge design.',
        subcards: [
          {
            id: 'e1',
            title: 'UI Component',
            description: 'Adaptive color scheme',
            problem: 'Poor accessibility in varying light conditions',
            solution: 'Implemented dynamic contrast adjustment based on ambient light'
          },
          {
            id: 'e2',
            title: 'Animation System',
            description: 'Fluid micro-interactions',
            problem: 'Jerky transitions on low-end devices',
            solution: 'Optimized animation pipeline for consistent performance across devices'
          }
        ],
        width: 320,
        height: 420+100,
      },
      {
        id: '5',
        title: 'Project Gamma',
        githubLink: 'https://github.com/example/gamma',
        screenshot: '/placeholder.svg?height=160&width=320',
        description: 'Revolutionizing user interfaces with cutting-edge design.',
        subcards: [
          {
            id: 'f1',
            title: 'UI Component',
            description: 'Adaptive color scheme',
            problem: 'Poor accessibility in varying light conditions',
            solution: 'Implemented dynamic contrast adjustment based on ambient light'
          },
          {
            id: 'f2',
            title: 'Animation System',
            description: 'Fluid micro-interactions',
            problem: 'Jerky transitions on low-end devices',
            solution: 'Optimized animation pipeline for consistent performance across devices'
          }
        ],
        width: 320,
        height: 420+100,
      }
    ]

    // Adjust window sizes for mobile
    const isMobile = containerWidth < 768;
    const adjustedWindows = windows.map(window => ({
      ...window,
      width: isMobile ? Math.min(window.width, containerWidth - SPACING * 2) : window.width,
    }));

    setPackedWindows(packWindows(adjustedWindows, containerWidth));
  }, [containerWidth]);

  const toggleTheme = () => {
    setIsDarkMode(prevMode => !prevMode);
  };

  const openFractalRenderer = () => {
    setShowFractal(true);
  };

  return (
    <div ref={containerRef} className={`relative w-full h-screen overflow-auto ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-gradient-to-br from-blue-100 via-purple-100 to-pink-100'}`}>
      <div className="p-4">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600">My Projects Showcase</h1>
          <button
            onClick={toggleTheme}
            className="px-4 py-2 bg-gray-200 text-black rounded dark:bg-gray-700 dark:text-white"
          >
            {isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          </button>
        </div>
        <div className="flex flex-wrap gap-4 mb-4">
          <button onClick={() => setShowCV(true)} className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 py-2 rounded">
            <FileText className="inline mr-2" /> View CV
          </button>
          <button onClick={() => window.open('https://raw.githubusercontent.com/platonvin/platonvin.github.io/main/cv.pdf?v=1', '_blank')} className="bg-gradient-to-r from-pink-600 to-purple-600 text-white px-4 py-2 rounded">
            <Download className="inline mr-2" /> Download CV (PDF)
          </button>
          <button onClick={openFractalRenderer} className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white px-4 py-2 rounded">
            <Sparkles className="inline mr-2" /> (Fun button) Open Fractal Renderer
          </button>
        </div>
      </div>
      {packedWindows.map((window) => (
        <WindowComponent
          key={window.id}
          window={window}
          onExpand={handleExpand}
          isExpanded={window.height > 200}
        />
      ))}
      <AnimatePresence>
        {showCV && (
          <motion.div
            className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowCV(false)}
          >
            <div className="bg-white p-6 rounded shadow-lg" onClick={(e) => e.stopPropagation()}>
              <h2 className="text-2xl font-bold mb-4">CV</h2>
              <iframe src="https://raw.githubusercontent.com/platonvin/platonvin.github.io/main/cv.pdf?v=1" className="w-full h-96" />
              <button onClick={() => setShowCV(false)} className="mt-4 px-4 py-2 bg-gray-200 text-black rounded">
                Close
              </button>
            </div>
          </motion.div>
        )}
        {showFractal && (
          <motion.div
            className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowFractal(false)}
          >
            <div className="bg-white p-6 rounded shadow-lg" onClick={(e) => e.stopPropagation()}>
              <h2 className="text-2xl font-bold mb-4">Fractal Renderer</h2>
              {/* Your fractal renderer component here */}
              <button onClick={() => setShowFractal(false)} className="mt-4 px-4 py-2 bg-gray-200 text-black rounded">
                Close
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}