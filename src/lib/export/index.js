/**
 * Video Export Module
 *
 * Provides fast, hardware-accelerated video export using WebCodecs API
 * with automatic fallback to FFmpeg.wasm for unsupported browsers.
 *
 * Architecture:
 * 1. WebCodecs VideoEncoder - Hardware-accelerated H.264 encoding
 * 2. Canvas rendering - Frame-by-frame with effects (tap animations, zoom/pan)
 * 3. MP4Box.js - Muxing encoded chunks into playable MP4
 *
 * Performance:
 * - WebCodecs: ~3-10 seconds for 30-second video (depending on hardware)
 * - FFmpeg fallback: ~30-90 seconds for same video
 */

export { exportWithWebCodecs, canUseFastExport, estimateExportTime } from './webCodecsExporter'
export { isWebCodecsSupported, getCodecConfig, createEncoder } from './webCodecsEncoder'
export { createMuxer, createSimpleMuxer } from './mp4Muxer'
