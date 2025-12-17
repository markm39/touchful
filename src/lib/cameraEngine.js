// Spring-physics camera engine for smooth pan/zoom

/**
 * Camera Engine with spring-damper physics
 * Creates smooth, natural-feeling camera movements that follow tap events
 */
export class CameraEngine {
  constructor(videoWidth, videoHeight) {
    this.videoWidth = videoWidth
    this.videoHeight = videoHeight
    
    // Camera state
    this.x = videoWidth / 2
    this.y = videoHeight / 2
    this.targetX = this.x
    this.targetY = this.y
    this.zoom = 1
    this.targetZoom = 1
    
    // Spring physics parameters
    this.springStiffness = 0.08  // How quickly camera moves to target
    this.damping = 0.85          // How quickly movement settles
    this.velocityX = 0
    this.velocityY = 0
    this.velocityZoom = 0
    
    // Timing
    this.lastUpdateTime = 0
    this.lastTapTime = 0
    this.zoomHoldDuration = 2.0  // How long to hold zoom after tap cluster
    
    // Tap clustering
    this.recentTaps = []
    this.clusterTimeout = 0.5   // Taps within this window form a cluster
  }

  /**
   * Update camera state based on current time and tap events
   */
  update(currentTime, tapEvents, targetZoomLevel = 1.5) {
    // Find active tap (current or recent)
    const activeTap = this.findActiveTap(currentTime, tapEvents)
    
    if (activeTap) {
      this.targetX = activeTap.x
      this.targetY = activeTap.y
      this.targetZoom = targetZoomLevel
      this.lastTapTime = currentTime
      
      // Track for clustering
      this.recentTaps = this.recentTaps.filter(t => currentTime - t.time < this.clusterTimeout)
      if (!this.recentTaps.find(t => t.time === activeTap.time)) {
        this.recentTaps.push(activeTap)
      }
    } else {
      // Gradually zoom out if no recent taps
      const timeSinceLastTap = currentTime - this.lastTapTime
      if (timeSinceLastTap > this.zoomHoldDuration) {
        this.targetZoom = 1
        this.targetX = this.videoWidth / 2
        this.targetY = this.videoHeight / 2
      }
    }

    // Apply spring physics
    this.applySpringPhysics()
    
    // Clamp camera position to keep content in frame
    this.clampPosition()
    
    this.lastUpdateTime = currentTime
  }

  /**
   * Find the most relevant tap for the current time
   */
  findActiveTap(currentTime, tapEvents) {
    // Look for tap within a window around current time
    const lookAhead = 0.3   // Start zooming slightly before tap
    const lookBehind = 0.8  // Keep focused on tap for a bit after
    
    // First priority: upcoming tap (zoom in anticipation)
    const upcomingTap = tapEvents.find(t => 
      t.time > currentTime && t.time - currentTime < lookAhead
    )
    if (upcomingTap) return upcomingTap

    // Second priority: recent tap (stay focused)
    const recentTap = [...tapEvents]
      .reverse()
      .find(t => currentTime - t.time < lookBehind && currentTime >= t.time)
    if (recentTap) return recentTap

    return null
  }

  /**
   * Apply spring-damper physics for smooth movement
   */
  applySpringPhysics() {
    // Calculate spring force for X
    const forceX = (this.targetX - this.x) * this.springStiffness
    this.velocityX = (this.velocityX + forceX) * this.damping
    this.x += this.velocityX

    // Calculate spring force for Y
    const forceY = (this.targetY - this.y) * this.springStiffness
    this.velocityY = (this.velocityY + forceY) * this.damping
    this.y += this.velocityY

    // Calculate spring force for Zoom
    const forceZoom = (this.targetZoom - this.zoom) * this.springStiffness * 0.5
    this.velocityZoom = (this.velocityZoom + forceZoom) * this.damping
    this.zoom += this.velocityZoom
  }

  /**
   * Keep camera within bounds
   */
  clampPosition() {
    const viewWidth = this.videoWidth / this.zoom
    const viewHeight = this.videoHeight / this.zoom
    
    const minX = viewWidth / 2
    const maxX = this.videoWidth - viewWidth / 2
    const minY = viewHeight / 2
    const maxY = this.videoHeight - viewHeight / 2

    this.x = Math.max(minX, Math.min(maxX, this.x))
    this.y = Math.max(minY, Math.min(maxY, this.y))
    this.zoom = Math.max(1, Math.min(3, this.zoom))
  }

  /**
   * Get current camera state
   */
  getState() {
    return {
      x: this.x,
      y: this.y,
      zoom: this.zoom,
      targetX: this.targetX,
      targetY: this.targetY,
      targetZoom: this.targetZoom,
    }
  }

  /**
   * Reset camera to center
   */
  reset() {
    this.x = this.videoWidth / 2
    this.y = this.videoHeight / 2
    this.targetX = this.x
    this.targetY = this.y
    this.zoom = 1
    this.targetZoom = 1
    this.velocityX = 0
    this.velocityY = 0
    this.velocityZoom = 0
    this.recentTaps = []
  }

  /**
   * Generate camera keyframes for entire video
   * Used for FFmpeg export
   */
  generateKeyframes(tapEvents, duration, fps = 30, targetZoomLevel = 1.5) {
    const keyframes = []
    const frameInterval = 1 / fps
    
    this.reset()
    
    for (let time = 0; time < duration; time += frameInterval) {
      this.update(time, tapEvents, targetZoomLevel)
      keyframes.push({
        time,
        x: this.x,
        y: this.y,
        zoom: this.zoom,
      })
    }
    
    this.reset()
    return keyframes
  }
}

/**
 * Easing functions for additional smoothness
 */
export const Easing = {
  // Smooth ease-out for natural deceleration
  easeOutCubic: (t) => 1 - Math.pow(1 - t, 3),
  
  // Smooth ease-in-out for centered movements
  easeInOutCubic: (t) => t < 0.5 
    ? 4 * t * t * t 
    : 1 - Math.pow(-2 * t + 2, 3) / 2,
  
  // Spring-like bounce
  easeOutBack: (t) => {
    const c1 = 1.70158
    const c3 = c1 + 1
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2)
  },
}

