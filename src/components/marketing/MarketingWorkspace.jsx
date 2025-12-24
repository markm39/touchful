import { useMemo, useRef, useEffect, useState } from 'react'
import { useMarketingState, useCanvasDimensions, getDevicesForCanvas } from '../../hooks'
import { BACKGROUNDS } from '../../lib/frameRenderer'
import { DeviceLayer } from './devices/DeviceLayer'
import { TextLayer } from './text/TextLayer'

/**
 * MarketingWorkspace - Large interactive canvas for editing
 * Shows the selected canvas at a larger scale for easier manipulation
 */
export function MarketingWorkspace() {
  const { state, actions } = useMarketingState()
  const { canvases, devices, textLayers, selectedDeviceId, selectedTextId, selectedCanvasIndex } = state
  const dims = useCanvasDimensions()
  const containerRef = useRef(null)
  const [containerSize, setContainerSize] = useState({ width: 800, height: 600 })
  const [snapLines, setSnapLines] = useState({ horizontal: false, vertical: false })

  const canvas = canvases[selectedCanvasIndex]
  const background = BACKGROUNDS[canvas?.background] || BACKGROUNDS.ocean

  // Measure container to calculate scale
  useEffect(() => {
    const measure = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect()
        setContainerSize({ width: rect.width, height: rect.height })
      }
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [])

  // Calculate scale to fit canvas in container with padding
  const padding = 40
  const availableWidth = containerSize.width - padding * 2
  const availableHeight = containerSize.height - padding * 2
  const scaleX = availableWidth / dims.width
  const scaleY = availableHeight / dims.height
  const previewScale = Math.min(scaleX, scaleY, 0.5) // Cap at 50% to prevent huge previews

  const previewWidth = dims.width * previewScale
  const previewHeight = dims.height * previewScale

  // Get devices that overlap this canvas
  const canvasDevices = useMemo(() => {
    return getDevicesForCanvas(devices, selectedCanvasIndex, dims.width)
  }, [devices, selectedCanvasIndex, dims.width])

  // Get text layers for this canvas
  const canvasTextLayers = useMemo(() => {
    return textLayers.filter(t => t.canvasIndex === selectedCanvasIndex)
  }, [textLayers, selectedCanvasIndex])

  // Build gradient CSS
  const gradientStyle = useMemo(() => {
    const colors = background.colors
    const stops = colors.map((color, i) => {
      const percent = (i / (colors.length - 1)) * 100
      return `${color} ${percent}%`
    }).join(', ')
    return `linear-gradient(135deg, ${stops})`
  }, [background])

  const handleCanvasClick = (e) => {
    // Only clear selection if clicking on background, not on a layer
    if (e.target === e.currentTarget) {
      actions.clearSelection()
    }
  }

  return (
    <div
      ref={containerRef}
      className="glass-panel p-4"
      style={{ minHeight: '500px' }}
    >
      <div className="flex items-center justify-center h-full">
        <div
          className="relative overflow-hidden rounded-xl shadow-2xl"
          style={{
            width: previewWidth,
            height: previewHeight,
            background: gradientStyle,
          }}
          onClick={handleCanvasClick}
        >
          {/* Snap guide lines */}
          {(snapLines.horizontal || snapLines.vertical) && (
            <div className="absolute inset-0 pointer-events-none z-50">
              {snapLines.vertical && (
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-mavs-blue"
                  style={{
                    left: '50%',
                    transform: 'translateX(-50%)',
                    boxShadow: '0 0 8px rgba(0, 83, 140, 0.8)',
                  }}
                />
              )}
              {snapLines.horizontal && (
                <div
                  className="absolute left-0 right-0 h-0.5 bg-mavs-blue"
                  style={{
                    top: '50%',
                    transform: 'translateY(-50%)',
                    boxShadow: '0 0 8px rgba(0, 83, 140, 0.8)',
                  }}
                />
              )}
            </div>
          )}

          {/* Devices layer */}
          {canvasDevices.map(device => (
            <DeviceLayer
              key={device.id}
              device={device}
              previewScale={previewScale}
              canvasWidth={dims.width}
              canvasHeight={dims.height}
              isSelected={selectedDeviceId === device.id}
              onSelect={() => actions.selectDevice(device.id)}
              onSnapChange={setSnapLines}
            />
          ))}

          {/* Text layers */}
          {canvasTextLayers.map(text => (
            <TextLayer
              key={text.id}
              text={text}
              previewScale={previewScale}
              canvasWidth={dims.width}
              canvasHeight={dims.height}
              isSelected={selectedTextId === text.id}
              onSelect={() => actions.selectText(text.id)}
              onSnapChange={setSnapLines}
            />
          ))}

          {/* Empty state hint */}
          {canvasDevices.length === 0 && canvasTextLayers.length === 0 && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-white/40">
              <svg className="w-12 h-12 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
              </svg>
              <p className="text-sm">Add a device or text to get started</p>
              <p className="text-xs mt-1">Use the toolbar above</p>
            </div>
          )}
        </div>
      </div>

      {/* Canvas info bar */}
      <div className="flex items-center justify-between mt-4 text-xs text-mavs-silver">
        <span>Canvas {selectedCanvasIndex + 1} of {canvases.length}</span>
        <span>{dims.width} x {dims.height}px</span>
        <span>Preview: {Math.round(previewScale * 100)}%</span>
      </div>
    </div>
  )
}

export default MarketingWorkspace
