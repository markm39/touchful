/**
 * WebCodecs VideoEncoder wrapper for hardware-accelerated video encoding
 */

/**
 * Check if WebCodecs VideoEncoder is supported
 */
export function isWebCodecsSupported() {
  return typeof VideoEncoder !== 'undefined' && typeof VideoFrame !== 'undefined'
}

/**
 * Get optimal codec configuration for the browser
 */
export async function getCodecConfig(width, height, fps = 30) {
  // Try H.264 first (most compatible), then VP9, then VP8
  const codecs = [
    { codec: 'avc1.42001E', name: 'H.264 Baseline' },  // H.264 Baseline Level 3
    { codec: 'avc1.4D001E', name: 'H.264 Main' },      // H.264 Main Level 3
    { codec: 'vp09.00.10.08', name: 'VP9' },           // VP9 Profile 0
    { codec: 'vp8', name: 'VP8' },
  ]

  for (const { codec, name } of codecs) {
    try {
      const config = {
        codec,
        width,
        height,
        bitrate: Math.round(width * height * fps * 0.1), // ~0.1 bits per pixel per frame
        framerate: fps,
        latencyMode: 'quality',
        avc: codec.startsWith('avc') ? { format: 'annexb' } : undefined,
      }

      const support = await VideoEncoder.isConfigSupported(config)
      if (support.supported) {
        console.log(`[WebCodecs] Using codec: ${name}`)
        return { ...config, codecName: name }
      }
    } catch (e) {
      // Try next codec
    }
  }

  throw new Error('No supported video codec found')
}

/**
 * Create and configure a VideoEncoder
 */
export function createEncoder(config, onChunk, onError) {
  const chunks = []
  let chunkCount = 0

  const encoder = new VideoEncoder({
    output: (chunk, metadata) => {
      // Clone chunk data since it may be recycled
      const data = new Uint8Array(chunk.byteLength)
      chunk.copyTo(data)

      const chunkInfo = {
        data,
        timestamp: chunk.timestamp,
        duration: chunk.duration,
        type: chunk.type, // 'key' or 'delta'
        metadata,
      }

      chunks.push(chunkInfo)
      chunkCount++

      if (onChunk) onChunk(chunkInfo, chunkCount)
    },
    error: (e) => {
      console.error('[WebCodecs] Encoder error:', e)
      if (onError) onError(e)
    }
  })

  // Remove codecName before configuring
  const { codecName, ...encoderConfig } = config
  encoder.configure(encoderConfig)

  return {
    encoder,
    chunks,
    codecName,

    /**
     * Encode a single frame from canvas
     */
    async encodeFrame(canvas, timestamp, keyFrame = false) {
      // Create VideoFrame from canvas
      const frame = new VideoFrame(canvas, {
        timestamp, // microseconds
        alpha: 'discard',
      })

      encoder.encode(frame, { keyFrame })
      frame.close()
    },

    /**
     * Flush encoder and return all chunks
     */
    async flush() {
      await encoder.flush()
      return chunks
    },

    /**
     * Close encoder
     */
    close() {
      encoder.close()
    }
  }
}

/**
 * Estimate encoding time based on video properties
 */
export function estimateEncodingTime(width, height, duration, fps) {
  const totalFrames = Math.ceil(duration * fps)
  // Rough estimate: ~500 frames/second with WebCodecs on modern hardware
  const estimatedSeconds = totalFrames / 500
  return Math.max(1, Math.ceil(estimatedSeconds))
}
