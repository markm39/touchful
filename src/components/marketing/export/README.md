# Export Components

Components for exporting marketing images.

## MarketingExporter.jsx

Export panel UI:
- Shows current output settings (size, dimensions, format)
- Filename prefix input
- Export current canvas button
- Export all canvases button
- Progress indicator for batch exports

## marketingRenderer.js (in `/src/lib/`)

Core rendering logic for generating full-resolution marketing images:

### Functions

- `renderMarketingCanvas(state, canvasIndex)` - Renders single canvas at full resolution, returns PNG Blob
- `renderAllMarketingCanvases(state, onProgress)` - Renders all canvases, returns array of Blobs
- `downloadBlob(blob, filename)` - Triggers browser download

### Rendering Pipeline

1. Create offscreen canvas at full resolution
2. Render gradient background
3. Render devices (sorted by z-index)
4. Render text layers
5. Export as PNG blob
