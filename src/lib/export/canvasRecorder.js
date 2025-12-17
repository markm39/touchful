/**
 * Canvas-based video recorder using MediaRecorder API
 *
 * This is the most reliable approach for browser-based video export:
 * - MediaRecorder handles all encoding/muxing complexity
 * - Produces valid MP4/WebM files that play everywhere
 * - Hardware accelerated on supported browsers
 */

import { CameraEngine } from '../cameraEngine'
import { getOutputDimensions, renderFrame } from '../frameRenderer'

/**
 * Get supported MIME type for recording
 */
function getSupportedMimeType() {
  const types = [
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8',
    'video/webm',
    'video/mp4',
  ]

  for (const type of types) {
    if (MediaRecorder.isTypeSupported(type)) {
      console.log('[CanvasRecorder] Using MIME type:', type)
      return type
    }
  }

  return 'video/webm' // Default fallback
}

/**
 * Export video using canvas capture and MediaRecorder
 * This produces valid, playable video files
 */
export async function exportWithCanvasRecorder(videoFile, settings, onProgress) {
  const {
    tapEvents = [],
    outputAspect = '9:16',
    showDeviceFrame = true,
    videoTransform = { scale: 1, x: 0, y: 0, stretch: false },
    appliedCrop = { x: 0, y: 0, width: 100, height: 100 },
    zoomLevel = 1.4,
  } = settings

  onProgress({ phase: 'init', percent: 2, message: 'Loading video...' })

  // Create video element for source
  const video = document.createElement('video')
  video.src = URL.createObjectURL(videoFile)
  video.muted = true
  video.playsInline = true
  video.preload = 'auto'

  await new Promise((resolve, reject) => {
    video.onloadedmetadata = resolve
    video.onerror = reject
  })

  // Wait for video to be fully loaded
  await new Promise((resolve) => {
    if (video.readyState >= 3) {
      resolve()
    } else {
      video.oncanplay = resolve
    }
  })

  const videoW = video.videoWidth
  const videoH = video.videoHeight
  const duration = video.duration
  const fps = 30

  // Get output dimensions
  const { width: outW, height: outH } = getOutputDimensions(outputAspect, videoW, videoH)

  onProgress({ phase: 'init', percent: 5, message: 'Setting up recorder...' })

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

  // Get canvas stream for recording
  const stream = outputCanvas.captureStream(fps)

  // Add audio track if available
  try {
    const audioCtx = new AudioContext()
    const source = audioCtx.createMediaElementSource(video)
    const dest = audioCtx.createMediaStreamDestination()
    source.connect(dest)
    source.connect(audioCtx.destination) // Also play locally (muted)

    const audioTrack = dest.stream.getAudioTracks()[0]
    if (audioTrack) {
      stream.addTrack(audioTrack)
    }
  } catch (e) {
    console.warn('[CanvasRecorder] Could not capture audio:', e.message)
  }

  // Set up MediaRecorder
  const mimeType = getSupportedMimeType()
  const chunks = []

  const recorder = new MediaRecorder(stream, {
    mimeType,
    videoBitsPerSecond: 5000000, // 5 Mbps
  })

  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) {
      chunks.push(e.data)
    }
  }

  // Start recording
  const recordingComplete = new Promise((resolve) => {
    recorder.onstop = () => resolve()
  })

  recorder.start(100) // Collect data every 100ms

  onProgress({ phase: 'encoding', percent: 10, message: 'Recording frames...' })

  // Render each frame by seeking through video
  const totalFrames = Math.ceil(duration * fps)
  const frameDuration = 1000 / fps // ms per frame

  for (let frameIdx = 0; frameIdx < totalFrames; frameIdx++) {
    const currentTime = frameIdx / fps

    // Seek video
    await seekVideoExact(video, currentTime)

    // Draw video to source canvas
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

    // Wait for frame timing (MediaRecorder captures at stream's fps)
    await new Promise(resolve => setTimeout(resolve, frameDuration / 2))

    // Progress update
    const percent = 10 + (frameIdx / totalFrames) * 85
    if (frameIdx % 10 === 0) {
      onProgress({
        phase: 'encoding',
        percent,
        message: `Frame ${frameIdx + 1}/${totalFrames}`,
      })
    }
  }

  onProgress({ phase: 'finalizing', percent: 95, message: 'Finalizing...' })

  // Stop recording
  recorder.stop()
  await recordingComplete

  // Create final blob
  const blob = new Blob(chunks, { type: mimeType })

  // Cleanup
  URL.revokeObjectURL(video.src)
  stream.getTracks().forEach(track => track.stop())

  onProgress({ phase: 'done', percent: 100, message: 'Export complete!' })

  // Return as Uint8Array for compatibility
  const arrayBuffer = await blob.arrayBuffer()
  return {
    data: new Uint8Array(arrayBuffer),
    mimeType,
    extension: mimeType.includes('webm') ? 'webm' : 'mp4',
  }
}

/**
 * Seek video to exact time
 */
function seekVideoExact(video, time) {
  return new Promise((resolve) => {
    if (Math.abs(video.currentTime - time) < 0.02) {
      resolve()
      return
    }

    const onSeeked = () => {
      video.removeEventListener('seeked', onSeeked)
      // Ensure frame is rendered
      requestAnimationFrame(() => {
        requestAnimationFrame(() => resolve())
      })
    }

    video.addEventListener('seeked', onSeeked)
    video.currentTime = time
  })
}

/**
 * Check if canvas recording is supported
 */
export function isCanvasRecordingSupported() {
  return typeof MediaRecorder !== 'undefined' &&
         typeof HTMLCanvasElement.prototype.captureStream !== 'undefined'
}
