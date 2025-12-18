/**
 * Video Renderer - Export orchestrator
 *
 * Uses WebCodecs + mp4-muxer for fast, hardware-accelerated export.
 * Falls back to FFmpeg.wasm for browsers without WebCodecs support.
 *
 * The export exactly matches the preview by using the same rendering
 * pipeline (frameRenderer.js) with tap animations, camera zoom/pan, etc.
 */

import { exportFast, isFastExportSupported } from './export/fastExporter'
import { getOutputDimensions } from './frameRenderer'

// FFmpeg fallback (lazy loaded)
let ffmpegModule = null

/**
 * Main export function
 * Automatically chooses the best export method for the browser
 */
export async function renderVideo(videoFile, previewSettings, onProgress) {
  const progressCallback = (info) => {
    if (typeof info === 'number') {
      onProgress(info)
    } else {
      onProgress(info.percent)
    }
  }

  // Try fast export first (WebCodecs + mp4-muxer)
  if (isFastExportSupported()) {
    console.log('[VideoRenderer] Using WebCodecs + mp4-muxer (fast export)')
    try {
      const result = await exportFast(videoFile, previewSettings, progressCallback)
      return result.data
    } catch (error) {
      console.warn('[VideoRenderer] Fast export failed, falling back to FFmpeg:', error)
    }
  }

  // Fallback to FFmpeg
  console.log('[VideoRenderer] Using FFmpeg.wasm (fallback)')
  return renderWithFFmpeg(videoFile, previewSettings, onProgress)
}

/**
 * Export and get result with metadata (mime type, extension)
 */
export async function renderVideoWithMetadata(videoFile, previewSettings, onProgress) {
  console.log('[VideoRenderer] renderVideoWithMetadata called')
  console.log('[VideoRenderer] isFastExportSupported:', isFastExportSupported())

  const progressCallback = (info) => {
    if (typeof info === 'number') {
      onProgress(info)
    } else {
      onProgress(info.percent)
    }
  }

  if (isFastExportSupported()) {
    try {
      console.log('[VideoRenderer] Attempting fast export...')
      const result = await exportFast(videoFile, previewSettings, progressCallback)
      console.log('[VideoRenderer] Fast export result:', result ? `${result.data?.length} bytes` : 'null')
      return result
    } catch (error) {
      console.error('[VideoRenderer] Fast export failed:', error)
      // If codec not supported, fall back to FFmpeg
      if (error.useFallback || error.message?.includes('codec')) {
        console.log('[VideoRenderer] Falling back to FFmpeg due to codec issues')
      } else {
        // Re-throw unexpected errors
        throw error
      }
    }
  }

  // FFmpeg always produces MP4
  console.log('[VideoRenderer] Using FFmpeg fallback')
  const data = await renderWithFFmpeg(videoFile, previewSettings, onProgress)
  return { data, mimeType: 'video/mp4', extension: 'mp4' }
}

/**
 * FFmpeg-based rendering (fallback for older browsers)
 * Note: This cannot render tap animations, only basic zoom/pan via filters
 */
async function renderWithFFmpeg(videoFile, previewSettings, onProgress) {
  // Lazy load FFmpeg to reduce initial bundle size
  if (!ffmpegModule) {
    ffmpegModule = await import('./ffmpegExporter')
  }

  return ffmpegModule.renderWithFFmpeg(videoFile, previewSettings, onProgress)
}

// Re-export for backward compatibility
export { getOutputDimensions }

/**
 * Check which export method will be used
 */
export function getExportMethod() {
  if (isFastExportSupported()) return 'webcodecs'
  return 'ffmpeg'
}

/**
 * Get estimated export time in seconds
 */
export function getEstimatedExportTime(duration, width, height) {
  if (isFastExportSupported()) {
    // WebCodecs: limited by video seeking (~30-50 seeks/sec) + encoding
    const fps = 30
    const totalFrames = duration * fps
    return Math.ceil(totalFrames / 25) // ~25 frames/sec with seeking overhead
  } else {
    // FFmpeg: much slower
    const fps = 30
    const totalFrames = duration * fps
    return Math.ceil(totalFrames / 8)
  }
}

/**
 * Get the file extension for exports
 */
export function getExportExtension() {
  return 'mp4'
}

