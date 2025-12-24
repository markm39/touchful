import { useState, useRef, useCallback, useEffect } from 'react'
import { useMarketingState } from '../../../hooks'

// Snap threshold in percentage
const SNAP_THRESHOLD_PERCENT = 2

/**
 * TextLayer - Draggable, resizable text element with inline editing
 * Positioned using percentage coordinates within canvas
 * Font size adjusts when resizing via corner handles
 */
export function TextLayer({
  text,
  previewScale,
  canvasWidth,
  canvasHeight,
  isSelected,
  onSelect,
  onSnapChange,
}) {
  const { actions } = useMarketingState()
  const layerRef = useRef(null)
  const inputRef = useRef(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isResizing, setIsResizing] = useState(false)
  const [isEditing, setIsEditing] = useState(false)

  // Calculate position in pixels
  const scaledX = (text.x / 100) * canvasWidth * previewScale
  const scaledY = (text.y / 100) * canvasHeight * previewScale
  const scaledFontSize = text.fontSize * previewScale

  // Focus input when entering edit mode
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  // Handle drag
  const handleMouseDown = useCallback((e) => {
    if (e.button !== 0 || isEditing) return
    e.stopPropagation()
    onSelect()

    const startClientX = e.clientX
    const startClientY = e.clientY
    const startX = text.x
    const startY = text.y

    setIsDragging(true)

    const handleMouseMove = (moveEvent) => {
      const dx = (moveEvent.clientX - startClientX) / previewScale
      const dy = (moveEvent.clientY - startClientY) / previewScale

      // Convert pixel delta to percentage
      const dxPercent = (dx / canvasWidth) * 100
      const dyPercent = (dy / canvasHeight) * 100

      let newX = Math.max(0, Math.min(100, startX + dxPercent))
      let newY = Math.max(0, Math.min(100, startY + dyPercent))

      // Check for snap to center (text x is already center-based at 50%)
      const nearCenterX = Math.abs(newX - 50) < SNAP_THRESHOLD_PERCENT
      const nearCenterY = Math.abs(newY - 50) < SNAP_THRESHOLD_PERCENT

      // Snap to center if close
      if (nearCenterX) newX = 50
      if (nearCenterY) newY = 50

      if (onSnapChange) {
        onSnapChange({ horizontal: nearCenterY, vertical: nearCenterX })
      }

      actions.updateText(text.id, { x: newX, y: newY })
    }

    const handleMouseUp = () => {
      setIsDragging(false)
      if (onSnapChange) {
        onSnapChange({ horizontal: false, vertical: false })
      }
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
  }, [text, previewScale, canvasWidth, canvasHeight, actions, onSelect, isEditing, onSnapChange])

  // Handle resize (adjusts font size)
  const handleResizeStart = useCallback((corner, e) => {
    e.stopPropagation()
    e.preventDefault()
    onSelect()
    setIsResizing(true)

    const startFontSize = text.fontSize
    const startClientX = e.clientX
    const startClientY = e.clientY

    const handleMouseMove = (moveEvent) => {
      // Calculate drag distance
      const dx = (moveEvent.clientX - startClientX) / previewScale
      const dy = (moveEvent.clientY - startClientY) / previewScale

      // Use diagonal distance for uniform scaling
      let delta
      if (corner === 'br' || corner === 'tr') {
        delta = (dx + dy) / 2
      } else {
        delta = (-dx + dy) / 2
      }

      // Bottom corners increase size when dragging down/out
      // Top corners increase size when dragging up/out
      if (corner === 'tr' || corner === 'tl') {
        delta = -delta
      }

      // Scale factor: ~2px font size change per 10px of drag
      const newFontSize = Math.max(12, Math.min(200, startFontSize + delta * 0.5))

      actions.updateText(text.id, {
        fontSize: Math.round(newFontSize),
      })
    }

    const handleMouseUp = () => {
      setIsResizing(false)
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
  }, [text.id, text.fontSize, previewScale, actions, onSelect])

  // Handle double-click to edit
  const handleDoubleClick = useCallback((e) => {
    e.stopPropagation()
    setIsEditing(true)
  }, [])

  // Handle text change
  const handleTextChange = useCallback((e) => {
    actions.updateText(text.id, { content: e.target.value })
  }, [text.id, actions])

  // Handle blur to exit edit mode
  const handleBlur = useCallback(() => {
    setIsEditing(false)
  }, [])

  // Handle key down in edit mode
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      setIsEditing(false)
    }
    if (e.key === 'Escape') {
      setIsEditing(false)
    }
  }, [])

  const textStyle = {
    fontFamily: text.fontFamily,
    fontSize: scaledFontSize,
    fontWeight: text.fontWeight,
    color: text.color,
    textAlign: text.textAlign,
    transform: `rotate(${text.rotation}deg)`,
    textShadow: '0 2px 4px rgba(0,0,0,0.5)',
    whiteSpace: 'nowrap',
  }

  return (
    <div
      ref={layerRef}
      className={`absolute cursor-move ${isDragging || isResizing ? 'z-50' : ''}`}
      style={{
        left: scaledX,
        top: scaledY,
        transform: `translateX(-50%)`,
      }}
      onMouseDown={handleMouseDown}
      onDoubleClick={handleDoubleClick}
    >
      {isEditing ? (
        <input
          ref={inputRef}
          type="text"
          value={text.content}
          onChange={handleTextChange}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className="bg-transparent border-none outline-none"
          style={{
            ...textStyle,
            minWidth: '50px',
            textAlign: 'center',
          }}
        />
      ) : (
        <span style={textStyle} className="pointer-events-none select-none">{text.content}</span>
      )}

      {/* Selection indicator and resize handles */}
      {isSelected && !isEditing && (
        <>
          <div className="absolute -inset-2 border-2 border-mavs-blue border-dashed rounded pointer-events-none" />

          {/* Corner resize handles */}
          {['tl', 'tr', 'bl', 'br'].map(corner => (
            <div
              key={corner}
              className="absolute w-3 h-3 bg-white border-2 border-mavs-blue rounded-full cursor-nwse-resize"
              style={{
                left: corner.includes('l') ? -8 : 'auto',
                right: corner.includes('r') ? -8 : 'auto',
                top: corner.includes('t') ? -8 : 'auto',
                bottom: corner.includes('b') ? -8 : 'auto',
                cursor: corner === 'tl' || corner === 'br' ? 'nwse-resize' : 'nesw-resize',
              }}
              onMouseDown={(e) => handleResizeStart(corner, e)}
            />
          ))}

          {/* Font size indicator */}
          <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-mavs-blue rounded text-white text-xs whitespace-nowrap">
            {text.fontSize}px
          </div>

          {/* Delete button */}
          <button
            className="absolute -top-4 -right-4 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white text-xs hover:bg-red-600"
            onClick={(e) => {
              e.stopPropagation()
              actions.removeText(text.id)
            }}
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </>
      )}
    </div>
  )
}

export default TextLayer
