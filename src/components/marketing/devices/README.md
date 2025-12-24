# Device Components

Components for rendering and controlling device frames in marketing images.

## DeviceLayer.jsx

Renders a device frame with:
- Device bezel (iPhone, iPad, Android styles)
- Screenshot display area
- Notch/Dynamic Island
- Home indicator
- Drag, resize, and rotate capabilities

### Props
- `device` - Device data object from state
- `previewScale` - Scale factor for preview rendering
- `canvasWidth/Height` - Full resolution canvas dimensions
- `isSelected` - Whether this device is currently selected
- `onSelect` - Callback when device is clicked

### Interactions
- **Drag**: Click and drag anywhere on device
- **Resize**: Use corner handles (maintains aspect ratio)
- **Screenshot**: Drop image on device or click empty area

## DeviceControls.jsx

Settings panel for the selected device:
- Device type selector (iPhone, iPad, Android)
- Show/hide notch toggle
- Rotation slider
- Screenshot upload/remove
- Delete device button
