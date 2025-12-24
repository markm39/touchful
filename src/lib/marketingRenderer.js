/**
 * Marketing image renderer
 * Composes final high-resolution marketing images for App Store
 */

import { BACKGROUNDS } from './frameRenderer'

/**
 * Device configurations for marketing images
 */
const DEVICE_CONFIGS = {
  iphone: { aspect: 9 / 19.5, radius: 44, bezel: 8 },
  ipad: { aspect: 3 / 4, radius: 18, bezel: 8 },
  android: { aspect: 9 / 20, radius: 32, bezel: 6 },
}

/**
 * Render a gradient background to canvas
 */
function renderBackground(ctx, width, height, backgroundKey) {
  const bg = BACKGROUNDS[backgroundKey] || BACKGROUNDS.ocean
  const gradient = ctx.createLinearGradient(0, 0, width, height)
  const colors = bg.colors
  colors.forEach((color, i) => {
    gradient.addColorStop(i / (colors.length - 1), color)
  })
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, width, height)
}

/**
 * Render a device frame to canvas
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {Object} device - Device data
 * @param {number} canvasIndex - Which canvas we're rendering
 * @param {number} canvasWidth - Full resolution canvas width
 * @param {number} scale - Scale from preview to full resolution
 */
async function renderDevice(ctx, device, canvasIndex, canvasWidth, scale) {
  const config = DEVICE_CONFIGS[device.type] || DEVICE_CONFIGS.iphone

  // Calculate position relative to this canvas
  const canvasLeft = canvasIndex * canvasWidth
  const relativeX = (device.worldX - canvasLeft) * scale
  const y = device.worldY * scale
  const width = device.width * scale
  const height = device.height * scale

  // Scale radius and bezel
  const scaleFactor = width / 300
  const radius = config.radius * scaleFactor
  const bezel = config.bezel * scaleFactor

  ctx.save()

  // Apply rotation if any
  if (device.rotation) {
    const centerX = relativeX + width / 2
    const centerY = y + height / 2
    ctx.translate(centerX, centerY)
    ctx.rotate((device.rotation * Math.PI) / 180)
    ctx.translate(-centerX, -centerY)
  }

  // Draw device frame (black bezel)
  ctx.fillStyle = 'rgba(0, 0, 0, 0.9)'
  ctx.beginPath()
  ctx.roundRect(relativeX, y, width, height, radius)
  ctx.fill()

  // Add shadow
  ctx.shadowColor = 'rgba(0, 0, 0, 0.5)'
  ctx.shadowBlur = 20 * scaleFactor
  ctx.shadowOffsetY = 5 * scaleFactor
  ctx.fill()
  ctx.shadowColor = 'transparent'
  ctx.shadowBlur = 0
  ctx.shadowOffsetY = 0

  // Clip for screen content
  const screenX = relativeX + bezel
  const screenY = y + bezel
  const screenWidth = width - bezel * 2
  const screenHeight = height - bezel * 2
  const screenRadius = Math.max(0, radius - bezel)

  ctx.save()
  ctx.beginPath()
  ctx.roundRect(screenX, screenY, screenWidth, screenHeight, screenRadius)
  ctx.clip()

  // Draw screenshot if available
  if (device.screenshot) {
    try {
      const img = await loadImage(device.screenshot)
      ctx.drawImage(img, screenX, screenY, screenWidth, screenHeight)
    } catch (e) {
      // Fill with placeholder color if image fails
      ctx.fillStyle = '#1a1a2e'
      ctx.fillRect(screenX, screenY, screenWidth, screenHeight)
    }
  } else {
    // No screenshot - draw placeholder
    ctx.fillStyle = '#1a1a2e'
    ctx.fillRect(screenX, screenY, screenWidth, screenHeight)
  }

  ctx.restore()

  // Draw notch/dynamic island
  if (device.showNotch) {
    const notchWidth = width * 0.25
    const notchHeight = height * 0.025
    const notchX = relativeX + (width - notchWidth) / 2
    const notchY = y + bezel

    ctx.fillStyle = '#000'
    ctx.beginPath()
    ctx.roundRect(notchX, notchY, notchWidth, notchHeight, [0, 0, radius * 0.3, radius * 0.3])
    ctx.fill()

    // Home indicator
    const homeWidth = width * 0.3
    const homeHeight = Math.max(4, height * 0.005)
    const homeX = relativeX + (width - homeWidth) / 2
    const homeY = y + height - bezel - homeHeight - height * 0.01

    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)'
    ctx.beginPath()
    ctx.roundRect(homeX, homeY, homeWidth, homeHeight, homeHeight / 2)
    ctx.fill()
  }

  ctx.restore()
}

/**
 * Render a text layer to canvas
 */
function renderText(ctx, text, canvasWidth, canvasHeight, scale) {
  const x = (text.x / 100) * canvasWidth
  const y = (text.y / 100) * canvasHeight
  const fontSize = text.fontSize * scale

  ctx.save()

  // Apply rotation if any
  if (text.rotation) {
    ctx.translate(x, y)
    ctx.rotate((text.rotation * Math.PI) / 180)
    ctx.translate(-x, -y)
  }

  ctx.font = `${text.fontWeight} ${fontSize}px ${text.fontFamily}`
  ctx.fillStyle = text.color
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'

  // Add text shadow
  ctx.shadowColor = 'rgba(0, 0, 0, 0.5)'
  ctx.shadowBlur = 4 * scale
  ctx.shadowOffsetX = 0
  ctx.shadowOffsetY = 2 * scale

  ctx.fillText(text.content, x, y)

  ctx.restore()
}

/**
 * Load an image from URL
 */
function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

/**
 * Get devices that overlap a specific canvas
 */
function getDevicesForCanvas(devices, canvasIndex, canvasWidth) {
  const canvasLeft = canvasIndex * canvasWidth
  const canvasRight = (canvasIndex + 1) * canvasWidth

  return devices.filter(device => {
    const deviceRight = device.worldX + device.width
    return deviceRight > canvasLeft && device.worldX < canvasRight
  })
}

/**
 * Render a single marketing canvas at full resolution using current project settings
 * @param {Object} state - Marketing state
 * @param {number} canvasIndex - Which canvas to render
 * @returns {Promise<Blob>} PNG blob of rendered image
 */
export async function renderMarketingCanvas(state, canvasIndex) {
  const { project } = state
  return renderMarketingCanvasAtSize(state, canvasIndex, project.sizePreset, project.orientation)
}

/**
 * Render a single marketing canvas at a specific size and orientation
 * @param {Object} state - Marketing state
 * @param {number} canvasIndex - Which canvas to render
 * @param {string} sizePreset - Size preset key (e.g., 'iphone-6.7')
 * @param {string} orientation - 'portrait' or 'landscape'
 * @returns {Promise<Blob>} PNG blob of rendered image
 */
export async function renderMarketingCanvasAtSize(state, canvasIndex, sizePreset, orientation) {
  const { project, canvases, devices, textLayers } = state
  const canvas = canvases[canvasIndex]

  // Get full resolution dimensions for the requested size
  const { MARKETING_SIZES } = await import('../hooks/useMarketingState.jsx')
  const sizeConfig = MARKETING_SIZES[sizePreset]
  const dims = sizeConfig[orientation]

  // Get current project dimensions for scaling calculations
  const currentSizeConfig = MARKETING_SIZES[project.sizePreset]
  const currentDims = currentSizeConfig[project.orientation]

  // Create canvas at full resolution
  const offscreen = document.createElement('canvas')
  offscreen.width = dims.width
  offscreen.height = dims.height
  const ctx = offscreen.getContext('2d')

  // Render background
  renderBackground(ctx, dims.width, dims.height, canvas.background)

  // Calculate scale factor from current editing dimensions to target dimensions
  // This ensures devices and text scale proportionally to fill the target canvas
  const scaleX = dims.width / currentDims.width
  const scaleY = dims.height / currentDims.height
  const scale = Math.min(scaleX, scaleY)

  // Get devices for this canvas (using current canvas width for world coordinate calculation)
  const canvasDevices = getDevicesForCanvas(devices, canvasIndex, currentDims.width)

  // Render devices (sorted by zIndex)
  const sortedDevices = [...canvasDevices].sort((a, b) => a.zIndex - b.zIndex)
  for (const device of sortedDevices) {
    await renderDeviceScaled(ctx, device, canvasIndex, currentDims.width, dims.width, dims.height, scale)
  }

  // Render text layers for this canvas
  const canvasTexts = textLayers.filter(t => t.canvasIndex === canvasIndex)
  for (const text of canvasTexts) {
    renderText(ctx, text, dims.width, dims.height, scale)
  }

  // Convert to blob
  return new Promise((resolve) => {
    offscreen.toBlob(resolve, 'image/png', 1.0)
  })
}

/**
 * Render a device scaled to fit target dimensions
 */
async function renderDeviceScaled(ctx, device, canvasIndex, sourceCanvasWidth, targetWidth, targetHeight, scale) {
  const config = DEVICE_CONFIGS[device.type] || DEVICE_CONFIGS.iphone

  // Calculate position relative to this canvas, then scale to target
  const canvasLeft = canvasIndex * sourceCanvasWidth
  const relativeX = (device.worldX - canvasLeft) * scale
  const y = device.worldY * scale
  const width = device.width * scale
  const height = device.height * scale

  // Center the content in the target canvas
  const offsetX = (targetWidth - sourceCanvasWidth * scale) / 2
  const offsetY = (targetHeight - (sourceCanvasWidth * scale / (sourceCanvasWidth / targetHeight))) / 2

  const finalX = relativeX + offsetX
  const finalY = y

  // Scale radius and bezel
  const scaleFactor = width / 300
  const radius = config.radius * scaleFactor
  const bezel = config.bezel * scaleFactor

  ctx.save()

  // Apply rotation if any
  if (device.rotation) {
    const centerX = finalX + width / 2
    const centerY = finalY + height / 2
    ctx.translate(centerX, centerY)
    ctx.rotate((device.rotation * Math.PI) / 180)
    ctx.translate(-centerX, -centerY)
  }

  // Draw device frame (black bezel)
  ctx.fillStyle = 'rgba(0, 0, 0, 0.9)'
  ctx.beginPath()
  ctx.roundRect(finalX, finalY, width, height, radius)
  ctx.fill()

  // Add shadow
  ctx.shadowColor = 'rgba(0, 0, 0, 0.5)'
  ctx.shadowBlur = 20 * scaleFactor
  ctx.shadowOffsetY = 5 * scaleFactor
  ctx.fill()
  ctx.shadowColor = 'transparent'
  ctx.shadowBlur = 0
  ctx.shadowOffsetY = 0

  // Clip for screen content
  const screenX = finalX + bezel
  const screenY = finalY + bezel
  const screenWidth = width - bezel * 2
  const screenHeight = height - bezel * 2
  const screenRadius = Math.max(0, radius - bezel)

  ctx.save()
  ctx.beginPath()
  ctx.roundRect(screenX, screenY, screenWidth, screenHeight, screenRadius)
  ctx.clip()

  // Draw screenshot if available
  if (device.screenshot) {
    try {
      const img = await loadImage(device.screenshot)
      ctx.drawImage(img, screenX, screenY, screenWidth, screenHeight)
    } catch (e) {
      ctx.fillStyle = '#1a1a2e'
      ctx.fillRect(screenX, screenY, screenWidth, screenHeight)
    }
  } else {
    ctx.fillStyle = '#1a1a2e'
    ctx.fillRect(screenX, screenY, screenWidth, screenHeight)
  }

  ctx.restore()

  // Draw notch/dynamic island
  if (device.showNotch) {
    const notchWidth = width * 0.25
    const notchHeight = height * 0.025
    const notchX = finalX + (width - notchWidth) / 2
    const notchY = finalY + bezel

    ctx.fillStyle = '#000'
    ctx.beginPath()
    ctx.roundRect(notchX, notchY, notchWidth, notchHeight, [0, 0, radius * 0.3, radius * 0.3])
    ctx.fill()

    // Home indicator
    const homeWidth = width * 0.3
    const homeHeight = Math.max(4, height * 0.005)
    const homeX = finalX + (width - homeWidth) / 2
    const homeY = finalY + height - bezel - homeHeight - height * 0.01

    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)'
    ctx.beginPath()
    ctx.roundRect(homeX, homeY, homeWidth, homeHeight, homeHeight / 2)
    ctx.fill()
  }

  ctx.restore()
}

/**
 * Render all canvases and return as array of blobs
 */
export async function renderAllMarketingCanvases(state, onProgress) {
  const { canvases } = state
  const blobs = []

  for (let i = 0; i < canvases.length; i++) {
    if (onProgress) onProgress(i, canvases.length)
    const blob = await renderMarketingCanvas(state, i)
    blobs.push(blob)
  }

  if (onProgress) onProgress(canvases.length, canvases.length)
  return blobs
}

/**
 * Download a blob as a file
 */
export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
