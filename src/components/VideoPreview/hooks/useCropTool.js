import { useState, useCallback, useEffect } from 'react'

/**
 * Hook to manage crop tool state and interactions
 * Accepts external appliedCrop state for sharing with export
 */
export function useCropTool(containerRef, appliedCrop, setAppliedCrop) {
  const [cropMode, setCropMode] = useState(false)
  const [cropBounds, setCropBounds] = useState({ x: 0, y: 0, width: 100, height: 100 })
  const [cropDragging, setCropDragging] = useState(null) // 'tl', 'tr', 'bl', 'br', 'move'
  const [cropDragStart, setCropDragStart] = useState(null)

  const handleCropDragStart = useCallback((handle, e) => {
    e.preventDefault()
    e.stopPropagation()
    setCropDragging(handle)
    setCropDragStart({ x: e.clientX, y: e.clientY, bounds: { ...cropBounds } })
  }, [cropBounds])

  const handleCropDragMove = useCallback((e) => {
    if (!cropDragging || !cropDragStart) return

    const container = containerRef.current
    if (!container) return

    const rect = container.getBoundingClientRect()
    const dx = ((e.clientX - cropDragStart.x) / rect.width) * 100
    const dy = ((e.clientY - cropDragStart.y) / rect.height) * 100

    const { x, y, width, height } = cropDragStart.bounds

    let newBounds = { x, y, width, height }

    switch (cropDragging) {
      case 'move':
        newBounds.x = Math.max(0, Math.min(100 - width, x + dx))
        newBounds.y = Math.max(0, Math.min(100 - height, y + dy))
        break
      case 'tl':
        newBounds.x = Math.max(0, Math.min(x + width - 10, x + dx))
        newBounds.y = Math.max(0, Math.min(y + height - 10, y + dy))
        newBounds.width = width - (newBounds.x - x)
        newBounds.height = height - (newBounds.y - y)
        break
      case 'tr':
        newBounds.y = Math.max(0, Math.min(y + height - 10, y + dy))
        newBounds.width = Math.max(10, Math.min(100 - x, width + dx))
        newBounds.height = height - (newBounds.y - y)
        break
      case 'bl':
        newBounds.x = Math.max(0, Math.min(x + width - 10, x + dx))
        newBounds.width = width - (newBounds.x - x)
        newBounds.height = Math.max(10, Math.min(100 - y, height + dy))
        break
      case 'br':
        newBounds.width = Math.max(10, Math.min(100 - x, width + dx))
        newBounds.height = Math.max(10, Math.min(100 - y, height + dy))
        break
      default:
        break
    }

    setCropBounds(newBounds)
  }, [cropDragging, cropDragStart, containerRef])

  const handleCropDragEnd = useCallback(() => {
    setCropDragging(null)
    setCropDragStart(null)
  }, [])

  // Global events for crop dragging
  useEffect(() => {
    if (cropDragging) {
      window.addEventListener('mousemove', handleCropDragMove)
      window.addEventListener('mouseup', handleCropDragEnd)
      return () => {
        window.removeEventListener('mousemove', handleCropDragMove)
        window.removeEventListener('mouseup', handleCropDragEnd)
      }
    }
  }, [cropDragging, handleCropDragMove, handleCropDragEnd])

  const enterCropMode = useCallback(() => {
    setCropBounds({ x: 10, y: 10, width: 80, height: 80 })
    setCropMode(true)
  }, [])

  const applyCrop = useCallback(() => {
    setAppliedCrop({ ...cropBounds })
    setCropMode(false)
  }, [cropBounds, setAppliedCrop])

  const cancelCrop = useCallback(() => {
    setCropMode(false)
  }, [])

  const resetCrop = useCallback(() => {
    setAppliedCrop({ x: 0, y: 0, width: 100, height: 100 })
    setCropBounds({ x: 0, y: 0, width: 100, height: 100 })
  }, [setAppliedCrop])

  return {
    cropMode,
    cropBounds,
    handleCropDragStart,
    enterCropMode,
    applyCrop,
    cancelCrop,
    resetCrop,
  }
}
