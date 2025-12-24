# Text Components

Components for text layers in marketing images.

## TextLayer.jsx

Renders a draggable text element:
- Positioned using percentage coordinates (x: 0-100, y: 0-100)
- Double-click to enter inline edit mode
- Press Enter or click away to exit edit mode

### Props
- `text` - Text layer data from state
- `previewScale` - Scale factor for preview
- `canvasWidth/Height` - Full resolution dimensions
- `isSelected` - Whether text is selected
- `onSelect` - Selection callback

## TextControls.jsx

Settings panel for selected text:
- Content input field
- Font family picker (system fonts)
- Font size slider with presets
- Font weight buttons (Regular, Semi, Bold)
- Color picker with presets
- Text alignment (left, center, right)
- Delete button
