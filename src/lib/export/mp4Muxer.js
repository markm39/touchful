/**
 * MP4 Muxer using MP4Box.js
 * Combines encoded video chunks into a playable MP4 file
 */

import { createFile as createMP4File } from 'mp4box'

/**
 * Create an MP4 muxer for video chunks
 */
export function createMuxer(width, height, fps, codecConfig) {
  const file = createMP4File()
  let videoTrackId = null
  let audioTrackId = null
  let sampleNumber = 0

  // Determine codec type for MP4
  const isH264 = codecConfig.codec.startsWith('avc')
  const isVP9 = codecConfig.codec.startsWith('vp09')

  return {
    /**
     * Initialize video track with first chunk's metadata
     */
    initVideoTrack(firstChunk) {
      const trackOptions = {
        timescale: 1000000, // microseconds
        width,
        height,
        nb_samples: 0,
      }

      if (isH264) {
        // For H.264, we need to set up the avcC box from codec private data
        trackOptions.avcDecoderConfigRecord = firstChunk.metadata?.decoderConfig?.description
        videoTrackId = file.addTrack({
          ...trackOptions,
          type: 'avc1',
          // Default avcC if no description provided
          avcDecoderConfigRecord: trackOptions.avcDecoderConfigRecord || createDefaultAvcC(),
        })
      } else if (isVP9) {
        videoTrackId = file.addTrack({
          ...trackOptions,
          type: 'vp09',
        })
      } else {
        // VP8 or other
        videoTrackId = file.addTrack({
          ...trackOptions,
          type: 'vp08',
        })
      }

      return videoTrackId
    },

    /**
     * Add a video sample (encoded chunk)
     */
    addVideoSample(chunk) {
      if (!videoTrackId) {
        this.initVideoTrack(chunk)
      }

      const sample = {
        data: chunk.data.buffer,
        duration: chunk.duration || Math.round(1000000 / fps),
        dts: chunk.timestamp,
        cts: chunk.timestamp,
        is_sync: chunk.type === 'key',
      }

      file.addSample(videoTrackId, sample.data, sample)
      sampleNumber++
    },

    /**
     * Extract and add audio track from original video
     * This preserves the original audio
     */
    async addAudioFromVideo(videoFile) {
      try {
        // Use AudioContext to decode audio
        const audioContext = new AudioContext()
        const arrayBuffer = await videoFile.arrayBuffer()

        // Try to decode audio
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)

        // Create audio track
        const sampleRate = audioBuffer.sampleRate
        const channels = audioBuffer.numberOfChannels

        // For simplicity, we'll encode audio as AAC using AudioEncoder if available
        if (typeof AudioEncoder !== 'undefined') {
          await this.encodeAndAddAudio(audioBuffer, audioContext)
        } else {
          console.warn('[MP4Muxer] AudioEncoder not available, video will have no audio')
        }

        audioContext.close()
      } catch (e) {
        console.warn('[MP4Muxer] Could not extract audio:', e.message)
      }
    },

    /**
     * Encode audio buffer and add to muxer
     */
    async encodeAndAddAudio(audioBuffer, audioContext) {
      return new Promise((resolve, reject) => {
        const sampleRate = audioBuffer.sampleRate
        const channels = Math.min(2, audioBuffer.numberOfChannels) // Max stereo

        // Check if AAC encoding is supported
        AudioEncoder.isConfigSupported({
          codec: 'mp4a.40.2', // AAC-LC
          sampleRate,
          numberOfChannels: channels,
        }).then(support => {
          if (!support.supported) {
            console.warn('[MP4Muxer] AAC encoding not supported')
            resolve()
            return
          }

          const audioChunks = []

          const audioEncoder = new AudioEncoder({
            output: (chunk) => {
              const data = new Uint8Array(chunk.byteLength)
              chunk.copyTo(data)
              audioChunks.push({
                data,
                timestamp: chunk.timestamp,
                duration: chunk.duration,
              })
            },
            error: (e) => {
              console.error('[MP4Muxer] Audio encoder error:', e)
              resolve()
            }
          })

          audioEncoder.configure({
            codec: 'mp4a.40.2',
            sampleRate,
            numberOfChannels: channels,
            bitrate: 128000,
          })

          // Convert AudioBuffer to AudioData and encode
          const frameSize = 1024 // AAC frame size
          const totalSamples = audioBuffer.length
          const channelData = []

          for (let c = 0; c < channels; c++) {
            channelData.push(audioBuffer.getChannelData(c))
          }

          // Process in chunks
          for (let offset = 0; offset < totalSamples; offset += frameSize) {
            const samplesInFrame = Math.min(frameSize, totalSamples - offset)
            const interleavedData = new Float32Array(samplesInFrame * channels)

            // Interleave channels
            for (let i = 0; i < samplesInFrame; i++) {
              for (let c = 0; c < channels; c++) {
                interleavedData[i * channels + c] = channelData[c][offset + i]
              }
            }

            const audioData = new AudioData({
              format: 'f32-planar',
              sampleRate,
              numberOfFrames: samplesInFrame,
              numberOfChannels: channels,
              timestamp: (offset / sampleRate) * 1000000,
              data: interleavedData,
            })

            audioEncoder.encode(audioData)
            audioData.close()
          }

          audioEncoder.flush().then(() => {
            // Add audio track
            if (audioChunks.length > 0) {
              audioTrackId = file.addTrack({
                type: 'mp4a',
                timescale: 1000000,
                samplerate: sampleRate,
                channel_count: channels,
              })

              for (const chunk of audioChunks) {
                file.addSample(audioTrackId, chunk.data.buffer, {
                  duration: chunk.duration || Math.round(1000000 * frameSize / sampleRate),
                  dts: chunk.timestamp,
                  cts: chunk.timestamp,
                  is_sync: true,
                })
              }
            }

            audioEncoder.close()
            resolve()
          })
        })
      })
    },

    /**
     * Finalize and return the MP4 blob
     */
    finalize() {
      // Get the MP4 data
      const arrayBuffer = file.getBuffer()
      return new Blob([arrayBuffer], { type: 'video/mp4' })
    },

    /**
     * Get statistics
     */
    getStats() {
      return {
        videoTrackId,
        audioTrackId,
        sampleCount: sampleNumber,
      }
    }
  }
}

/**
 * Create a default AVC decoder config record
 * This is a minimal avcC box for H.264 Baseline profile
 */
function createDefaultAvcC() {
  // Minimal avcC for H.264 Baseline Level 3.0
  return new Uint8Array([
    0x01, // configurationVersion
    0x42, // AVCProfileIndication (Baseline)
    0x00, // profile_compatibility
    0x1E, // AVCLevelIndication (Level 3.0)
    0xFF, // lengthSizeMinusOne (4 bytes NAL length)
    0xE1, // numOfSequenceParameterSets (1)
    // SPS would go here in real implementation
    0x00, 0x00, // spsLength (placeholder)
    0x01, // numOfPictureParameterSets
    0x00, 0x00, // ppsLength (placeholder)
  ])
}

/**
 * Simple muxer that just writes raw video chunks
 * Fallback when MP4Box has issues
 */
export function createSimpleMuxer() {
  const chunks = []

  return {
    addVideoSample(chunk) {
      chunks.push(chunk)
    },

    async addAudioFromVideo() {
      // No-op for simple muxer
    },

    finalize() {
      // Just concatenate chunks - this creates a raw bitstream, not MP4
      // This is a fallback, won't be playable directly
      const totalSize = chunks.reduce((sum, c) => sum + c.data.byteLength, 0)
      const result = new Uint8Array(totalSize)
      let offset = 0
      for (const chunk of chunks) {
        result.set(chunk.data, offset)
        offset += chunk.data.byteLength
      }
      return new Blob([result], { type: 'video/mp4' })
    },

    getStats() {
      return { sampleCount: chunks.length }
    }
  }
}
