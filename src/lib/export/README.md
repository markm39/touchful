# Video Export Module

Fast, hardware-accelerated video export with exact preview matching.

## Architecture

```
Video File
    |
    v
HTMLVideoElement (seeking frame-by-frame)
    |
    v
Canvas Rendering (frameRenderer.js)
  - Camera zoom/pan effects
  - Tap animations (ripple, pulse, glow, etc.)
  - Crop/transform
    |
    v
WebCodecs VideoEncoder (hardware accelerated)
    |
    v
mp4-muxer (creates valid MP4)
    |
    v
Final MP4 File
```

## Files

- **fastExporter.js** - Main export using WebCodecs + mp4-muxer
- **canvasRecorder.js** - Alternative using MediaRecorder (real-time only)
- **webCodecsEncoder.js** - VideoEncoder wrapper (unused, kept for reference)
- **mp4Muxer.js** - MP4Box.js wrapper (unused, kept for reference)

## Usage

```javascript
import { renderVideoWithMetadata } from '../videoRenderer'

const { data, mimeType, extension } = await renderVideoWithMetadata(
  videoFile,
  previewSettings,
  (progress) => console.log(`${progress.percent}%`)
)

// Download
const blob = new Blob([data], { type: mimeType })
const url = URL.createObjectURL(blob)
// ... trigger download
```

## Performance

For a 30-second 1080p video:
- **WebCodecs + mp4-muxer**: 15-40 seconds (depends on seeking speed)
- **FFmpeg.wasm fallback**: 60-120 seconds

The bottleneck is video seeking, not encoding. WebCodecs encoding is hardware-accelerated.

## Browser Support

| Browser | WebCodecs | Notes |
|---------|-----------|-------|
| Chrome 94+ | Yes | Full support |
| Edge 94+ | Yes | Full support |
| Safari 16.4+ | Yes | Full support |
| Firefox 130+ | Yes | Full support |
| Older browsers | No | Falls back to FFmpeg.wasm |

## Key Libraries

- **mp4-muxer**: Creates valid MP4 files from WebCodecs output
- **WebCodecs API**: Browser API for hardware-accelerated video encoding
- **FFmpeg.wasm**: Fallback for browsers without WebCodecs

## Why Not MediaRecorder?

MediaRecorder captures in real-time, so a 30-second video takes 30+ seconds.
WebCodecs encodes as fast as the GPU allows, limited only by seeking speed.
