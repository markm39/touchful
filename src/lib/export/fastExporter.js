/**
 * Fast video exporter using WebCodecs + mp4-muxer
 *
 * This is the production-ready approach:
 * - WebCodecs VideoEncoder for hardware-accelerated encoding
 * - mp4-muxer for creating valid MP4 files
 * - Frame-by-frame canvas rendering for exact preview match
 */

import { Muxer as Mp4Muxer, ArrayBufferTarget as Mp4ArrayBufferTarget } from 'mp4-muxer'
import { Muxer as WebmMuxer, ArrayBufferTarget as WebmArrayBufferTarget } from 'webm-muxer'
import { CameraEngine } from '../cameraEngine'
import { getOutputDimensions, renderFrame } from '../frameRenderer'

/**
 * Check if fast export is supported
 */
export function isFastExportSupported() {
  return typeof VideoEncoder !== 'undefined' && typeof VideoFrame !== 'undefined'
}

/**
 * Export video using WebCodecs + mp4-muxer
 */
export async function exportFast(videoFile, settings, onProgress) {
  console.log('[FastExporter] Starting export with settings:', {
    tapEvents: settings.tapEvents?.length || 0,
    outputAspect: settings.outputAspect,
    showDeviceFrame: settings.showDeviceFrame,
    videoTransform: settings.videoTransform,
    appliedCrop: settings.appliedCrop,
    zoomLevel: settings.zoomLevel,
  })

  const {
    tapEvents = [],
    outputAspect = '9:16',
    showDeviceFrame = true,
    videoTransform = { scale: 1, x: 0, y: 0, stretch: false },
    appliedCrop = { x: 0, y: 0, width: 100, height: 100 },
    zoomLevel = 1.4,
    selectedBackground = 'ocean',
    selectedDevice = 'match',
    showNotch = true,
  } = settings

  onProgress({ phase: 'init', percent: 2, message: 'Loading video...' })

  // Create video element for seeking
  const video = document.createElement('video')
  video.src = URL.createObjectURL(videoFile)
  video.muted = true
  video.playsInline = true
  video.preload = 'auto'

  await new Promise((resolve, reject) => {
    video.onloadedmetadata = resolve
    video.onerror = reject
  })

  // Ensure video is loaded enough to seek
  await new Promise((resolve) => {
    if (video.readyState >= 2) resolve()
    else video.oncanplay = resolve
  })

  const videoW = video.videoWidth
  const videoH = video.videoHeight
  const duration = video.duration
  const fps = 30

  // Get output dimensions (pass appliedCrop so 'match' uses cropped aspect, ensure even for H.264)
  let { width: outW, height: outH } = getOutputDimensions(outputAspect, videoW, videoH, 1080, 1920, appliedCrop)
  outW = Math.ceil(outW / 2) * 2
  outH = Math.ceil(outH / 2) * 2

  onProgress({ phase: 'init', percent: 5, message: 'Setting up encoder...' })

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

  // Set up VideoEncoder first to determine codec
  const totalFrames = Math.ceil(duration * fps)
  let encodedFrames = 0
  let encoderError = null

  console.log('[FastExporter] Total frames to encode:', totalFrames)
  console.log('[FastExporter] Output dimensions:', outW, 'x', outH)

  // Try different codecs in order of preference
  const codecOptions = [
    // H.264 with avc format (best for mp4-muxer)
    {
      codec: 'avc1.42001f',
      avc: { format: 'avc' },
      muxerCodec: 'avc',
      container: 'mp4',
      name: 'H.264 Baseline (avc)'
    },
    {
      codec: 'avc1.4d001f',
      avc: { format: 'avc' },
      muxerCodec: 'avc',
      container: 'mp4',
      name: 'H.264 Main (avc)'
    },
    // H.264 without avc format - might work on some systems
    {
      codec: 'avc1.42001f',
      muxerCodec: 'avc',
      container: 'mp4',
      name: 'H.264 Baseline (annexb)'
    },
    {
      codec: 'avc1.4d001f',
      muxerCodec: 'avc',
      container: 'mp4',
      name: 'H.264 Main (annexb)'
    },
    // H.264 with different levels
    {
      codec: 'avc1.42E01E',
      avc: { format: 'avc' },
      muxerCodec: 'avc',
      container: 'mp4',
      name: 'H.264 Baseline L3'
    },
    {
      codec: 'avc1.640028',
      avc: { format: 'avc' },
      muxerCodec: 'avc',
      container: 'mp4',
      name: 'H.264 High L4'
    },
    // VP9 -> WebM container (fallback)
    {
      codec: 'vp09.00.10.08',
      muxerCodec: 'V_VP9',
      container: 'webm',
      name: 'VP9'
    },
  ]

  let selectedCodec = null
  let muxerCodec = 'avc'
  let containerFormat = 'mp4'

  for (const option of codecOptions) {
    const config = {
      codec: option.codec,
      width: outW,
      height: outH,
      bitrate: 4_000_000,
      framerate: fps,
      latencyMode: 'quality',
    }
    if (option.avc) {
      config.avc = option.avc
    }

    try {
      console.log('[FastExporter] Trying codec:', option.name, `(${option.codec})`)
      const support = await VideoEncoder.isConfigSupported(config)
      console.log('[FastExporter] Codec', option.name, 'supported:', support.supported)
      if (support.supported) {
        selectedCodec = config
        muxerCodec = option.muxerCodec
        containerFormat = option.container
        console.log('[FastExporter] Selected:', option.name, '-> container:', containerFormat)
        break
      }
    } catch (e) {
      console.log('[FastExporter] Codec', option.name, 'error:', e.message)
    }
  }

  if (!selectedCodec) {
    const error = new Error('No supported video codec found')
    error.useFallback = true
    throw error
  }

  // Create the appropriate muxer based on container format
  let muxer, target

  if (containerFormat === 'webm') {
    // Use WebM muxer for VP9/VP8
    target = new WebmArrayBufferTarget()
    muxer = new WebmMuxer({
      target,
      video: {
        codec: muxerCodec,
        width: outW,
        height: outH,
      },
      firstTimestampBehavior: 'offset',
    })
    console.log('[FastExporter] Using WebM muxer')
  } else {
    // Use MP4 muxer for H.264
    target = new Mp4ArrayBufferTarget()
    muxer = new Mp4Muxer({
      target,
      video: {
        codec: muxerCodec,
        width: outW,
        height: outH,
      },
      fastStart: 'in-memory',
      firstTimestampBehavior: 'offset',
    })
    console.log('[FastExporter] Using MP4 muxer')
  }

  // Create encoder with muxer callback
  const encoder = new VideoEncoder({
    output: (chunk, meta) => {
      if (encodedFrames === 0) {
        console.log('[FastExporter] First chunk:', {
          type: chunk.type,
          byteLength: chunk.byteLength,
          timestamp: chunk.timestamp,
          duration: chunk.duration,
          hasDecoderConfig: !!meta?.decoderConfig,
          decoderConfigSize: meta?.decoderConfig?.description?.byteLength
        })
      }
      muxer.addVideoChunk(chunk, meta)
      encodedFrames++
    },
    error: (e) => {
      console.error('[FastExporter] Encoder error:', e)
      encoderError = e
    }
  })

  encoder.configure(selectedCodec)

  onProgress({ phase: 'encoding', percent: 10, message: 'Encoding frames...' })

  // Process each frame
  const keyFrameInterval = fps * 2 // Keyframe every 2 seconds

  try {
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
        selectedBackground,
        selectedDevice,
        showNotch,
        camera,
      })

      // Create VideoFrame from canvas
      const frame = new VideoFrame(outputCanvas, {
        timestamp: Math.round(currentTime * 1_000_000), // microseconds
      })

      // Encode frame
      const isKeyFrame = frameIdx % keyFrameInterval === 0
      encoder.encode(frame, { keyFrame: isKeyFrame })
      frame.close()

      // Progress update
      const percent = 10 + (frameIdx / totalFrames) * 85
      if (frameIdx % 5 === 0) {
        try {
          onProgress({
            phase: 'encoding',
            percent,
            message: `Frame ${frameIdx + 1}/${totalFrames}`,
          })
        } catch (e) {
          // Ignore progress callback errors
        }
      }
    }
  } catch (loopError) {
    console.error('[FastExporter] Error in encoding loop:', loopError)
    throw loopError
  }

  onProgress({ phase: 'finalizing', percent: 95, message: 'Finalizing...' })

  console.log('[FastExporter] Frames encoded:', encodedFrames)

  if (encoderError) {
    throw new Error(`Encoder error: ${encoderError.message}`)
  }

  // Flush encoder and finalize muxer
  await encoder.flush()
  console.log('[FastExporter] Encoder flushed, total encoded frames:', encodedFrames)

  encoder.close()

  // Finalize muxer - this writes the moov atom
  console.log('[FastExporter] Finalizing muxer...')
  try {
    muxer.finalize()
    console.log('[FastExporter] Muxer finalized successfully')
  } catch (muxerError) {
    console.error('[FastExporter] Muxer finalize error:', muxerError)
    throw new Error(`Muxer failed: ${muxerError.message}`)
  }

  // Get the final MP4 data - access via muxer.target after finalize
  const mp4Data = muxer.target.buffer
  console.log('[FastExporter] Final MP4 size:', mp4Data.byteLength, 'bytes')

  // Log first few bytes to verify it's a valid MP4 (should start with ftyp)
  const header = new Uint8Array(mp4Data.slice(0, 12))
  console.log('[FastExporter] File header:', Array.from(header).map(b => b.toString(16).padStart(2, '0')).join(' '))

  if (mp4Data.byteLength === 0) {
    throw new Error('Export produced empty file - no frames were encoded')
  }

  // Cleanup
  URL.revokeObjectURL(video.src)

  onProgress({ phase: 'done', percent: 100, message: 'Export complete!' })

  // Return with correct mime type based on container
  const mimeType = containerFormat === 'webm' ? 'video/webm' : 'video/mp4'
  const extension = containerFormat === 'webm' ? 'webm' : 'mp4'

  console.log('[FastExporter] Export complete:', extension, mp4Data.byteLength, 'bytes')

  return {
    data: new Uint8Array(mp4Data),
    mimeType,
    extension,
  }
}

/**
 * Seek video to specific time with precision
 */
function seekVideo(video, time) {
  return new Promise((resolve) => {
    // If already at the right time, skip
    if (Math.abs(video.currentTime - time) < 0.02) {
      resolve()
      return
    }

    const onSeeked = () => {
      video.removeEventListener('seeked', onSeeked)
      // Wait for frame to be decoded
      requestAnimationFrame(() => resolve())
    }

    video.addEventListener('seeked', onSeeked)
    video.currentTime = time
  })
}
