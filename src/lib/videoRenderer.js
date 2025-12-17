// FFmpeg.wasm video renderer with zoom/pan effects

import { FFmpeg } from '@ffmpeg/ffmpeg'
import { fetchFile } from '@ffmpeg/util'
import { CameraEngine } from './cameraEngine'

let ffmpeg = null
let ffmpegLoaded = false

/**
 * Initialize FFmpeg.wasm
 */
async function initFFmpeg(onProgress) {
  if (ffmpegLoaded && ffmpeg) return ffmpeg

  ffmpeg = new FFmpeg()
  
  ffmpeg.on('progress', ({ progress }) => {
    if (onProgress) {
      onProgress(progress * 100)
    }
  })

  ffmpeg.on('log', ({ message }) => {
    console.log('[FFmpeg]', message)
  })

  await ffmpeg.load({
    coreURL: 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm/ffmpeg-core.js',
    wasmURL: 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm/ffmpeg-core.wasm',
  })

  ffmpegLoaded = true
  return ffmpeg
}

/**
 * Render video with zoom/pan effects
 * @param {File} videoFile - Source video file
 * @param {Array} tapEvents - Detected tap events
 * @param {Object} format - Output format {id, width, height}
 * @param {number} zoomLevel - Zoom intensity (1-3)
 * @param {Function} onProgress - Progress callback
 * @returns {Uint8Array} - Rendered video data
 */
export async function renderVideo(videoFile, tapEvents, format, zoomLevel, onProgress) {
  // Initialize FFmpeg
  const ff = await initFFmpeg((p) => {
    // FFmpeg progress is roughly 60-100% of total
    onProgress(60 + p * 0.4)
  })

  // Get video info
  const videoUrl = URL.createObjectURL(videoFile)
  const videoInfo = await getVideoInfo(videoUrl)
  URL.revokeObjectURL(videoUrl)

  // Generate camera keyframes
  const camera = new CameraEngine(videoInfo.width, videoInfo.height)
  const keyframes = camera.generateKeyframes(tapEvents, videoInfo.duration, 30, zoomLevel)

  onProgress(10)

  // Write source video to FFmpeg filesystem
  await ff.writeFile('input.mp4', await fetchFile(videoFile))

  onProgress(20)

  // Build FFmpeg filter complex for zoom/pan
  const filterComplex = buildFilterComplex(
    keyframes,
    videoInfo,
    format,
    tapEvents
  )

  onProgress(30)

  // Run FFmpeg
  await ff.exec([
    '-i', 'input.mp4',
    '-filter_complex', filterComplex,
    '-map', '[out]',
    '-map', '0:a?',
    '-c:v', 'libx264',
    '-preset', 'fast',
    '-crf', '23',
    '-c:a', 'aac',
    '-b:a', '128k',
    '-movflags', '+faststart',
    '-y',
    'output.mp4'
  ])

  onProgress(95)

  // Read output
  const data = await ff.readFile('output.mp4')

  // Cleanup
  await ff.deleteFile('input.mp4')
  await ff.deleteFile('output.mp4')

  onProgress(100)

  return data
}

/**
 * Get video information
 */
function getVideoInfo(url) {
  return new Promise((resolve) => {
    const video = document.createElement('video')
    video.src = url
    video.onloadedmetadata = () => {
      resolve({
        width: video.videoWidth,
        height: video.videoHeight,
        duration: video.duration,
      })
    }
  })
}

/**
 * Build FFmpeg filter complex for smooth zoom/pan
 * This is a simplified version - for production, you'd want more complex
 * frame-by-frame processing
 */
function buildFilterComplex(keyframes, videoInfo, format, tapEvents) {
  const { width: srcW, height: srcH } = videoInfo
  const { width: outW, height: outH } = format
  
  // Calculate scaling to fit output format
  const srcAspect = srcW / srcH
  const outAspect = outW / outH
  
  let scaleW, scaleH, padX, padY
  
  if (srcAspect > outAspect) {
    // Video is wider than output - letterbox top/bottom
    scaleW = outW
    scaleH = Math.round(outW / srcAspect)
    padX = 0
    padY = Math.round((outH - scaleH) / 2)
  } else {
    // Video is taller than output - letterbox left/right
    scaleH = outH
    scaleW = Math.round(outH * srcAspect)
    padX = Math.round((outW - scaleW) / 2)
    padY = 0
  }

  // For a smooth pan/zoom effect, we use zoompan filter
  // This is a simplified approach - for exact keyframe control,
  // frame-by-frame rendering would be needed
  
  // Calculate average zoom and pan from keyframes
  const avgZoom = keyframes.reduce((sum, k) => sum + k.zoom, 0) / keyframes.length
  const avgX = keyframes.reduce((sum, k) => sum + k.x, 0) / keyframes.length
  const avgY = keyframes.reduce((sum, k) => sum + k.y, 0) / keyframes.length

  // Normalize pan values
  const panX = (avgX / srcW - 0.5) * 2  // -1 to 1
  const panY = (avgY / srcH - 0.5) * 2  // -1 to 1

  // Build filter - using scale and crop for zooming, then pad for aspect ratio
  // For dynamic zoom, we'd need zoompan filter with keyframe expressions
  const filter = [
    // Apply zoom via scale
    `scale=${Math.round(srcW * avgZoom)}:${Math.round(srcH * avgZoom)}`,
    // Crop to original size from center (adjusted by pan)
    `crop=${srcW}:${srcH}:` +
    `(iw-${srcW})/2+${Math.round(panX * srcW * (avgZoom - 1) / 2)}:` +
    `(ih-${srcH})/2+${Math.round(panY * srcH * (avgZoom - 1) / 2)}`,
    // Scale to output size maintaining aspect
    `scale=${scaleW}:${scaleH}`,
    // Pad to exact output dimensions with dark background
    `pad=${outW}:${outH}:${padX}:${padY}:color=001428`,
  ].join(',')

  return `[0:v]${filter}[out]`
}

/**
 * More advanced: Frame-by-frame rendering with canvas
 * This gives exact control but is slower
 */
export async function renderVideoAdvanced(videoFile, tapEvents, format, zoomLevel, onProgress) {
  const ff = await initFFmpeg()
  
  // This would involve:
  // 1. Extract frames from video
  // 2. Process each frame with canvas (zoom, pan, ripple overlay)
  // 3. Re-encode frames to video
  // 
  // For now, we use the simpler filter-based approach above
  
  return renderVideo(videoFile, tapEvents, format, zoomLevel, onProgress)
}

