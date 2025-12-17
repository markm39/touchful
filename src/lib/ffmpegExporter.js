/**
 * FFmpeg.wasm fallback exporter
 * Used when WebCodecs is not available (older browsers)
 *
 * Limitations:
 * - Cannot render tap animations (uses FFmpeg filters instead)
 * - Slower than WebCodecs (CPU-only encoding)
 * - Higher memory usage
 */

import { FFmpeg } from '@ffmpeg/ffmpeg'
import { fetchFile } from '@ffmpeg/util'
import { getOutputDimensions } from './frameRenderer'

let ffmpeg = null
let ffmpegLoaded = false

/**
 * Initialize FFmpeg.wasm
 */
async function initFFmpeg(onProgress) {
  if (ffmpegLoaded && ffmpeg) return ffmpeg

  ffmpeg = new FFmpeg()

  ffmpeg.on('progress', ({ progress }) => {
    if (onProgress) onProgress(progress * 100)
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
 * Get video info
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
 * Run FFmpeg command
 */
async function runFFmpegCommand(ff, args) {
  // FFmpeg.wasm's run method
  return ff['exec'](args)
}

/**
 * Render video with FFmpeg filters
 * Note: This approximates preview settings but cannot render canvas-drawn tap animations
 */
export async function renderWithFFmpeg(videoFile, previewSettings, onProgress) {
  const {
    tapEvents = [],
    outputAspect = '9:16',
    showDeviceFrame = true,
    videoTransform = { scale: 1, x: 0, y: 0, stretch: false },
    appliedCrop = { x: 0, y: 0, width: 100, height: 100 },
    zoomLevel = 1.4,
  } = previewSettings

  const ff = await initFFmpeg((p) => onProgress(20 + p * 0.7))
  onProgress(5)

  // Get video info
  const videoUrl = URL.createObjectURL(videoFile)
  const info = await getVideoInfo(videoUrl)
  URL.revokeObjectURL(videoUrl)

  const { width: srcW, height: srcH } = info

  // Calculate output dimensions
  const { width: outW, height: outH } = getOutputDimensions(outputAspect, srcW, srcH)

  onProgress(10)

  // Write input
  await ff.writeFile('input.mp4', await fetchFile(videoFile))

  onProgress(15)

  // Build filter chain
  const filters = buildFilterChain({
    srcW, srcH, outW, outH,
    videoTransform,
    appliedCrop,
    showDeviceFrame,
    zoomLevel,
    tapEvents,
    duration: info.duration,
  })

  onProgress(20)

  // Run FFmpeg
  await runFFmpegCommand(ff, [
    '-i', 'input.mp4',
    '-vf', filters,
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

  const data = await ff.readFile('output.mp4')

  await ff.deleteFile('input.mp4')
  await ff.deleteFile('output.mp4')

  onProgress(100)

  return data
}

/**
 * Build FFmpeg filter chain
 * Approximates preview settings using FFmpeg filters
 */
function buildFilterChain({ srcW, srcH, outW, outH, videoTransform, appliedCrop, showDeviceFrame, zoomLevel, tapEvents, duration }) {
  const filters = []

  // 1. Apply crop if set
  const hasCrop = appliedCrop.x !== 0 || appliedCrop.y !== 0 || appliedCrop.width !== 100 || appliedCrop.height !== 100
  if (hasCrop) {
    const cropX = Math.round((appliedCrop.x / 100) * srcW)
    const cropY = Math.round((appliedCrop.y / 100) * srcH)
    const cropW = Math.round((appliedCrop.width / 100) * srcW)
    const cropH = Math.round((appliedCrop.height / 100) * srcH)
    filters.push(`crop=${cropW}:${cropH}:${cropX}:${cropY}`)
  }

  // 2. Calculate zoom/pan based on tap events
  if (tapEvents.length > 0) {
    const fps = 30
    let zoomExpr = '1'
    let xExpr = 'iw/2'
    let yExpr = 'ih/2'

    const zoomParts = []
    const xParts = []
    const yParts = []

    for (const tap of tapEvents) {
      const tapFrame = Math.round(tap.time * fps)
      const zoomDuration = Math.round(0.6 * fps)
      const tapZoom = tap.zoomLevel || zoomLevel

      zoomParts.push(
        `if(between(on,${tapFrame},${tapFrame + zoomDuration}),` +
        `${1 + (tapZoom - 1) * 0.5}*sin((on-${tapFrame})/${zoomDuration}*PI),1)`
      )

      const tapX = tap.x / srcW
      const tapY = tap.y / srcH
      xParts.push(
        `if(between(on,${tapFrame},${tapFrame + zoomDuration}),` +
        `iw*${tapX},iw/2)`
      )
      yParts.push(
        `if(between(on,${tapFrame},${tapFrame + zoomDuration}),` +
        `ih*${tapY},ih/2)`
      )
    }

    if (zoomParts.length > 0) {
      zoomExpr = `max(${zoomParts.join(',')})`
      xExpr = xParts.length > 0 ? xParts[0] : 'iw/2'
      yExpr = yParts.length > 0 ? yParts[0] : 'ih/2'
    }

    filters.push(
      `zoompan=z='${zoomExpr}':x='${xExpr}-(iw/zoom/2)':y='${yExpr}-(ih/zoom/2)':d=1:s=${srcW}x${srcH}:fps=${fps}`
    )
  }

  // 3. Scale to fit output with transform
  const { scale, stretch } = videoTransform

  if (stretch || !showDeviceFrame) {
    filters.push(`scale=${outW}:${outH}:force_original_aspect_ratio=disable`)
  } else {
    const scaledW = Math.round(outW * scale)
    const scaledH = Math.round(outH * scale)
    filters.push(`scale=${scaledW}:${scaledH}:force_original_aspect_ratio=decrease`)
    filters.push(`pad=${outW}:${outH}:(${outW}-iw)/2:(${outH}-ih)/2:color=black`)
  }

  // Ensure even dimensions (required for h264)
  filters.push('pad=ceil(iw/2)*2:ceil(ih/2)*2')

  return filters.join(',')
}
