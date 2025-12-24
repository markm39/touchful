import { useMemo } from 'react'
import { useMarketingState, useCanvasDimensions, getDevicesForCanvas } from '../../hooks'
import { BACKGROUNDS } from '../../lib/frameRenderer'
import { DeviceLayer } from './devices/DeviceLayer'
import { TextLayer } from './text/TextLayer'

/**
 * MarketingCanvas - Single canvas with background, devices, and text
 * Handles rendering of elements including cross-canvas device positioning
 */
export function MarketingCanvas({ canvasIndex, previewScale, isSelected }) {
  const { state, actions } = useMarketingState()
  const { canvases, devices, textLayers, selectedDeviceId, selectedTextId } = state
  const dims = useCanvasDimensions()

  const canvas = canvases[canvasIndex]
  const background = BACKGROUNDS[canvas?.background] || BACKGROUNDS.ocean

  // Get devices that overlap this canvas
  const canvasDevices = useMemo(() => {
    return getDevicesForCanvas(devices, canvasIndex, dims.width)
  }, [devices, canvasIndex, dims.width])

  // Get text layers for this canvas
  const canvasTextLayers = useMemo(() => {
    return textLayers.filter(t => t.canvasIndex === canvasIndex)
  }, [textLayers, canvasIndex])

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
      className="relative overflow-hidden rounded-lg"
      style={{
        width: dims.width * previewScale,
        height: dims.height * previewScale,
        background: gradientStyle,
      }}
      onClick={handleCanvasClick}
    >
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
        />
      ))}

      {/* Canvas index badge */}
      <div className="absolute bottom-2 right-2 px-2 py-1 rounded bg-black/50 text-white text-xs">
        {canvasIndex + 1}
      </div>
    </div>
  )
}

export default MarketingCanvas
