# VideoPreview Component

Main video preview and editing component for the Mobile Videos app.

## Structure

```
VideoPreview/
  index.jsx          - Main component (~670 lines)
  hooks/             - Custom React hooks
    useOpenCVInit.js     - OpenCV.js initialization
    useVideoPlayback.js  - Video playback state & controls
    useVideoTransform.js - Scale/position/stretch transform
    useCropTool.js       - Crop bounds & interactions
    index.js             - Barrel export
  components/        - Sub-components
    CropOverlay.jsx      - Crop UI with grid & handles
    ResizeHandles.jsx    - Transform resize handles
    PreviewOverlays.jsx  - Shared overlays (calibration, guides, drag)
    index.js             - Barrel export
```

## Key Features

- **Output Modes**: Video-only or device frame with background
- **Output Aspect Ratios**: 9:16 (TikTok), 4:5 (Instagram), 1:1 (Square), 16:9 (YouTube), Match video
- **Video Preview**: Renders video in device frames with backgrounds
- **Transform Controls**: Scale, position, stretch video within frame
- **Crop Tool**: Crop output with draggable handles
- **Tap Detection**: Auto-detect touch circles using OpenCV
- **Calibration**: Mark circle/menu for improved detection
- **Tap Editing**: Add/edit/drag tap events with animations

## Output Mode System

The component supports two output modes controlled by `showDeviceFrame`:

1. **Video Only** (`showDeviceFrame: false`): Renders just the video content, stretched to fill the selected output aspect ratio. No device bezel or background.

2. **Device Frame** (`showDeviceFrame: true`): Renders video inside a device mockup (iPhone, iPad, Android, etc.) with a gradient background. Device and background options are only shown in this mode.

## Circle Detection Algorithm

The detection in `lib/circleDetector.js` uses movement tracking to distinguish the moving touch circle from stationary elements (like menu buttons):

1. **Stationary Detection**: Positions that don't move for 5+ frames are marked as likely menu buttons
2. **Trajectory Prediction**: Calculates velocity and predicts next position
3. **Movement Validation**: Rejects detections that jump to stationary positions
4. **Hard Exclusion**: Calibrated menu positions are completely excluded from detection
