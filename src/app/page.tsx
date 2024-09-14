'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Image from 'next/image'
import { ChevronDown, ChevronUp, Github } from 'lucide-react'

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
    maxHeight = Math.max(maxHeight, bestPosition.y + window.height)
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

function WindowComponent({ window, onExpand, isExpanded }: { window: Window & Position; onExpand: (id: string, height: number) => void; isExpanded: boolean }) {
  const [openSubcardIds, setOpenSubcardIds] = useState<Set<string>>(new Set())
  const contentRef = useRef<HTMLDivElement>(null)
  const subcardRefs = useRef<{ [key: string]: HTMLDivElement | null }>({})

  const calculateHeight = useCallback(() => {
    if (!contentRef.current) return window.height;
  
    const contentHeight = contentRef.current.scrollHeight;
  
    const subcardsTotalHeight = window.subcards.reduce((total, subcard) => {
      const subcardEl = subcardRefs.current[subcard.id];
      console.log(openSubcardIds.has(subcard.id))
      console.log(subcardEl?.scrollHeight)
      return total + (openSubcardIds.has(subcard.id) && subcardEl ? subcardEl.scrollHeight : 0);
    }, 0);
  
    return contentHeight + subcardsTotalHeight + SPACING; // Adding spacing for clarity
  }, [window.height, window.subcards, openSubcardIds]);

  const toggleSubcards = () => {
    if (isExpanded) {
      setOpenSubcardIds(new Set())
      onExpand(window.id, window.height)
    } else {
      const newOpenSubcardIds = new Set(window.subcards.map(subcard => subcard.id))
      // setOpenSubcardIds(new Set())
      setOpenSubcardIds(newOpenSubcardIds)
      const expandedHeight = calculateHeight()
      onExpand(window.id, expandedHeight)
    }
  }

  const toggleSubcard = (id: string) => {
    setOpenSubcardIds(prev => {
      const newSet = new Set(prev)
      if (newSet.has(id)) {
        newSet.delete(id)
      } else {
        newSet.add(id)
      }
      return newSet
    })
  }

  useEffect(() => {
    if (isExpanded) {
      const expandedHeight = calculateHeight()
      onExpand(window.id, expandedHeight)
    }
  }, [isExpanded, openSubcardIds, calculateHeight, onExpand, window.id])

  return (
    <div
      className="absolute bg-white border border-gray-300 rounded shadow overflow-hidden transition-all duration-300 ease-in-out"
      style={{
        left: window.x,
        top: window.y,
        width: window.width,
        height: isExpanded ? 'auto' : window.height, // Set height based on expansion
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
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
        {isExpanded && (
          <div className="mt-2 space-y-2">
            {window.subcards.map((subcard) => (
              <div 
                key={subcard.id} 
                ref={(el) => {
                  if (el) subcardRefs.current[subcard.id] = el;
                }}
                className="border rounded p-2 cursor-pointer hover:bg-gray-50"
                onClick={() => toggleSubcard(subcard.id)}
              >
                <div className="flex justify-between items-center mb-1">
                  <h3 className="font-semibold">{subcard.title}</h3>
                  {openSubcardIds.has(subcard.id) ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </div>
                <p className="text-sm text-gray-600">{subcard.description}</p>
                {openSubcardIds.has(subcard.id) && (
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
  const containerRef = useRef<HTMLDivElement>(null)

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

  const handleExpand = useCallback((id: string, height: number) => {
    setPackedWindows((prevWindows) => {
      const updatedWindows = prevWindows.map((window) => {
        if (window.id === id) {
          return { ...window, height }
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
    const isMobile = containerWidth < 768
    const adjustedWindows = windows.map(window => ({
      ...window,
      width: isMobile ? Math.min(window.width, containerWidth - SPACING * 2) : window.width,
    }))

    setPackedWindows(packWindows(adjustedWindows, containerWidth))
  }, [containerWidth])


  return (
    <div ref={containerRef} className="relative w-full h-screen overflow-auto">
      {packedWindows.map((window) => (
        <WindowComponent
          key={window.id}
          window={window}
          onExpand={handleExpand}
          isExpanded={window.height > 200}
        />
      ))}
    </div>
  )
}