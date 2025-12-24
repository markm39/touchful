# Marketing Components

Components for the App Store marketing image generator.

## Structure

```
marketing/
  index.js              - Barrel exports
  MarketingToolbar.jsx  - Top toolbar (size, orientation, canvas count, add buttons)
  CanvasStrip.jsx       - Horizontal scrollable canvas thumbnails
  MarketingCanvas.jsx   - Individual canvas with layers
  MarketingWorkspace.jsx - Large interactive editing area

  devices/
    index.js
    DeviceLayer.jsx     - Draggable/resizable device frame
    DeviceControls.jsx  - Settings panel for selected device

  text/
    index.js
    TextLayer.jsx       - Draggable text element with inline editing
    TextControls.jsx    - Font, size, color settings

  export/
    index.js
    MarketingExporter.jsx - Export panel with single/batch export
```

## Key Components

### MarketingWorkspace
The main editing area showing the selected canvas at a larger scale. Users can:
- Drag devices and text to reposition
- Resize devices using corner handles
- Double-click text to edit inline

### DeviceLayer
Renders a device frame with:
- Screenshot drop zone (drag & drop or click to upload)
- Resize handles (maintains aspect ratio)
- Rotation support
- Notch and home indicator

### Cross-Canvas Device Positioning
Devices use world coordinates that span all canvases. The `getDevicesForCanvas()` hook calculates which devices overlap each canvas and their relative positions, enabling devices to span multiple screens.
