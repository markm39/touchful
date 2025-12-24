# Hooks

Custom React hooks for shared state and logic.

## Marketing State (`useMarketingState.jsx`)

Provides state management for the marketing image generator using Context + Reducer pattern.

### Exports

- `MarketingProvider` - Context provider wrapper component
- `useMarketingState()` - Hook returning `{ state, actions }`
- `useCanvasDimensions()` - Returns current canvas dimensions
- `getDevicesForCanvas(devices, canvasIndex, canvasWidth)` - Calculates which devices overlap a canvas
- `MARKETING_SIZES` - App Store size presets
- `SYSTEM_FONTS` - Available font options

### State Shape

```javascript
{
  project: { sizePreset, orientation },
  canvases: [{ id, index, background }],
  devices: [{ id, type, screenshot, worldX, worldY, width, height, rotation, showNotch, zIndex }],
  textLayers: [{ id, canvasIndex, content, x, y, fontSize, fontFamily, fontWeight, color, textAlign, rotation }],
  selectedDeviceId, selectedTextId, selectedCanvasIndex, zoom
}
```

### Key Concept: World Coordinates

Devices use "world coordinates" where `worldX` is relative to all canvases laid out horizontally. This enables devices to span multiple canvases:

- Canvas 0 starts at worldX = 0
- Canvas 1 starts at worldX = canvasWidth
- Canvas 2 starts at worldX = canvasWidth * 2

The `getDevicesForCanvas()` function calculates which portion of each device to render on each canvas.
