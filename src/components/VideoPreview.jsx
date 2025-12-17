import { useRef, useEffect, useState, useCallback } from 'react'
import { detectCircles, initOpenCV } from '../lib/circleDetector'
import { CameraEngine } from '../lib/cameraEngine'

function VideoPreview({
  videoUrl,
  videoFile,
  tapEvents,
  currentTime,
  onTimeUpdate,
  onDurationChange,
  onTapEventsDetected,
  isProcessing,
  processingProgress,
  setIsProcessing,
  setProcessingProgress,
}) {
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const outputCanvasRef = useRef(null)
  const cameraEngineRef = useRef(null)
  const animationFrameRef = useRef(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [opencvReady, setOpencvReady] = useState(false)
  const [opencvError, setOpencvError] = useState(null)
  const [zoomLevel, setZoomLevel] = useState(1.5)

  // Initialize OpenCV
  useEffect(() => {
    initOpenCV()
      .then(() => {
        setOpencvReady(true)
        setOpencvError(null)
      })
      .catch((err) => {
        console.error('OpenCV init error:', err)
        setOpencvError(err.message)
      })
  }, [])

  // Initialize camera engine
  useEffect(() => {
    if (videoRef.current) {
      cameraEngineRef.current = new CameraEngine(
        videoRef.current.videoWidth || 1080,
        videoRef.current.videoHeight || 1920
      )
    }
  }, [videoUrl])

  // Render loop
  const render = useCallback(() => {
    const video = videoRef.current
    const canvas = canvasRef.current
    const outputCanvas = outputCanvasRef.current
    
    if (!video || !canvas || !outputCanvas || video.paused) {
      animationFrameRef.current = requestAnimationFrame(render)
      return
    }

    const ctx = canvas.getContext('2d')
    const outCtx = outputCanvas.getContext('2d')
    
    // Draw original video to hidden canvas
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    ctx.drawImage(video, 0, 0)

    // Get camera state
    const camera = cameraEngineRef.current
    if (camera) {
      camera.update(video.currentTime, tapEvents, zoomLevel)
      const { x, y, zoom } = camera.getState()

      // Calculate crop region
      const cropWidth = video.videoWidth / zoom
      const cropHeight = video.videoHeight / zoom
      const cropX = Math.max(0, Math.min(x - cropWidth / 2, video.videoWidth - cropWidth))
      const cropY = Math.max(0, Math.min(y - cropHeight / 2, video.videoHeight - cropHeight))

      // Draw zoomed/panned output
      outCtx.drawImage(
        canvas,
        cropX, cropY, cropWidth, cropHeight,
        0, 0, outputCanvas.width, outputCanvas.height
      )

      // Draw tap ripple effect
      const currentTap = tapEvents.find(
        t => video.currentTime >= t.time && video.currentTime < t.time + 0.5
      )
      if (currentTap) {
        const progress = (video.currentTime - currentTap.time) / 0.5
        const rippleX = ((currentTap.x - cropX) / cropWidth) * outputCanvas.width
        const rippleY = ((currentTap.y - cropY) / cropHeight) * outputCanvas.height
        const rippleRadius = 30 + progress * 50
        const rippleAlpha = 1 - progress

        outCtx.beginPath()
        outCtx.arc(rippleX, rippleY, rippleRadius, 0, Math.PI * 2)
        outCtx.strokeStyle = `rgba(0, 83, 140, ${rippleAlpha * 0.8})`
        outCtx.lineWidth = 3
        outCtx.stroke()

        outCtx.beginPath()
        outCtx.arc(rippleX, rippleY, rippleRadius * 0.6, 0, Math.PI * 2)
        outCtx.fillStyle = `rgba(187, 196, 202, ${rippleAlpha * 0.4})`
        outCtx.fill()
      }
    }

    animationFrameRef.current = requestAnimationFrame(render)
  }, [tapEvents, zoomLevel])

  useEffect(() => {
    animationFrameRef.current = requestAnimationFrame(render)
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [render])

  // Handle video metadata
  const handleLoadedMetadata = useCallback(() => {
    const video = videoRef.current
    if (video) {
      onDurationChange(video.duration)
      cameraEngineRef.current = new CameraEngine(
        video.videoWidth,
        video.videoHeight
      )
      
      // Set output canvas size (phone aspect ratio)
      const outputCanvas = outputCanvasRef.current
      if (outputCanvas) {
        outputCanvas.width = 540
        outputCanvas.height = 960
      }
    }
  }, [onDurationChange])

  // Time update handler
  const handleTimeUpdate = useCallback(() => {
    if (videoRef.current) {
      onTimeUpdate(videoRef.current.currentTime)
    }
  }, [onTimeUpdate])

  // Seek to time
  useEffect(() => {
    if (videoRef.current && Math.abs(videoRef.current.currentTime - currentTime) > 0.1) {
      videoRef.current.currentTime = currentTime
    }
  }, [currentTime])

  // Play/pause toggle
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
  }, [])

  // Detect circles
  const handleDetectTaps = useCallback(async () => {
    if (!videoRef.current || !opencvReady) return

    setIsProcessing(true)
    setProcessingProgress(0)

    try {
      const events = await detectCircles(
        videoRef.current,
        canvasRef.current,
        (progress) => setProcessingProgress(progress)
      )
      onTapEventsDetected(events)
    } catch (error) {
      console.error('Circle detection failed:', error)
    } finally {
      setIsProcessing(false)
    }
  }, [opencvReady, onTapEventsDetected, setIsProcessing, setProcessingProgress])

  return (
    <div className="glass-panel p-6">
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Original Video (hidden, for processing) */}
        <video
          ref={videoRef}
          src={videoUrl}
          className="hidden"
          onLoadedMetadata={handleLoadedMetadata}
          onTimeUpdate={handleTimeUpdate}
          onEnded={() => setIsPlaying(false)}
          muted
          playsInline
        />
        <canvas ref={canvasRef} className="hidden" />

        {/* Preview Output */}
        <div className="flex-1 flex flex-col items-center">
          <div className="relative w-full max-w-[320px] mx-auto">
            {/* Phone frame */}
            <div className="glass-panel-light p-2 rounded-[32px] shadow-glass-lg">
              <canvas
                ref={outputCanvasRef}
                className="w-full rounded-[24px] bg-mavs-navy"
                style={{ aspectRatio: '9/16' }}
              />
            </div>

            {/* Play button overlay */}
            {!isPlaying && (
              <button
                onClick={togglePlay}
                className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-[32px] transition-opacity hover:bg-black/30"
              >
                <div className="w-16 h-16 glass-panel-light rounded-full flex items-center justify-center">
                  <svg className="w-8 h-8 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </div>
              </button>
            )}
          </div>

          {/* Controls */}
          <div className="flex items-center gap-4 mt-6">
            <button onClick={togglePlay} className="glass-button">
              {isPlaying ? 'Pause' : 'Play'}
            </button>
          </div>
        </div>

        {/* Controls Panel */}
        <div className="lg:w-80 space-y-6">
          {/* Detection Controls */}
          <div className="glass-panel-light p-5 rounded-xl">
            <h3 className="text-white font-semibold mb-4">Tap Detection</h3>
            
            <button
              onClick={handleDetectTaps}
              disabled={isProcessing || !opencvReady}
              className="glass-button glass-button-accent w-full mb-4 disabled:opacity-50"
            >
              {isProcessing ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Scanning... {Math.round(processingProgress)}%
                </span>
              ) : (
                `Detect Taps ${tapEvents.length > 0 ? `(${tapEvents.length} found)` : ''}`
              )}
            </button>

            {isProcessing && (
              <div className="w-full h-2 bg-mavs-navy/50 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-mavs-blue to-mavs-silver transition-all duration-300"
                  style={{ width: `${processingProgress}%` }}
                />
              </div>
            )}

            {tapEvents.length > 0 && (
              <p className="text-mavs-silver text-sm mt-3">
                Found {tapEvents.length} tap events. The camera will now follow these points.
              </p>
            )}
          </div>

          {/* Zoom Control */}
          <div className="glass-panel-light p-5 rounded-xl">
            <h3 className="text-white font-semibold mb-4">Zoom Level</h3>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min="1"
                max="3"
                step="0.1"
                value={zoomLevel}
                onChange={(e) => setZoomLevel(parseFloat(e.target.value))}
                className="flex-1 accent-mavs-blue"
              />
              <span className="text-mavs-silver w-12 text-right">{zoomLevel.toFixed(1)}x</span>
            </div>
          </div>

          {/* Stats */}
          <div className="glass-panel-light p-5 rounded-xl">
            <h3 className="text-white font-semibold mb-4">Video Info</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-mavs-silver">OpenCV.js</span>
                <span className={opencvReady ? 'text-green-400' : opencvError ? 'text-red-400' : 'text-yellow-400'}>
                  {opencvReady ? 'Ready' : opencvError ? 'Error' : 'Loading...'}
                </span>
              </div>
              {opencvError && (
                <p className="text-red-400/80 text-xs">{opencvError}</p>
              )}
              <div className="flex justify-between">
                <span className="text-mavs-silver">Tap Events</span>
                <span className="text-white">{tapEvents.length}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default VideoPreview

