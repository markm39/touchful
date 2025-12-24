import { useRef, useEffect } from 'react'
import { useMarketingState, useCanvasDimensions } from '../../hooks'
import { MarketingCanvas } from './MarketingCanvas'

/**
 * CanvasStrip - Horizontal scrollable container for all canvases
 * Shows canvases side-by-side at preview scale
 */
export function CanvasStrip() {
  const { state, actions } = useMarketingState()
  const { canvases, selectedCanvasIndex } = state
  const dims = useCanvasDimensions()
  const containerRef = useRef(null)

  // Calculate preview scale to fit canvases nicely
  // Target around 300px height for portrait, adjust for container
  const previewScale = Math.min(400 / dims.height, 0.2)
  const previewWidth = dims.width * previewScale
  const previewHeight = dims.height * previewScale

  // Scroll selected canvas into view
  useEffect(() => {
    if (containerRef.current) {
      const selectedElement = containerRef.current.children[selectedCanvasIndex]
      if (selectedElement) {
        selectedElement.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
      }
    }
  }, [selectedCanvasIndex])

  return (
    <div className="glass-panel p-4">
      <div
        ref={containerRef}
        className="flex gap-4 overflow-x-auto pb-2"
        style={{ scrollbarWidth: 'thin' }}
      >
        {canvases.map((canvas, index) => (
          <div
            key={canvas.id}
            className={`flex-shrink-0 cursor-pointer transition-all ${
              selectedCanvasIndex === index
                ? 'ring-2 ring-mavs-blue ring-offset-2 ring-offset-transparent'
                : 'opacity-70 hover:opacity-100'
            }`}
            onClick={() => actions.selectCanvas(index)}
            style={{
              width: previewWidth,
              height: previewHeight,
            }}
          >
            <MarketingCanvas
              canvasIndex={index}
              previewScale={previewScale}
              isSelected={selectedCanvasIndex === index}
            />
          </div>
        ))}
      </div>

      {/* Canvas indicator */}
      <div className="flex justify-center gap-2 mt-3">
        {canvases.map((canvas, index) => (
          <button
            key={canvas.id}
            onClick={() => actions.selectCanvas(index)}
            className={`w-2 h-2 rounded-full transition-all ${
              selectedCanvasIndex === index
                ? 'bg-mavs-blue w-6'
                : 'bg-white/30 hover:bg-white/50'
            }`}
          />
        ))}
      </div>
    </div>
  )
}

export default CanvasStrip
