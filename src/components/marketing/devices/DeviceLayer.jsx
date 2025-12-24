import { useState, useRef, useCallback } from 'react'
import { useMarketingState } from '../../../hooks'

/**
 * Device presets for marketing images
 * Based on frameRenderer.js but simplified for static images
 */
const DEVICE_TYPES = {
  iphone: { name: 'iPhone', aspect: 9 / 19.5, radius: 44, bezel: 8 },
  ipad: { name: 'iPad', aspect: 3 / 4, radius: 18, bezel: 8 },
  android: { name: 'Android', aspect: 9 / 20, radius: 32, bezel: 6 },
}

// Snap threshold in pixels (at preview scale)
const SNAP_THRESHOLD = 10

/**
 * DeviceLayer - Draggable, resizable device frame with screenshot
 * Supports cross-canvas positioning via world coordinates
 */
export function DeviceLayer({
  device,
  previewScale,
  canvasWidth,
  canvasHeight,
  isSelected,
  onSelect,
  onSnapChange,
}) {
  const { actions } = useMarketingState()
  const layerRef = useRef(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isResizing, setIsResizing] = useState(false)

  const deviceConfig = DEVICE_TYPES[device.type] || DEVICE_TYPES.iphone

  // Calculate scaled dimensions for preview
  const scaledX = device.relativeX * previewScale
  const scaledY = device.worldY * previewScale
  const scaledWidth = device.width * previewScale
  const scaledHeight = device.height * previewScale
  const scaledRadius = deviceConfig.radius * previewScale * (device.width / 300)
  const scaledBezel = deviceConfig.bezel * previewScale * (device.width / 300)

  // Handle drag start
  const handleMouseDown = useCallback((e) => {
    if (e.button !== 0) return
    e.stopPropagation()
    onSelect()

    // Capture start positions directly (not via state to avoid closure issues)
    const startWorldX = device.worldX
    const startWorldY = device.worldY
    const startClientX = e.clientX
    const startClientY = e.clientY

    setIsDragging(true)

    const handleMouseMove = (moveEvent) => {
      const dx = (moveEvent.clientX - startClientX) / previewScale
      const dy = (moveEvent.clientY - startClientY) / previewScale

      let newWorldX = startWorldX + dx
      let newWorldY = startWorldY + dy

      // Calculate device center position relative to canvas
      const deviceCenterX = newWorldX + device.width / 2
      const deviceCenterY = newWorldY + device.height / 2

      // Canvas center (for the current canvas the device is mostly on)
      const canvasCenterX = canvasWidth / 2
      const canvasCenterY = canvasHeight / 2

      // Check for snap to center
      const snapThresholdWorld = SNAP_THRESHOLD / previewScale
      const nearCenterX = Math.abs(deviceCenterX - canvasCenterX) < snapThresholdWorld
      const nearCenterY = Math.abs(deviceCenterY - canvasCenterY) < snapThresholdWorld

      // Snap to center if close
      if (nearCenterX) {
        newWorldX = canvasCenterX - device.width / 2
      }
      if (nearCenterY) {
        newWorldY = canvasCenterY - device.height / 2
      }

      if (onSnapChange) {
        onSnapChange({ horizontal: nearCenterY, vertical: nearCenterX })
      }

      actions.updateDevice(device.id, {
        worldX: newWorldX,
        worldY: newWorldY,
      })
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
  }, [device.worldX, device.worldY, device.width, device.height, device.id, previewScale, canvasWidth, canvasHeight, actions, onSelect, onSnapChange])

  // Handle resize
  const handleResizeStart = useCallback((corner, e) => {
    e.stopPropagation()
    e.preventDefault()
    onSelect()
    setIsResizing(true)

    const startWidth = device.width
    const startHeight = device.height
    const startX = device.worldX
    const startY = device.worldY
    const startClientX = e.clientX
    const startClientY = e.clientY

    const handleMouseMove = (moveEvent) => {
      const dx = (moveEvent.clientX - startClientX) / previewScale
      const dy = (moveEvent.clientY - startClientY) / previewScale

      let newWidth = startWidth
      let newHeight = startHeight
      let newX = startX
      let newY = startY

      // Use image aspect ratio if available, otherwise use device type aspect
      const aspect = device.imageAspect || deviceConfig.aspect

      if (corner.includes('r')) {
        newWidth = Math.max(100, startWidth + dx)
        newHeight = newWidth / aspect
      }
      if (corner.includes('l')) {
        newWidth = Math.max(100, startWidth - dx)
        newHeight = newWidth / aspect
        newX = startX + (startWidth - newWidth)
      }
      if (corner.includes('b')) {
        newHeight = Math.max(100, startHeight + dy)
        newWidth = newHeight * aspect
      }
      if (corner.includes('t')) {
        newHeight = Math.max(100, startHeight - dy)
        newWidth = newHeight * aspect
        newY = startY + (startHeight - newHeight)
      }

      actions.updateDevice(device.id, {
        width: newWidth,
        height: newHeight,
        worldX: newX,
        worldY: newY,
      })
    }

    const handleMouseUp = () => {
      setIsResizing(false)
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
  }, [device, previewScale, deviceConfig, actions, onSelect])

  // Load image and resize device to fit
  const loadImageAndResize = useCallback((file) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      // Calculate new device dimensions based on image aspect ratio
      const imgAspect = img.width / img.height
      const currentHeight = device.height
      const newWidth = currentHeight * imgAspect

      actions.updateDevice(device.id, {
        screenshot: url,
        width: newWidth,
        // Store the image aspect ratio for resize operations
        imageAspect: imgAspect,
      })
    }
    img.src = url
  }, [device.id, device.height, actions])

  // Handle screenshot drop
  const handleDrop = useCallback((e) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file && file.type.startsWith('image/')) {
      loadImageAndResize(file)
    }
  }, [loadImageAndResize])

  const handleDragOver = useCallback((e) => {
    e.preventDefault()
  }, [])

  // Handle file input for screenshot
  const handleFileSelect = useCallback((e) => {
    const file = e.target.files[0]
    if (file && file.type.startsWith('image/')) {
      loadImageAndResize(file)
    }
  }, [loadImageAndResize])

  return (
    <div
      ref={layerRef}
      className={`absolute cursor-move ${isDragging ? 'z-50' : ''}`}
      style={{
        left: scaledX,
        top: scaledY,
        width: scaledWidth,
        height: scaledHeight,
        transform: `rotate(${device.rotation}deg)`,
        transformOrigin: 'center',
      }}
      onMouseDown={handleMouseDown}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
    >
      {/* Device frame (bezel) */}
      <div
        className="absolute inset-0 bg-black/90"
        style={{
          borderRadius: scaledRadius,
          boxShadow: '0 10px 30px rgba(0,0,0,0.4)',
        }}
      />

      {/* Screen area */}
      <div
        className="absolute overflow-hidden"
        style={{
          left: scaledBezel,
          top: scaledBezel,
          right: scaledBezel,
          bottom: scaledBezel,
          borderRadius: Math.max(0, scaledRadius - scaledBezel),
        }}
      >
        {device.screenshot ? (
          <img
            src={device.screenshot}
            alt="Screenshot"
            className="w-full h-full object-cover pointer-events-none"
            draggable={false}
          />
        ) : (
          <label className="w-full h-full flex flex-col items-center justify-center bg-gray-800 cursor-pointer hover:bg-gray-700 transition-colors">
            <svg className="w-8 h-8 text-gray-500 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="text-gray-500 text-xs">Drop image</span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileSelect}
            />
          </label>
        )}
      </div>

      {/* Notch / Dynamic Island */}
      {device.showNotch && (
        <div
          className="absolute bg-black"
          style={{
            left: '50%',
            top: scaledBezel,
            transform: 'translateX(-50%)',
            width: scaledWidth * 0.25,
            height: scaledHeight * 0.025,
            borderRadius: `0 0 ${scaledRadius * 0.3}px ${scaledRadius * 0.3}px`,
          }}
        />
      )}

      {/* Home indicator */}
      {device.showNotch && (
        <div
          className="absolute bg-white/30"
          style={{
            left: '50%',
            bottom: scaledBezel + scaledHeight * 0.01,
            transform: 'translateX(-50%)',
            width: scaledWidth * 0.3,
            height: Math.max(2, scaledHeight * 0.005),
            borderRadius: 999,
          }}
        />
      )}

      {/* Selection border and handles */}
      {isSelected && (
        <>
          <div
            className="absolute inset-0 border-2 border-mavs-blue pointer-events-none"
            style={{ borderRadius: scaledRadius }}
          />

          {/* Corner resize handles */}
          {['tl', 'tr', 'bl', 'br'].map(corner => (
            <div
              key={corner}
              className="absolute w-3 h-3 bg-white border-2 border-mavs-blue rounded-sm cursor-nwse-resize"
              style={{
                left: corner.includes('l') ? -6 : 'auto',
                right: corner.includes('r') ? -6 : 'auto',
                top: corner.includes('t') ? -6 : 'auto',
                bottom: corner.includes('b') ? -6 : 'auto',
                cursor: corner === 'tl' || corner === 'br' ? 'nwse-resize' : 'nesw-resize',
              }}
              onMouseDown={(e) => handleResizeStart(corner, e)}
            />
          ))}

          {/* Delete button */}
          <button
            className="absolute -top-3 -right-3 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white text-xs hover:bg-red-600"
            onClick={(e) => {
              e.stopPropagation()
              actions.removeDevice(device.id)
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

export default DeviceLayer
