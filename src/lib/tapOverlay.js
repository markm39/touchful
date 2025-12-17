// Tap overlay effects - ripples, indicators, trails

/**
 * Draw a ripple effect at the tap location
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {number} x - X position
 * @param {number} y - Y position
 * @param {number} progress - Animation progress (0-1)
 * @param {Object} options - Style options
 */
export function drawRipple(ctx, x, y, progress, options = {}) {
  const {
    color = '#00538C',
    secondaryColor = '#BBC4CA',
    maxRadius = 80,
    lineWidth = 3,
  } = options

  const eased = easeOutCubic(progress)
  const alpha = 1 - eased
  const radius = eased * maxRadius

  // Outer ripple
  ctx.beginPath()
  ctx.arc(x, y, radius, 0, Math.PI * 2)
  ctx.strokeStyle = hexToRgba(color, alpha * 0.8)
  ctx.lineWidth = lineWidth
  ctx.stroke()

  // Inner ripple (smaller, faster)
  const innerProgress = Math.min(1, progress * 1.5)
  const innerEased = easeOutCubic(innerProgress)
  const innerAlpha = 1 - innerEased
  const innerRadius = innerEased * maxRadius * 0.6

  ctx.beginPath()
  ctx.arc(x, y, innerRadius, 0, Math.PI * 2)
  ctx.strokeStyle = hexToRgba(secondaryColor, innerAlpha * 0.6)
  ctx.lineWidth = lineWidth * 0.7
  ctx.stroke()

  // Center dot
  if (progress < 0.3) {
    const dotAlpha = 1 - progress / 0.3
    ctx.beginPath()
    ctx.arc(x, y, 8, 0, Math.PI * 2)
    ctx.fillStyle = hexToRgba(secondaryColor, dotAlpha * 0.8)
    ctx.fill()
  }
}

/**
 * Draw a tap indicator dot (for timeline/preview)
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {number} x - X position
 * @param {number} y - Y position
 * @param {Object} options - Style options
 */
export function drawTapIndicator(ctx, x, y, options = {}) {
  const {
    radius = 12,
    color = '#00538C',
    glowColor = '#BBC4CA',
    active = false,
  } = options

  // Glow
  const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius * 2)
  gradient.addColorStop(0, hexToRgba(glowColor, active ? 0.6 : 0.3))
  gradient.addColorStop(1, hexToRgba(glowColor, 0))
  
  ctx.beginPath()
  ctx.arc(x, y, radius * 2, 0, Math.PI * 2)
  ctx.fillStyle = gradient
  ctx.fill()

  // Main dot
  ctx.beginPath()
  ctx.arc(x, y, radius, 0, Math.PI * 2)
  
  const dotGradient = ctx.createRadialGradient(
    x - radius * 0.3, y - radius * 0.3, 0,
    x, y, radius
  )
  dotGradient.addColorStop(0, glowColor)
  dotGradient.addColorStop(1, color)
  
  ctx.fillStyle = dotGradient
  ctx.fill()

  // Highlight
  ctx.beginPath()
  ctx.arc(x - radius * 0.2, y - radius * 0.2, radius * 0.3, 0, Math.PI * 2)
  ctx.fillStyle = 'rgba(255, 255, 255, 0.4)'
  ctx.fill()
}

/**
 * Draw touch trail effect
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {Array<{x: number, y: number}>} points - Trail points
 * @param {Object} options - Style options
 */
export function drawTrail(ctx, points, options = {}) {
  if (points.length < 2) return

  const {
    color = '#00538C',
    maxWidth = 8,
    minWidth = 2,
  } = options

  ctx.beginPath()
  ctx.moveTo(points[0].x, points[0].y)

  for (let i = 1; i < points.length; i++) {
    const progress = i / (points.length - 1)
    const width = maxWidth - (maxWidth - minWidth) * progress
    const alpha = 1 - progress * 0.8

    ctx.lineTo(points[i].x, points[i].y)
    ctx.strokeStyle = hexToRgba(color, alpha)
    ctx.lineWidth = width
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.stroke()
    
    ctx.beginPath()
    ctx.moveTo(points[i].x, points[i].y)
  }
}

/**
 * Create a ripple animation manager
 */
export class RippleManager {
  constructor() {
    this.ripples = []
    this.duration = 0.6 // seconds
  }

  /**
   * Add a new ripple
   */
  add(x, y, time) {
    this.ripples.push({ x, y, startTime: time })
  }

  /**
   * Update and draw all active ripples
   */
  draw(ctx, currentTime, options = {}) {
    // Remove completed ripples
    this.ripples = this.ripples.filter(r => 
      currentTime - r.startTime < this.duration
    )

    // Draw each ripple
    for (const ripple of this.ripples) {
      const progress = (currentTime - ripple.startTime) / this.duration
      drawRipple(ctx, ripple.x, ripple.y, progress, options)
    }
  }

  /**
   * Add ripples from tap events
   */
  syncWithTapEvents(tapEvents, currentTime) {
    for (const tap of tapEvents) {
      const timeDiff = currentTime - tap.time
      if (timeDiff >= 0 && timeDiff < 0.1) {
        // New tap just happened
        const existing = this.ripples.find(r => 
          Math.abs(r.startTime - tap.time) < 0.05
        )
        if (!existing) {
          this.add(tap.x, tap.y, tap.time)
        }
      }
    }
  }
}

// Utility functions

function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3)
}

function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

