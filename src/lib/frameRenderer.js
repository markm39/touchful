/**
 * Shared frame rendering logic for preview and export
 * Ensures export looks exactly like preview
 */

import { CameraEngine } from './cameraEngine'

// Device presets (must match VideoPreview)
const DEVICES = {
  match: { name: 'Match Video', aspect: '9/16', radius: 24, bezel: 0, dynamic: true },
  iphone: { name: 'iPhone', aspect: '9/19.5', radius: 44, bezel: 8 },
  ipad: { name: 'iPad', aspect: '3/4', radius: 18, bezel: 8 },
  android: { name: 'Android', aspect: '9/20', radius: 32, bezel: 6 },
  square: { name: 'Square', aspect: '1/1', radius: 20, bezel: 8 },
  wide: { name: 'Widescreen', aspect: '16/9', radius: 12, bezel: 4 },
}

// Tap animation styles (must match VideoPreview)
const TAP_ANIMATIONS = {
  ripple: { name: 'Ripple', color: '#00538C' },
  pulse: { name: 'Pulse', color: '#6366f1' },
  glow: { name: 'Glow', color: '#10b981' },
  ring: { name: 'Ring', color: '#f97316' },
  dot: { name: 'Dot', color: '#ec4899' },
  none: { name: 'None', color: 'transparent' },
}

// Gradient backgrounds for device frame mode
const BACKGROUNDS = {
  midnight: { name: 'Midnight', colors: ['#0c0c1e', '#1a1a3e', '#2d1b4e'] },
  ocean: { name: 'Ocean', colors: ['#001428', '#003366', '#004d80'] },
  sunset: { name: 'Sunset', colors: ['#1a0a2e', '#3d1a5c', '#6b2d5b', '#8b3a4f'] },
  aurora: { name: 'Aurora', colors: ['#0a1628', '#1a3a4a', '#2a5a5a', '#1a4a3a'] },
  ember: { name: 'Ember', colors: ['#1a0a0a', '#3d1a1a', '#5c2a1a', '#4a2010'] },
  lavender: { name: 'Lavender', colors: ['#1a1a2e', '#2a2a4e', '#3a3a6e', '#4a4a8e'] },
}

// Output aspect ratios
const OUTPUT_ASPECTS = {
  '9:16': { name: '9:16', ratio: 9/16, desc: 'TikTok/Reels' },
  '4:5': { name: '4:5', ratio: 4/5, desc: 'Instagram' },
  '1:1': { name: '1:1', ratio: 1, desc: 'Square' },
  '16:9': { name: '16:9', ratio: 16/9, desc: 'YouTube' },
  'match': { name: 'Match', ratio: null, desc: 'Match video' },
}

/**
 * Draw a tap animation on the canvas
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {Object} tap - Tap event {x, y, animation}
 * @param {number} progress - Animation progress 0-1
 * @param {number} scaledWidth - Width of video area
 * @param {number} scaledHeight - Height of video area
 * @param {number} cropX - Camera crop X in video coords
 * @param {number} cropY - Camera crop Y in video coords
 * @param {number} cropWidth - Camera crop width in video coords
 * @param {number} cropHeight - Camera crop height in video coords
 * @param {number} offsetX - X offset where video is drawn (for device frame mode)
 * @param {number} offsetY - Y offset where video is drawn (for device frame mode)
 */
function drawTapAnimation(ctx, tap, progress, scaledWidth, scaledHeight, cropX, cropY, cropWidth, cropHeight, offsetX = 0, offsetY = 0) {
  if (!tap.animation || tap.animation === 'none') return

  // Calculate tap position relative to video area, then add offset for device frame
  const x = ((tap.x - cropX) / cropWidth) * scaledWidth + offsetX
  const y = ((tap.y - cropY) / cropHeight) * scaledHeight + offsetY
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
}

/**
 * Get output canvas dimensions for a given aspect ratio and max size
 */
export function getOutputDimensions(outputAspect, videoW, videoH, maxWidth = 1080, maxHeight = 1920) {
  const outputAspectConfig = OUTPUT_ASPECTS[outputAspect]
  let targetAspect
  if (outputAspect === 'match') {
    targetAspect = videoW / videoH
  } else {
    targetAspect = outputAspectConfig.ratio
  }

  let width, height
  if (targetAspect > maxWidth / maxHeight) {
    width = maxWidth
    height = Math.round(maxWidth / targetAspect)
  } else {
    height = maxHeight
    width = Math.round(maxHeight * targetAspect)
  }

  return { width, height, aspectRatio: targetAspect }
}

/**
 * Render a single video frame to canvas
 * This is the core render function shared between preview and export
 *
 * @param {Object} params - Render parameters
 * @param {HTMLCanvasElement} params.sourceCanvas - Canvas with video frame drawn
 * @param {HTMLCanvasElement} params.outputCanvas - Canvas to render to
 * @param {number} params.videoW - Video width
 * @param {number} params.videoH - Video height
 * @param {number} params.currentTime - Current video time
 * @param {Array} params.tapEvents - Tap events array
 * @param {number} params.zoomLevel - Zoom level for camera
 * @param {Object} params.videoTransform - {scale, x, y, stretch}
 * @param {Object} params.appliedCrop - {x, y, width, height} in percentages
 * @param {boolean} params.showDeviceFrame - Whether device frame mode is on
 * @param {string} params.selectedBackground - Background gradient key (e.g., 'ocean', 'midnight')
 * @param {CameraEngine} params.camera - Camera engine instance
 */
export function renderFrame({
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
  selectedBackground = 'ocean',
  selectedDevice = 'match',
  camera,
}) {
  const outCtx = outputCanvas.getContext('2d')

  // Update camera for current time
  camera.update(currentTime, tapEvents, zoomLevel)
  const { x, y, zoom } = camera.getState()

  // Calculate view/crop region based on camera zoom/pan
  const viewW = videoW / zoom
  const viewH = videoH / zoom
  const cropX = Math.max(0, Math.min(x - viewW / 2, videoW - viewW))
  const cropY = Math.max(0, Math.min(y - viewH / 2, videoH - viewH))
  const cropWidth = viewW
  const cropHeight = viewH

  // Calculate draw dimensions based on transform
  const { scale: userScale, x: offsetX, y: offsetY, stretch } = videoTransform
  let scaledWidth, scaledHeight, drawX, drawY

  // Video-only mode or stretch: fill the entire canvas
  if (!showDeviceFrame || stretch) {
    scaledWidth = outputCanvas.width
    scaledHeight = outputCanvas.height
    drawX = 0
    drawY = 0
  } else {
    // For device frame mode, use a default scale if user hasn't adjusted it
    // This matches the visual padding in the preview UI
    const effectiveScale = userScale === 1 ? 0.85 : userScale
    scaledWidth = outputCanvas.width * effectiveScale
    scaledHeight = outputCanvas.height * effectiveScale
    drawX = (outputCanvas.width - scaledWidth) / 2 + offsetX
    drawY = (outputCanvas.height - scaledHeight) / 2 + offsetY
  }

  // Get device settings for frame rendering
  const device = DEVICES[selectedDevice] || DEVICES.match
  // Scale radius/bezel proportionally to output size (preview uses ~340px width)
  const scaleFactor = outputCanvas.width / 340
  const frameRadius = device.radius * scaleFactor
  const frameBezel = device.bezel * scaleFactor

  // Draw background
  if (showDeviceFrame && !stretch) {
    // Draw gradient background for device frame mode
    const bg = BACKGROUNDS[selectedBackground] || BACKGROUNDS.ocean
    const gradient = outCtx.createLinearGradient(0, 0, outputCanvas.width, outputCanvas.height)
    const colors = bg.colors
    colors.forEach((color, i) => {
      gradient.addColorStop(i / (colors.length - 1), color)
    })
    outCtx.fillStyle = gradient
    outCtx.fillRect(0, 0, outputCanvas.width, outputCanvas.height)

    // Draw device frame (black rounded rectangle with bezel)
    const frameX = drawX - frameBezel
    const frameY = drawY - frameBezel
    const frameW = scaledWidth + frameBezel * 2
    const frameH = scaledHeight + frameBezel * 2

    outCtx.fillStyle = 'rgba(0, 0, 0, 0.9)'
    outCtx.beginPath()
    outCtx.roundRect(frameX, frameY, frameW, frameH, frameRadius)
    outCtx.fill()

    // Add subtle shadow/glow effect around device
    outCtx.shadowColor = 'rgba(0, 0, 0, 0.5)'
    outCtx.shadowBlur = 20 * scaleFactor
    outCtx.shadowOffsetX = 0
    outCtx.shadowOffsetY = 5 * scaleFactor
    outCtx.fill()
    outCtx.shadowColor = 'transparent'
    outCtx.shadowBlur = 0
    outCtx.shadowOffsetY = 0
  } else {
    // Solid black for video-only mode
    outCtx.fillStyle = '#000'
    outCtx.fillRect(0, 0, outputCanvas.width, outputCanvas.height)
  }

  // Apply crop clipping if needed
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

  // Clip video to rounded corners (inside the bezel)
  if (showDeviceFrame && !stretch) {
    outCtx.save()
    const innerRadius = Math.max(0, frameRadius - frameBezel)
    outCtx.beginPath()
    outCtx.roundRect(drawX, drawY, scaledWidth, scaledHeight, innerRadius)
    outCtx.clip()
  }

  // Draw the video frame
  outCtx.drawImage(sourceCanvas, cropX, cropY, cropWidth, cropHeight, drawX, drawY, scaledWidth, scaledHeight)

  // Restore clip if device frame was used
  if (showDeviceFrame && !stretch) {
    outCtx.restore()
  }

  if (hasCrop) outCtx.restore()

  // Draw tap animations (pass drawX/drawY offset for device frame mode)
  for (const tap of tapEvents) {
    const tapStart = tap.time
    const tapEnd = tap.time + 0.6
    if (currentTime >= tapStart && currentTime <= tapEnd) {
      const progress = (currentTime - tapStart) / 0.6
      drawTapAnimation(outCtx, tap, progress, scaledWidth, scaledHeight, cropX, cropY, cropWidth, cropHeight, drawX, drawY)
    }
  }
}

/**
 * Create a frame renderer for export
 * Returns a function that renders a frame at any given time
 */
export function createFrameRenderer(videoElement, settings) {
  const {
    outputAspect,
    showDeviceFrame,
    videoTransform,
    appliedCrop,
    zoomLevel,
    tapEvents,
    selectedBackground = 'ocean',
    selectedDevice = 'match',
  } = settings

  const videoW = videoElement.videoWidth
  const videoH = videoElement.videoHeight

  // Get output dimensions
  const { width: outW, height: outH } = getOutputDimensions(outputAspect, videoW, videoH)

  // Create canvases
  const sourceCanvas = document.createElement('canvas')
  sourceCanvas.width = videoW
  sourceCanvas.height = videoH
  const sourceCtx = sourceCanvas.getContext('2d')

  const outputCanvas = document.createElement('canvas')
  outputCanvas.width = outW
  outputCanvas.height = outH

  // Create camera engine
  const camera = new CameraEngine(videoW, videoH)

  return {
    outputCanvas,
    outputWidth: outW,
    outputHeight: outH,

    /**
     * Render frame at given time
     * @param {number} time - Time in seconds
     */
    renderAtTime(time) {
      // Draw video frame to source canvas
      sourceCtx.drawImage(videoElement, 0, 0)

      // Render to output canvas
      renderFrame({
        sourceCanvas,
        outputCanvas,
        videoW,
        videoH,
        currentTime: time,
        tapEvents,
        zoomLevel,
        videoTransform,
        appliedCrop,
        showDeviceFrame,
        selectedBackground,
        selectedDevice,
        camera,
      })

      return outputCanvas
    }
  }
}

export { OUTPUT_ASPECTS, TAP_ANIMATIONS, BACKGROUNDS }
