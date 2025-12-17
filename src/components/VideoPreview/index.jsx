import { useRef, useState, useCallback, useEffect } from 'react'
import { detectCircles, findGreyCircleLive, setCalibration } from '../../lib/circleDetector'
import { CameraEngine } from '../../lib/cameraEngine'
import { useOpenCVInit, useVideoPlayback, useVideoTransform, useCropTool } from './hooks'
import { PreviewOverlays } from './components'

// Device presets
const DEVICES = {
  match: { name: 'Match Video', aspect: '9/16', radius: 24, bezel: 0, dynamic: true },
  iphone: { name: 'iPhone', aspect: '9/19.5', radius: 44, bezel: 8 },
  ipad: { name: 'iPad', aspect: '3/4', radius: 18, bezel: 8 },
  android: { name: 'Android', aspect: '9/20', radius: 32, bezel: 6 },
  square: { name: 'Square', aspect: '1/1', radius: 20, bezel: 8 },
  wide: { name: 'Widescreen', aspect: '16/9', radius: 12, bezel: 4 },
}

// Gradient backgrounds
const BACKGROUNDS = {
  midnight: { name: 'Midnight', gradient: 'linear-gradient(135deg, #0c0c1e 0%, #1a1a3e 50%, #2d1b4e 100%)' },
  ocean: { name: 'Ocean', gradient: 'linear-gradient(135deg, #001428 0%, #003366 50%, #004d80 100%)' },
  sunset: { name: 'Sunset', gradient: 'linear-gradient(135deg, #1a0a2e 0%, #3d1a5c 30%, #6b2d5b 60%, #8b3a4f 100%)' },
  aurora: { name: 'Aurora', gradient: 'linear-gradient(135deg, #0a1628 0%, #1a3a4a 30%, #2a5a5a 60%, #1a4a3a 100%)' },
  ember: { name: 'Ember', gradient: 'linear-gradient(135deg, #1a0a0a 0%, #3d1a1a 40%, #5c2a1a 70%, #4a2010 100%)' },
  lavender: { name: 'Lavender', gradient: 'linear-gradient(135deg, #1a1a2e 0%, #2a2a4e 40%, #3a3a6e 70%, #4a4a8e 100%)' },
}

// Tap animations
const TAP_ANIMATIONS = {
  ripple: { name: 'Ripple', color: '#00538C' },
  pulse: { name: 'Pulse', color: '#6366f1' },
  glow: { name: 'Glow', color: '#10b981' },
  ring: { name: 'Ring', color: '#f97316' },
  dot: { name: 'Dot', color: '#ec4899' },
  none: { name: 'None', color: 'transparent' },
}

// Output aspect ratios
const OUTPUT_ASPECTS = {
  '9:16': { name: '9:16', ratio: 9/16, desc: 'TikTok/Reels' },
  '4:5': { name: '4:5', ratio: 4/5, desc: 'Instagram' },
  '1:1': { name: '1:1', ratio: 1, desc: 'Square' },
  '16:9': { name: '16:9', ratio: 16/9, desc: 'YouTube' },
  'match': { name: 'Match', ratio: null, desc: 'Match video' },
}

function VideoPreview({
  videoUrl,
  tapEvents,
  currentTime,
  onTimeUpdate,
  onDurationChange,
  onTapEventsDetected,
  isProcessing,
  processingProgress,
  setIsProcessing,
  setProcessingProgress,
  selectedTapIndex,
  onSelectTap,
  // Lifted state for export sharing
  outputAspect,
  setOutputAspect,
  showDeviceFrame,
  setShowDeviceFrame,
  zoomLevel,
  setZoomLevel,
  videoTransform,
  setVideoTransform,
  appliedCrop,
  setAppliedCrop,
  selectedBackground,
  setSelectedBackground,
  selectedDevice,
  setSelectedDevice,
}) {
  // Refs
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const outputCanvasRef = useRef(null)
  const containerRef = useRef(null)
  const cameraEngineRef = useRef(null)
  const animationFrameRef = useRef(null)

  // Custom hooks
  const { opencvReady } = useOpenCVInit()
  const {
    isPlaying, videoAspectRatio, handleLoadedMetadata, handleTimeUpdate, handleEnded, togglePlay
  } = useVideoPlayback(videoRef, cameraEngineRef, currentTime, onTimeUpdate, onDurationChange)
  const {
    editMode, setEditMode, snapGuides, handleDragStart, resetTransform
  } = useVideoTransform(containerRef, videoTransform, setVideoTransform)
  const {
    cropMode, cropBounds, handleCropDragStart, enterCropMode, applyCrop, cancelCrop, resetCrop
  } = useCropTool(containerRef, appliedCrop, setAppliedCrop)

  // Local state (not shared with export)
  const [selectedAnimation, setSelectedAnimation] = useState('pulse')
  const [showDebug, setShowDebug] = useState(false)
  const lastDebugPositionRef = useRef(null)

  // Autodetect calibration state
  const [autodetectMode, setAutodetectMode] = useState(false)
  const [calibrationStep, setCalibrationStep] = useState(null)
  const [targetCirclePos, setTargetCirclePos] = useState(null)
  const [targetCircleRadius, setTargetCircleRadius] = useState(40)
  const [excludePosition, setExcludePosition] = useState(null)
  const [excludeRadius, setExcludeRadius] = useState(40)
  const [isDraggingMarker, setIsDraggingMarker] = useState(null)

  // Tap dragging state
  const [isDraggingTap, setIsDraggingTap] = useState(false)
  const [tapDragStart, setTapDragStart] = useState(null)

  // Draw tap animation helper
  const drawTapAnimation = useCallback((ctx, tap, progress, canvasWidth, canvasHeight, cropX, cropY, cropWidth, cropHeight) => {
    if (!tap.animation || tap.animation === 'none') return
    const x = ((tap.x - cropX) / cropWidth) * canvasWidth
    const y = ((tap.y - cropY) / cropHeight) * canvasHeight
    const anim = TAP_ANIMATIONS[tap.animation] || TAP_ANIMATIONS.ripple
    const alpha = 1 - progress
    ctx.save()
    switch (tap.animation) {
      case 'ripple':
        const rippleRadius = 20 + progress * 60
        ctx.beginPath()
        ctx.arc(x, y, rippleRadius, 0, Math.PI * 2)
        ctx.strokeStyle = `${anim.color}${Math.round(alpha * 200).toString(16).padStart(2, '0')}`
        ctx.lineWidth = 3
        ctx.stroke()
        break
      case 'pulse':
        const pulseRadius = 15 + Math.sin(progress * Math.PI) * 25
        ctx.beginPath()
        ctx.arc(x, y, pulseRadius, 0, Math.PI * 2)
        ctx.fillStyle = `${anim.color}${Math.round(alpha * 150).toString(16).padStart(2, '0')}`
        ctx.fill()
        break
      case 'glow':
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, 50 + progress * 30)
        gradient.addColorStop(0, `${anim.color}${Math.round(alpha * 180).toString(16).padStart(2, '0')}`)
        gradient.addColorStop(1, 'transparent')
        ctx.fillStyle = gradient
        ctx.fillRect(x - 80, y - 80, 160, 160)
        break
      case 'ring':
        const ringRadius = 25 + progress * 40
        ctx.beginPath()
        ctx.arc(x, y, ringRadius, 0, Math.PI * 2)
        ctx.strokeStyle = `${anim.color}${Math.round(alpha * 255).toString(16).padStart(2, '0')}`
        ctx.lineWidth = 4
        ctx.stroke()
        break
      case 'dot':
        const dotRadius = 12 * (1 - progress * 0.5)
        ctx.beginPath()
        ctx.arc(x, y, dotRadius, 0, Math.PI * 2)
        ctx.fillStyle = `${anim.color}${Math.round(alpha * 255).toString(16).padStart(2, '0')}`
        ctx.fill()
        break
    }
    ctx.restore()
  }, [])

  // Main render loop
  const render = useCallback(() => {
    const video = videoRef.current
    const canvas = canvasRef.current
    const outputCanvas = outputCanvasRef.current
    if (!video || !canvas || !outputCanvas || video.readyState < 2) {
      animationFrameRef.current = requestAnimationFrame(render)
      return
    }
    const ctx = canvas.getContext('2d')
    const outCtx = outputCanvas.getContext('2d')
    canvas.width = video.videoWidth || 1080
    canvas.height = video.videoHeight || 1920
    ctx.drawImage(video, 0, 0)
    const videoW = video.videoWidth || 1080
    const videoH = video.videoHeight || 1920

    // Set output canvas size based on output aspect ratio
    const maxWidth = 340, maxHeight = 600
    const outputAspectConfig = OUTPUT_ASPECTS[outputAspect]
    let targetAspect
    if (outputAspect === 'match') {
      targetAspect = videoW / videoH
    } else {
      targetAspect = outputAspectConfig.ratio
    }
    if (targetAspect > maxWidth / maxHeight) {
      outputCanvas.width = maxWidth
      outputCanvas.height = maxWidth / targetAspect
    } else {
      outputCanvas.height = maxHeight
      outputCanvas.width = maxHeight * targetAspect
    }

    const camera = cameraEngineRef.current
    if (camera) {
      camera.update(video.currentTime, tapEvents, zoomLevel)
      const { x, y, zoom } = camera.getState()
      const viewW = videoW / zoom, viewH = videoH / zoom
      const cropX = Math.max(0, Math.min(x - viewW / 2, videoW - viewW))
      const cropY = Math.max(0, Math.min(y - viewH / 2, videoH - viewH))
      const cropWidth = viewW, cropHeight = viewH
      const { scale, x: offsetX, y: offsetY, stretch } = videoTransform
      let scaledWidth, scaledHeight, drawX, drawY
      // Video-only mode or stretch: fill the entire canvas
      if (!showDeviceFrame || stretch) {
        scaledWidth = outputCanvas.width
        scaledHeight = outputCanvas.height
        drawX = 0
        drawY = 0
      } else {
        scaledWidth = outputCanvas.width * scale
        scaledHeight = outputCanvas.height * scale
        drawX = (outputCanvas.width - scaledWidth) / 2 + offsetX
        drawY = (outputCanvas.height - scaledHeight) / 2 + offsetY
      }
      outCtx.fillStyle = '#000'
      outCtx.fillRect(0, 0, outputCanvas.width, outputCanvas.height)
      const hasCrop = appliedCrop.x !== 0 || appliedCrop.y !== 0 || appliedCrop.width !== 100 || appliedCrop.height !== 100
      if (hasCrop) {
        outCtx.save()
        const clipX = (appliedCrop.x / 100) * outputCanvas.width
        const clipY = (appliedCrop.y / 100) * outputCanvas.height
        const clipW = (appliedCrop.width / 100) * outputCanvas.width
        const clipH = (appliedCrop.height / 100) * outputCanvas.height
        outCtx.beginPath()
        outCtx.rect(clipX, clipY, clipW, clipH)
        outCtx.clip()
      }
      outCtx.drawImage(canvas, cropX, cropY, cropWidth, cropHeight, drawX, drawY, scaledWidth, scaledHeight)
      if (hasCrop) outCtx.restore()

      // Debug view
      if (showDebug && ctx) {
        const liveCircle = findGreyCircleLive(ctx, canvas.width, canvas.height, lastDebugPositionRef.current)
        if (liveCircle) {
          lastDebugPositionRef.current = { x: liveCircle.x, y: liveCircle.y }
          const relX = (liveCircle.x - cropX) / cropWidth
          const relY = (liveCircle.y - cropY) / cropHeight
          const screenX = drawX + relX * scaledWidth
          const screenY = drawY + relY * scaledHeight
          if (relX >= 0 && relX <= 1 && relY >= 0 && relY <= 1) {
            const scaledRadius = (liveCircle.radius / cropWidth) * scaledWidth
            outCtx.beginPath()
            outCtx.arc(screenX, screenY, Math.max(scaledRadius, 15), 0, Math.PI * 2)
            outCtx.strokeStyle = '#00ff00'
            outCtx.lineWidth = 3
            outCtx.stroke()
            outCtx.beginPath()
            outCtx.arc(screenX, screenY, 4, 0, Math.PI * 2)
            outCtx.fillStyle = '#00ff00'
            outCtx.fill()
            outCtx.fillStyle = '#00ff00'
            outCtx.font = 'bold 14px monospace'
            outCtx.fillText(`Brightness: ${Math.round(liveCircle.brightness)}`, 10, 25)
            outCtx.fillText(`Radius: ${Math.round(liveCircle.radius)}px`, 10, 45)
          }
        } else {
          lastDebugPositionRef.current = null
          outCtx.fillStyle = '#ff0000'
          outCtx.font = 'bold 14px monospace'
          outCtx.fillText('No grey circle detected', 10, 25)
        }
      }

      // Draw tap animations
      for (const tap of tapEvents) {
        const tapStart = tap.time, tapEnd = tap.time + 0.6
        if (video.currentTime >= tapStart && video.currentTime <= tapEnd) {
          const progress = (video.currentTime - tapStart) / 0.6
          drawTapAnimation(outCtx, tap, progress, scaledWidth, scaledHeight, cropX, cropY, cropWidth, cropHeight)
        }
      }

      // Draw selected tap indicator
      if (selectedTapIndex !== null && tapEvents[selectedTapIndex]) {
        const tap = tapEvents[selectedTapIndex]
        const tapX = ((tap.x - cropX) / cropWidth) * scaledWidth + drawX
        const tapY = ((tap.y - cropY) / cropHeight) * scaledHeight + drawY
        outCtx.beginPath()
        outCtx.arc(tapX, tapY, 30, 0, Math.PI * 2)
        outCtx.strokeStyle = '#fff'
        outCtx.lineWidth = 2
        outCtx.setLineDash([5, 5])
        outCtx.stroke()
        outCtx.setLineDash([])
        outCtx.beginPath()
        outCtx.arc(tapX, tapY, 12, 0, Math.PI * 2)
        outCtx.fillStyle = 'rgba(255, 255, 255, 0.8)'
        outCtx.fill()
        outCtx.strokeStyle = '#00538C'
        outCtx.lineWidth = 2
        outCtx.stroke()
      }
    }
    animationFrameRef.current = requestAnimationFrame(render)
  }, [tapEvents, zoomLevel, videoTransform, selectedTapIndex, drawTapAnimation, appliedCrop, outputAspect, showDeviceFrame, showDebug])

  useEffect(() => {
    animationFrameRef.current = requestAnimationFrame(render)
    return () => { if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current) }
  }, [render])

  // Calibration handlers
  const clearCalibration = useCallback(() => {
    setTargetCirclePos(null)
    setExcludePosition(null)
    setTargetCircleRadius(40)
    setExcludeRadius(40)
    setCalibration(null, null)
  }, [])

  const enterAutodetectMode = useCallback(() => {
    if (!videoRef.current || !opencvReady) return
    videoRef.current.currentTime = 0
    setAutodetectMode(true)
    clearCalibration()
  }, [opencvReady, clearCalibration])

  const runDetection = useCallback(async () => {
    if (!videoRef.current || !opencvReady) return
    setIsProcessing(true)
    setProcessingProgress(0)
    try {
      const result = await detectCircles(videoRef.current, canvasRef.current, (p) => setProcessingProgress(p))
      const events = Array.isArray(result) ? result : result.taps
      const eventsWithSettings = events.map(e => ({ ...e, animation: selectedAnimation, zoomLevel }))
      onTapEventsDetected(eventsWithSettings)
      if (cameraEngineRef.current) cameraEngineRef.current.reset()
    } catch (error) {
      console.error('Circle detection failed:', error)
    } finally {
      setIsProcessing(false)
      setAutodetectMode(false)
      clearCalibration()
    }
  }, [opencvReady, onTapEventsDetected, setIsProcessing, setProcessingProgress, selectedAnimation, zoomLevel, clearCalibration])

  const cancelAutodetect = useCallback(() => {
    setAutodetectMode(false)
    clearCalibration()
    setCalibrationStep(null)
  }, [clearCalibration])

  const handleCalibrationClick = useCallback((e) => {
    if (!calibrationStep) return
    e.stopPropagation()
    const container = containerRef.current
    const video = videoRef.current
    if (!container || !video) return
    const rect = container.getBoundingClientRect()
    const relX = (e.clientX - rect.left) / rect.width
    const relY = (e.clientY - rect.top) / rect.height
    const videoW = video.videoWidth || 1080
    const videoH = video.videoHeight || 1920
    const clampedX = Math.max(0, Math.min(videoW, relX * videoW))
    const clampedY = Math.max(0, Math.min(videoH, relY * videoH))
    if (calibrationStep === 'circle') {
      setTargetCirclePos({ x: clampedX, y: clampedY })
      setCalibration({ x: clampedX, y: clampedY }, excludePosition)
    } else if (calibrationStep === 'menu') {
      setExcludePosition({ x: clampedX, y: clampedY })
      setCalibration(targetCirclePos, { x: clampedX, y: clampedY })
    }
    setCalibrationStep(null)
  }, [calibrationStep, targetCirclePos, excludePosition])

  // Marker drag handlers
  const handleMarkerDragMove = useCallback((e) => {
    if (!isDraggingMarker) return
    const container = containerRef.current
    const video = videoRef.current
    if (!container || !video) return
    const rect = container.getBoundingClientRect()
    const videoW = video.videoWidth || 1080
    const videoH = video.videoHeight || 1920
    if (isDraggingMarker === 'circle' || isDraggingMarker === 'menu') {
      const relX = (e.clientX - rect.left) / rect.width
      const relY = (e.clientY - rect.top) / rect.height
      const videoX = Math.max(0, Math.min(videoW, relX * videoW))
      const videoY = Math.max(0, Math.min(videoH, relY * videoH))
      if (isDraggingMarker === 'circle') {
        setTargetCirclePos({ x: videoX, y: videoY })
        setCalibration({ x: videoX, y: videoY }, excludePosition)
      } else {
        setExcludePosition({ x: videoX, y: videoY })
        setCalibration(targetCirclePos, { x: videoX, y: videoY })
      }
    } else if (isDraggingMarker === 'circle-resize' || isDraggingMarker === 'menu-resize') {
      const isCircle = isDraggingMarker === 'circle-resize'
      const centerPos = isCircle ? targetCirclePos : excludePosition
      if (!centerPos) return
      const centerScreenX = (centerPos.x / videoW) * rect.width
      const centerScreenY = (centerPos.y / videoH) * rect.height
      const mouseX = e.clientX - rect.left
      const mouseY = e.clientY - rect.top
      const screenDist = Math.sqrt((mouseX - centerScreenX) ** 2 + (mouseY - centerScreenY) ** 2)
      const videoRadius = (screenDist / rect.width) * videoW
      const clampedRadius = Math.max(20, Math.min(200, videoRadius))
      if (isCircle) setTargetCircleRadius(clampedRadius)
      else setExcludeRadius(clampedRadius)
    }
  }, [isDraggingMarker, targetCirclePos, excludePosition])

  useEffect(() => {
    if (isDraggingMarker) {
      const handleUp = () => setIsDraggingMarker(null)
      window.addEventListener('mousemove', handleMarkerDragMove)
      window.addEventListener('mouseup', handleUp)
      return () => {
        window.removeEventListener('mousemove', handleMarkerDragMove)
        window.removeEventListener('mouseup', handleUp)
      }
    }
  }, [isDraggingMarker, handleMarkerDragMove])

  // Tap editing handlers
  const handleAddManualTap = useCallback(() => {
    const video = videoRef.current
    if (!video) return
    const newTap = {
      time: video.currentTime,
      x: Math.round((video.videoWidth || 1080) / 2),
      y: Math.round((video.videoHeight || 1920) / 2),
      animation: selectedAnimation,
      zoomLevel,
      type: 'manual'
    }
    const newTaps = [...tapEvents, newTap].sort((a, b) => a.time - b.time)
    onTapEventsDetected(newTaps)
    const newIndex = newTaps.findIndex(t => t.time === newTap.time && t.x === newTap.x)
    if (onSelectTap) onSelectTap(newIndex)
  }, [tapEvents, onTapEventsDetected, selectedAnimation, zoomLevel, onSelectTap])

  const handleUpdateTapAnimation = useCallback((animation) => {
    if (selectedTapIndex === null || !tapEvents[selectedTapIndex]) return
    const newTaps = tapEvents.map((tap, i) => i === selectedTapIndex ? { ...tap, animation } : tap)
    onTapEventsDetected(newTaps)
    setSelectedAnimation(animation)
  }, [selectedTapIndex, tapEvents, onTapEventsDetected])

  const handleUpdateTapZoom = useCallback((zoom) => {
    if (selectedTapIndex === null || !tapEvents[selectedTapIndex]) return
    const newTaps = tapEvents.map((tap, i) => i === selectedTapIndex ? { ...tap, zoomLevel: zoom } : tap)
    onTapEventsDetected(newTaps)
  }, [selectedTapIndex, tapEvents, onTapEventsDetected])

  // Tap drag handlers
  const handleTapDragStart = useCallback((e) => {
    if (selectedTapIndex === null) return
    e.preventDefault()
    e.stopPropagation()
    setIsDraggingTap(true)
    setTapDragStart({ x: e.clientX, y: e.clientY, hasMoved: false })
  }, [selectedTapIndex])

  const handleTapDragMove = useCallback((e) => {
    if (!isDraggingTap || selectedTapIndex === null || !tapDragStart) return
    const container = containerRef.current
    const video = videoRef.current
    if (!container || !video) return
    const dx = e.clientX - tapDragStart.x
    const dy = e.clientY - tapDragStart.y
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
      setTapDragStart(prev => ({ ...prev, hasMoved: true }))
    }
    const rect = container.getBoundingClientRect()
    const scaleX = (video.videoWidth || 1080) / rect.width
    const scaleY = (video.videoHeight || 1920) / rect.height
    const tap = tapEvents[selectedTapIndex]
    const newX = Math.max(0, Math.min(video.videoWidth || 1080, tap.x + dx * scaleX))
    const newY = Math.max(0, Math.min(video.videoHeight || 1920, tap.y + dy * scaleY))
    const newTaps = tapEvents.map((t, i) => i === selectedTapIndex ? { ...t, x: Math.round(newX), y: Math.round(newY) } : t)
    onTapEventsDetected(newTaps)
    setTapDragStart(prev => ({ ...prev, x: e.clientX, y: e.clientY }))
  }, [isDraggingTap, selectedTapIndex, tapDragStart, tapEvents, onTapEventsDetected])

  const handleTapDragEnd = useCallback(() => {
    if (tapDragStart && !tapDragStart.hasMoved && onSelectTap) onSelectTap(null)
    setIsDraggingTap(false)
    setTapDragStart(null)
  }, [tapDragStart, onSelectTap])

  useEffect(() => {
    if (isDraggingTap) {
      window.addEventListener('mousemove', handleTapDragMove)
      window.addEventListener('mouseup', handleTapDragEnd)
      return () => {
        window.removeEventListener('mousemove', handleTapDragMove)
        window.removeEventListener('mouseup', handleTapDragEnd)
      }
    }
  }, [isDraggingTap, handleTapDragMove, handleTapDragEnd])

  const device = DEVICES[selectedDevice]
  const background = BACKGROUNDS[selectedBackground]
  // Calculate preview aspect ratio based on output aspect setting
  const previewAspect = outputAspect === 'match' ? videoAspectRatio : OUTPUT_ASPECTS[outputAspect].ratio

  return (
    <div className="glass-panel p-4">
      <div className="flex flex-col xl:flex-row gap-4">
        {/* Hidden video & canvas */}
        <video ref={videoRef} src={videoUrl} className="hidden" onLoadedMetadata={handleLoadedMetadata} onTimeUpdate={handleTimeUpdate} onEnded={handleEnded} muted playsInline />
        <canvas ref={canvasRef} className="hidden" />

        {/* Preview */}
        <div className="flex-1 flex flex-col items-center">
          {showDeviceFrame ? (
            /* Device + Background Mode */
            <div className="relative w-full max-w-[340px] rounded-2xl p-6 shadow-glass-lg" style={{ background: background.gradient }}>
              <div className="relative mx-auto bg-black/90 shadow-2xl" style={{ borderRadius: `${device.radius}px`, padding: `${device.bezel}px`, maxWidth: previewAspect > 1 ? '100%' : '240px' }}>
                <div ref={containerRef} className={`relative overflow-hidden bg-mavs-navy ${calibrationStep ? 'cursor-crosshair' : 'cursor-move'}`} style={{ borderRadius: `${Math.max(0, device.radius - device.bezel)}px`, aspectRatio: previewAspect }} onClick={(e) => calibrationStep && handleCalibrationClick(e)}>
                  <canvas ref={outputCanvasRef} className={`absolute inset-0 w-full h-full object-cover ${calibrationStep ? 'cursor-crosshair' : ''}`} onClick={(e) => { if (calibrationStep) handleCalibrationClick(e); else if (!editMode && !cropMode && selectedTapIndex !== null && onSelectTap) onSelectTap(null) }} />
                  {selectedDevice === 'iphone' && <div className="absolute top-0 left-1/2 -translate-x-1/2 w-20 h-5 bg-black rounded-b-xl pointer-events-none z-10" />}
                <PreviewOverlays
                  videoRef={videoRef} containerRef={containerRef} calibrationStep={calibrationStep}
                  autodetectMode={autodetectMode} targetCirclePos={targetCirclePos} setTargetCirclePos={setTargetCirclePos}
                  targetCircleRadius={targetCircleRadius} setTargetCircleRadius={setTargetCircleRadius}
                  excludePosition={excludePosition} setExcludePosition={setExcludePosition}
                  excludeRadius={excludeRadius} setExcludeRadius={setExcludeRadius}
                  setIsDraggingMarker={setIsDraggingMarker} snapGuides={snapGuides}
                  editMode={editMode} videoTransform={videoTransform} handleDragStart={handleDragStart}
                  cropMode={cropMode} cropBounds={cropBounds} handleCropDragStart={handleCropDragStart}
                  selectedTapIndex={selectedTapIndex} tapEvents={tapEvents}
                  isDraggingTap={isDraggingTap} handleTapDragStart={handleTapDragStart} onSelectTap={onSelectTap}
                />
                </div>
                {(selectedDevice === 'iphone' || selectedDevice === 'ipad') && <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-20 h-1 bg-white/30 rounded-full" />}
              </div>
            </div>
          ) : (
            /* Video Only Mode - No device frame or background */
            <div className="relative w-full max-w-[340px] rounded-lg overflow-hidden shadow-glass-lg bg-black">
              <div ref={containerRef} className={`relative overflow-hidden bg-black ${calibrationStep ? 'cursor-crosshair' : 'cursor-move'}`} style={{ aspectRatio: previewAspect }} onClick={(e) => calibrationStep && handleCalibrationClick(e)}>
                <canvas ref={outputCanvasRef} className={`absolute inset-0 w-full h-full object-cover ${calibrationStep ? 'cursor-crosshair' : ''}`} onClick={(e) => { if (calibrationStep) handleCalibrationClick(e); else if (!editMode && !cropMode && selectedTapIndex !== null && onSelectTap) onSelectTap(null) }} />
                <PreviewOverlays
                  videoRef={videoRef} containerRef={containerRef} calibrationStep={calibrationStep}
                  autodetectMode={autodetectMode} targetCirclePos={targetCirclePos} setTargetCirclePos={setTargetCirclePos}
                  targetCircleRadius={targetCircleRadius} setTargetCircleRadius={setTargetCircleRadius}
                  excludePosition={excludePosition} setExcludePosition={setExcludePosition}
                  excludeRadius={excludeRadius} setExcludeRadius={setExcludeRadius}
                  setIsDraggingMarker={setIsDraggingMarker} snapGuides={snapGuides}
                  editMode={editMode} videoTransform={videoTransform} handleDragStart={handleDragStart}
                  cropMode={cropMode} cropBounds={cropBounds} handleCropDragStart={handleCropDragStart}
                  selectedTapIndex={selectedTapIndex} tapEvents={tapEvents}
                  isDraggingTap={isDraggingTap} handleTapDragStart={handleTapDragStart} onSelectTap={onSelectTap}
                />
              </div>
            </div>
          )}

          {/* Playback controls */}
          <div className="flex items-center gap-2 mt-3">
            <button onClick={togglePlay} className="glass-button text-sm px-4 py-2">{isPlaying ? 'Pause' : 'Play'}</button>
            <button onClick={() => { if (editMode === 'resize') setEditMode(null); else { setEditMode('resize'); cancelCrop(); if (videoTransform.stretch) setVideoTransform(prev => ({ ...prev, stretch: false })) } }} className={`glass-button text-sm px-4 py-2 ${editMode === 'resize' ? 'bg-mavs-blue' : ''}`}>{editMode === 'resize' ? 'Done' : 'Resize'}</button>
            <button onClick={() => { if (cropMode) applyCrop(); else { enterCropMode(); setEditMode(null) } }} className={`glass-button text-sm px-4 py-2 ${cropMode ? 'bg-mavs-blue' : ''}`}>{cropMode ? 'Apply' : 'Crop'}</button>
            {cropMode && <button onClick={cancelCrop} className="glass-button text-sm px-3 py-2 text-mavs-silver">Cancel</button>}
            <button onClick={() => setVideoTransform(prev => ({ ...prev, stretch: true }))} className={`glass-button text-sm px-3 py-2 ${videoTransform.stretch ? 'bg-mavs-blue' : ''}`}>Stretch</button>
            <button onClick={() => { const video = videoRef.current, outputCanvas = outputCanvasRef.current; if (video && outputCanvas) { const videoW = video.videoWidth || 1080, videoH = video.videoHeight || 1920; const cropW = (appliedCrop.width / 100) * videoW, cropH = (appliedCrop.height / 100) * videoH; const canvasW = outputCanvas.width, canvasH = outputCanvas.height; const videoAspect = cropW / cropH, canvasAspect = canvasW / canvasH; const scale = videoAspect < canvasAspect ? canvasAspect / videoAspect : videoAspect / canvasAspect; setVideoTransform(prev => ({ ...prev, scale: Math.max(1, scale), stretch: false })) } }} className="glass-button text-sm px-3 py-2">Fill</button>
            <button onClick={() => setVideoTransform(prev => ({ ...prev, scale: 1, stretch: false }))} className="glass-button text-sm px-3 py-2">Fit</button>
            <button onClick={() => { resetTransform(); resetCrop() }} className="glass-button text-sm px-3 py-2 text-mavs-silver">Reset</button>
          </div>
        </div>

        {/* Controls Panel */}
        <div className="xl:w-80 space-y-3 max-h-[500px] overflow-y-auto">
          {/* Output Settings */}
          <div className="glass-panel-light p-3 rounded-xl">
            <h3 className="text-white font-semibold text-sm mb-2">Output</h3>
            {/* Output Mode Toggle */}
            <div className="flex gap-1 mb-2">
              <button onClick={() => setShowDeviceFrame(false)} className={`flex-1 px-2 py-1.5 rounded text-xs transition-all ${!showDeviceFrame ? 'bg-mavs-blue text-white' : 'bg-mavs-navy/50 text-mavs-silver'}`}>Video Only</button>
              <button onClick={() => setShowDeviceFrame(true)} className={`flex-1 px-2 py-1.5 rounded text-xs transition-all ${showDeviceFrame ? 'bg-mavs-blue text-white' : 'bg-mavs-navy/50 text-mavs-silver'}`}>Device Frame</button>
            </div>
            {/* Output Aspect Ratio */}
            <p className="text-mavs-silver text-xs mb-1">Aspect Ratio</p>
            <div className="grid grid-cols-5 gap-1 mb-2">
              {Object.entries(OUTPUT_ASPECTS).map(([key, asp]) => (
                <button key={key} onClick={() => setOutputAspect(key)} className={`px-1 py-1 rounded text-xs transition-all ${outputAspect === key ? 'bg-mavs-blue text-white' : 'bg-mavs-navy/50 text-mavs-silver'}`} title={asp.desc}>{asp.name}</button>
              ))}
            </div>
            {/* Device & Background (only when showDeviceFrame) */}
            {showDeviceFrame && (
              <>
                <p className="text-mavs-silver text-xs mb-1">Device Style</p>
                <div className="grid grid-cols-5 gap-1 mb-2">
                  {Object.entries(DEVICES).map(([key, dev]) => (
                    <button key={key} onClick={() => setSelectedDevice(key)} className={`px-1 py-1 rounded text-xs transition-all ${selectedDevice === key ? 'bg-mavs-blue text-white' : 'bg-mavs-navy/50 text-mavs-silver'}`}>{dev.name}</button>
                  ))}
                </div>
                <p className="text-mavs-silver text-xs mb-1">Background</p>
                <div className="grid grid-cols-6 gap-1">
                  {Object.entries(BACKGROUNDS).map(([key, bg]) => (
                    <button key={key} onClick={() => setSelectedBackground(key)} className={`h-6 rounded transition-all border ${selectedBackground === key ? 'border-white' : 'border-transparent'}`} style={{ background: bg.gradient }} />
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Tap Detection */}
          <div className="glass-panel-light p-3 rounded-xl">
            <h3 className="text-white font-semibold text-sm mb-2">Taps</h3>
            <div className="grid grid-cols-3 gap-1 mb-2">
              {Object.entries(TAP_ANIMATIONS).map(([key, anim]) => (
                <button key={key} onClick={() => { setSelectedAnimation(key); if (selectedTapIndex !== null && tapEvents[selectedTapIndex]) handleUpdateTapAnimation(key) }} className={`px-2 py-1 rounded text-xs transition-all ${(selectedTapIndex !== null && tapEvents[selectedTapIndex]?.animation === key) || (selectedTapIndex === null && selectedAnimation === key) ? 'bg-mavs-blue text-white' : 'bg-mavs-navy/50 text-mavs-silver'}`}>{anim.name}</button>
              ))}
            </div>
            <div className="flex gap-2 mb-2">
              <button onClick={handleAddManualTap} className="glass-button flex-1 text-sm py-2">+ Add Tap</button>
              {!autodetectMode ? (
                <button onClick={enterAutodetectMode} disabled={!opencvReady} className="glass-button glass-button-accent flex-1 text-sm py-2 disabled:opacity-50">Auto Detect</button>
              ) : (
                <button onClick={cancelAutodetect} className="glass-button flex-1 text-sm py-2 bg-red-600/50 hover:bg-red-600/70">Cancel</button>
              )}
            </div>
            {autodetectMode && (
              <div className="bg-mavs-navy/40 rounded-lg p-2 mb-2 border border-mavs-blue/30">
                <p className="text-mavs-silver text-xs mb-2">Optional: Identify elements for better detection</p>
                <div className="flex gap-1 mb-2">
                  <button onClick={() => setCalibrationStep(calibrationStep === 'circle' ? null : 'circle')} className={`flex-1 text-xs py-1.5 rounded transition-all ${calibrationStep === 'circle' ? 'bg-green-600 text-white' : targetCirclePos ? 'bg-green-900/50 text-green-400 border border-green-500/50' : 'bg-mavs-navy/50 text-mavs-silver'}`}>{calibrationStep === 'circle' ? 'Click circle...' : targetCirclePos ? 'Circle Set' : 'Mark Circle'}</button>
                  <button onClick={() => setCalibrationStep(calibrationStep === 'menu' ? null : 'menu')} className={`flex-1 text-xs py-1.5 rounded transition-all ${calibrationStep === 'menu' ? 'bg-red-600 text-white' : excludePosition ? 'bg-red-900/50 text-red-400 border border-red-500/50' : 'bg-mavs-navy/50 text-mavs-silver'}`}>{calibrationStep === 'menu' ? 'Click menu...' : excludePosition ? 'Menu Set' : 'Mark Menu'}</button>
                </div>
                <button onClick={runDetection} disabled={isProcessing} className="w-full glass-button glass-button-accent text-sm py-2 disabled:opacity-50">{isProcessing ? `Detecting... ${Math.round(processingProgress)}%` : 'Run Detection'}</button>
                {isProcessing && <div className="w-full h-1.5 bg-mavs-navy/50 rounded-full overflow-hidden mt-2"><div className="h-full bg-mavs-blue transition-all" style={{ width: `${processingProgress}%` }} /></div>}
              </div>
            )}
            <button onClick={() => setShowDebug(!showDebug)} className={`w-full text-xs py-1.5 rounded transition-all mb-2 ${showDebug ? 'bg-mavs-blue text-white' : 'bg-mavs-navy/30 text-mavs-silver hover:bg-mavs-navy/50'}`}>{showDebug ? 'Debug View On' : 'Enable Debug View'}</button>
            {tapEvents.length > 0 && <p className="text-mavs-silver/60 text-xs mt-2">{tapEvents.length} tap{tapEvents.length !== 1 ? 's' : ''} - Select a tap to drag it</p>}
          </div>

          {/* Selected Tap Editor */}
          {selectedTapIndex !== null && tapEvents[selectedTapIndex] && (
            <div className="glass-panel-light p-3 rounded-xl border border-mavs-blue">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-white font-semibold text-sm">Tap #{selectedTapIndex + 1} at {tapEvents[selectedTapIndex].time.toFixed(2)}s</h3>
                <button onClick={() => { const newTaps = tapEvents.filter((_, i) => i !== selectedTapIndex); onTapEventsDetected(newTaps); onSelectTap(null) }} className="text-red-400 hover:text-red-300 text-xs">Delete</button>
              </div>
              <p className="text-mavs-silver text-xs mb-1">Animation</p>
              <div className="grid grid-cols-3 gap-1 mb-3">
                {Object.entries(TAP_ANIMATIONS).map(([key, anim]) => (
                  <button key={key} onClick={() => handleUpdateTapAnimation(key)} className={`px-2 py-1 rounded text-xs transition-all ${tapEvents[selectedTapIndex].animation === key ? 'bg-mavs-blue text-white' : 'bg-mavs-navy/50 text-mavs-silver'}`}>{anim.name}</button>
                ))}
              </div>
              <p className="text-mavs-silver text-xs mb-1">Zoom Level</p>
              <div className="flex items-center gap-2">
                <input type="range" min="1.1" max="2.5" step="0.1" value={tapEvents[selectedTapIndex].zoomLevel || zoomLevel} onChange={(e) => handleUpdateTapZoom(parseFloat(e.target.value))} className="flex-1 accent-mavs-blue h-1" />
                <span className="text-mavs-silver text-xs w-10">{(tapEvents[selectedTapIndex].zoomLevel || zoomLevel).toFixed(1)}x</span>
              </div>
            </div>
          )}

          {/* Zoom */}
          <div className="glass-panel-light p-3 rounded-xl">
            <h3 className="text-white font-semibold text-sm mb-2">Camera Zoom</h3>
            <div className="flex items-center gap-2">
              <input type="range" min="1.1" max="2" step="0.1" value={zoomLevel} onChange={(e) => setZoomLevel(parseFloat(e.target.value))} className="flex-1 accent-mavs-blue h-1" />
              <span className="text-mavs-silver text-xs w-8">{zoomLevel.toFixed(1)}x</span>
            </div>
          </div>

          {/* Status */}
          <div className="glass-panel-light p-3 rounded-xl">
            <div className="flex justify-between text-xs">
              <span className="text-mavs-silver">OpenCV</span>
              <span className={opencvReady ? 'text-green-400' : 'text-yellow-400'}>{opencvReady ? 'Ready' : 'Loading...'}</span>
            </div>
            <div className="flex justify-between items-center text-xs mt-1">
              <div><span className="text-mavs-silver">Taps: </span><span className="text-white">{tapEvents.length}</span></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default VideoPreview
