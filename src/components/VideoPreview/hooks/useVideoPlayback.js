import { useState, useCallback, useEffect } from 'react'
import { CameraEngine } from '../../../lib/cameraEngine'

/**
 * Hook to manage video playback state
 */
export function useVideoPlayback(videoRef, cameraEngineRef, currentTime, onTimeUpdate, onDurationChange) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [videoAspectRatio, setVideoAspectRatio] = useState(9 / 16)

  // Sync video time with currentTime prop
  useEffect(() => {
    if (videoRef.current) {
      const diff = Math.abs(videoRef.current.currentTime - currentTime)
      if (diff > 0.01) {
        videoRef.current.currentTime = currentTime
      }
    }
  }, [currentTime, videoRef])

  // Reset camera when seeking to beginning
  useEffect(() => {
    if (currentTime < 0.1 && cameraEngineRef.current) {
      cameraEngineRef.current.reset()
    }
  }, [currentTime, cameraEngineRef])

  const handleLoadedMetadata = useCallback(() => {
    const video = videoRef.current
    if (video) {
      onDurationChange(video.duration)
      if (video.videoWidth && video.videoHeight) {
        setVideoAspectRatio(video.videoWidth / video.videoHeight)
      }
      cameraEngineRef.current = new CameraEngine(video.videoWidth, video.videoHeight)
      cameraEngineRef.current.reset()
    }
  }, [videoRef, cameraEngineRef, onDurationChange])

  const handleTimeUpdate = useCallback(() => {
    if (videoRef.current && isPlaying) {
      onTimeUpdate(videoRef.current.currentTime)
    }
  }, [videoRef, onTimeUpdate, isPlaying])

  const togglePlay = useCallback(() => {
    const video = videoRef.current
    if (!video) return
    if (video.paused) {
      video.play()
      setIsPlaying(true)
    } else {
      video.pause()
      setIsPlaying(false)
    }
  }, [videoRef])

  const handleEnded = useCallback(() => {
    setIsPlaying(false)
  }, [])

  return {
    isPlaying,
    videoAspectRatio,
    handleLoadedMetadata,
    handleTimeUpdate,
    handleEnded,
    togglePlay,
  }
}
