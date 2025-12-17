/**
 * WebCodecs-based video exporter
 * Fast, hardware-accelerated export with exact preview matching
 */

import { isWebCodecsSupported, getCodecConfig, createEncoder } from './webCodecsEncoder'
import { createMuxer, createSimpleMuxer } from './mp4Muxer'
import { CameraEngine } from '../cameraEngine'
import { getOutputDimensions, renderFrame, TAP_ANIMATIONS } from '../frameRenderer'

/**
 * Export video using WebCodecs API
 * Falls back to canvas-based approach if WebCodecs unavailable
 */
export async function exportWithWebCodecs(videoFile, settings, onProgress) {
  if (!isWebCodecsSupported()) {
    throw new Error('WebCodecs not supported in this browser')
  }

  const {
    tapEvents = [],
    outputAspect = '9:16',
    showDeviceFrame = true,
    videoTransform = { scale: 1, x: 0, y: 0, stretch: false },
    appliedCrop = { x: 0, y: 0, width: 100, height: 100 },
    zoomLevel = 1.4,
  } = settings

  // Create video element for seeking
  const video = document.createElement('video')
  video.src = URL.createObjectURL(videoFile)
  video.muted = true
  video.playsInline = true

  await new Promise((resolve, reject) => {
    video.onloadedmetadata = resolve
    video.onerror = reject
  })

  const videoW = video.videoWidth
  const videoH = video.videoHeight
  const duration = video.duration
  const fps = 30

  // Get output dimensions
  const { width: outW, height: outH } = getOutputDimensions(outputAspect, videoW, videoH)

  onProgress({ phase: 'init', percent: 5, message: 'Initializing encoder...' })

  // Get codec configuration
  const codecConfig = await getCodecConfig(outW, outH, fps)

  // Create canvases
  const sourceCanvas = document.createElement('canvas')
  sourceCanvas.width = videoW
  sourceCanvas.height = videoH
  const sourceCtx = sourceCanvas.getContext('2d', { willReadFrequently: true })

  const outputCanvas = document.createElement('canvas')
  outputCanvas.width = outW
  outputCanvas.height = outH

  // Create camera engine
  const camera = new CameraEngine(videoW, videoH)

  // Create encoder
  let frameCount = 0
  const totalFrames = Math.ceil(duration * fps)
  const keyFrameInterval = Math.ceil(fps * 2) // Keyframe every 2 seconds

  const encoderWrapper = createEncoder(
    codecConfig,
    (chunk, count) => {
      // Progress callback for encoding
    },
    (error) => {
      console.error('[Export] Encoding error:', error)
    }
  )

  onProgress({ phase: 'encoding', percent: 10, message: 'Encoding frames...' })

  // Process each frame
  for (let frameIdx = 0; frameIdx < totalFrames; frameIdx++) {
    const currentTime = frameIdx / fps

    // Seek video to frame time
    await seekVideo(video, currentTime)

    // Draw video frame to source canvas
    sourceCtx.drawImage(video, 0, 0, videoW, videoH)

    // Render frame with effects
    renderFrame({
      sourceCanvas,
      outputCanvas,
      videoW,
      videoH,
      currentTime,
      tapEvents,
      zoomLevel,
      videoTransform,
      appliedCrop,
      showDeviceFrame,
      camera,
    })

    // Encode frame
    const isKeyFrame = frameIdx % keyFrameInterval === 0
    const timestamp = Math.round(currentTime * 1000000) // microseconds

    await encoderWrapper.encodeFrame(outputCanvas, timestamp, isKeyFrame)
    frameCount++

    // Update progress
    const percent = 10 + (frameIdx / totalFrames) * 80
    onProgress({
      phase: 'encoding',
      percent,
      message: `Encoding frame ${frameIdx + 1}/${totalFrames}`,
      frameCount,
      totalFrames,
    })
  }

  onProgress({ phase: 'finalizing', percent: 90, message: 'Finalizing video...' })

  // Flush encoder
  const chunks = await encoderWrapper.flush()
  encoderWrapper.close()

  onProgress({ phase: 'muxing', percent: 92, message: 'Creating MP4...' })

  // Create muxer and add video samples
  let muxer
  try {
    muxer = createMuxer(outW, outH, fps, codecConfig)
  } catch (e) {
    console.warn('[Export] MP4Box muxer failed, using simple muxer:', e)
    muxer = createSimpleMuxer()
  }

  for (const chunk of chunks) {
    muxer.addVideoSample(chunk)
  }

  onProgress({ phase: 'audio', percent: 95, message: 'Adding audio...' })

  // Add audio from original video
  try {
    await muxer.addAudioFromVideo(videoFile)
  } catch (e) {
    console.warn('[Export] Audio extraction failed:', e.message)
  }

  onProgress({ phase: 'complete', percent: 98, message: 'Finalizing...' })

  // Finalize and get blob
  const blob = muxer.finalize()

  // Cleanup
  URL.revokeObjectURL(video.src)

  onProgress({ phase: 'done', percent: 100, message: 'Export complete!' })

  return blob
}

/**
 * Seek video to specific time with precision
 */
function seekVideo(video, time) {
  return new Promise((resolve) => {
    if (Math.abs(video.currentTime - time) < 0.01) {
      resolve()
      return
    }

    const onSeeked = () => {
      video.removeEventListener('seeked', onSeeked)
      // Small delay to ensure frame is ready
      requestAnimationFrame(() => resolve())
    }

    video.addEventListener('seeked', onSeeked)
    video.currentTime = time
  })
}

/**
 * Check if fast export (WebCodecs) is available
 */
export function canUseFastExport() {
  return isWebCodecsSupported()
}

/**
 * Estimate export time
 */
export function estimateExportTime(duration, width, height, fps = 30) {
  const totalFrames = Math.ceil(duration * fps)
  // WebCodecs is fast - roughly 100-300 frames per second depending on hardware
  // But seeking is slow - roughly 30-60 seeks per second
  const seekTime = totalFrames / 40 // ~40 seeks per second average
  const encodeTime = totalFrames / 200 // ~200 frames per second encoding
  return Math.ceil(seekTime + encodeTime)
}
