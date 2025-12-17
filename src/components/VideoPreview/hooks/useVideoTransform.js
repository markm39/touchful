import { useState, useCallback, useEffect } from 'react'

/**
 * Hook to manage video transform (scale, position, stretch) with drag handling
 * Accepts external state for sharing with export
 */
export function useVideoTransform(containerRef, videoTransform, setVideoTransform) {
  const [editMode, setEditMode] = useState(null) // null, 'resize'
  const [isDragging, setIsDragging] = useState(false)
  const [dragHandle, setDragHandle] = useState(null)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0, transform: null })
  const [snapGuides, setSnapGuides] = useState({ h: false, v: false })

  const handleDragStart = useCallback((handle, e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
    setDragHandle(handle)
    setDragStart({
      x: e.clientX,
      y: e.clientY,
      transform: { ...videoTransform }
    })
  }, [videoTransform])

  const handleDragMove = useCallback((e) => {
    if (!isDragging || !dragStart.transform) return

    const container = containerRef.current
    if (!container) return

    const rect = container.getBoundingClientRect()
    const dx = (e.clientX - dragStart.x) / rect.width * 100
    const dy = (e.clientY - dragStart.y) / rect.height * 100

    if (dragHandle === 'move') {
      let newX = dragStart.transform.x + dx * 2
      let newY = dragStart.transform.y + dy * 2

      // Snap to center
      const snapThreshold = 5
      const guides = { h: false, v: false }

      if (Math.abs(newX) < snapThreshold) {
        newX = 0
        guides.v = true
      }
      if (Math.abs(newY) < snapThreshold) {
        newY = 0
        guides.h = true
      }

      setSnapGuides(guides)
      setVideoTransform(prev => ({ ...prev, x: newX, y: newY }))
    } else if (dragHandle) {
      // Resize - calculate scale delta based on handle direction
      let scaleDelta = 0

      switch (dragHandle) {
        case 'br':
          scaleDelta = (dx + dy) * 0.01
          break
        case 'tl':
          scaleDelta = (-dx - dy) * 0.01
          break
        case 'tr':
          scaleDelta = (dx - dy) * 0.01
          break
        case 'bl':
          scaleDelta = (-dx + dy) * 0.01
          break
        case 't':
          scaleDelta = -dy * 0.02
          break
        case 'b':
          scaleDelta = dy * 0.02
          break
        case 'l':
          scaleDelta = -dx * 0.02
          break
        case 'r':
          scaleDelta = dx * 0.02
          break
        default:
          break
      }

      const newScale = Math.max(0.3, Math.min(2.5, dragStart.transform.scale + scaleDelta))
      setVideoTransform(prev => ({ ...prev, scale: newScale }))
    }
  }, [isDragging, dragHandle, dragStart, containerRef, setVideoTransform])

  const handleDragEnd = useCallback(() => {
    setIsDragging(false)
    setDragHandle(null)
    setSnapGuides({ h: false, v: false })
  }, [])

  // Global mouse events for dragging
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleDragMove)
      window.addEventListener('mouseup', handleDragEnd)
      return () => {
        window.removeEventListener('mousemove', handleDragMove)
        window.removeEventListener('mouseup', handleDragEnd)
      }
    }
  }, [isDragging, handleDragMove, handleDragEnd])

  const resetTransform = useCallback(() => {
    setVideoTransform({ scale: 1, x: 0, y: 0, stretch: false })
  }, [setVideoTransform])

  return {
    editMode,
    setEditMode,
    snapGuides,
    handleDragStart,
    resetTransform,
  }
}
