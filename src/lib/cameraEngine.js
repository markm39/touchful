// Spring-physics camera engine for smooth pan/zoom
// Only zooms on actual taps, starts zoomed out, quick zoom out after taps

/**
 * Camera Engine with spring-damper physics
 * - Starts fully zoomed out
 * - Only zooms in on actual taps (not circle movement)
 * - Quick zoom out after each tap
 */
export class CameraEngine {
  constructor(videoWidth, videoHeight) {
    this.videoWidth = videoWidth
    this.videoHeight = videoHeight
    
    // Camera state - START ZOOMED OUT
    this.x = videoWidth / 2
    this.y = videoHeight / 2
    this.targetX = this.x
    this.targetY = this.y
    this.zoom = 1  // Start at 1x (fully zoomed out)
    this.targetZoom = 1
    
    // Simple lerp - no spring physics, no bouncing
    this.lerpSpeed = 0.03         // How fast to interpolate (0-1)
    this.zoomLerpSpeed = 0.025    // Slower zoom interpolation
    
    // Timing - smooth, drawn out zooms
    this.tapDuration = 1.2        // Hold zoom longer after a tap
    this.zoomOutSpeed = 1.0       // Slower zoom out (1 second)
    
    // State
    this.activeTapTime = -999   // Time of last active tap
    this.hasHadFirstTap = false // Ignore everything before first tap
  }

  /**
   * Update camera state based on current time and tap events
   */
  update(currentTime, taps, maxZoomLevel = 1.8) {
    // Find if we're in a tap window
    const activeTap = this.findActiveTap(currentTime, taps)
    
    if (activeTap) {
      // We have an active tap - zoom in and pan to it
      this.hasHadFirstTap = true
      this.targetX = activeTap.x
      this.targetY = activeTap.y
      // Use per-tap zoom level if set, otherwise use global maxZoomLevel
      this.targetZoom = activeTap.zoomLevel || maxZoomLevel
      this.activeTapTime = activeTap.time
    } else if (this.hasHadFirstTap) {
      // No active tap - check if we should zoom out
      const timeSinceTap = currentTime - this.activeTapTime
      
      if (timeSinceTap > this.tapDuration) {
        // Start zooming out
        const zoomOutProgress = Math.min(1, (timeSinceTap - this.tapDuration) / this.zoomOutSpeed)
        const easedProgress = this.easeInOutCubic(zoomOutProgress)
        
        // Zoom back to 1x
        this.targetZoom = maxZoomLevel - (maxZoomLevel - 1) * easedProgress
        
        // Gradually center
        if (zoomOutProgress > 0.5) {
          const centerProgress = (zoomOutProgress - 0.5) * 2
          this.targetX = this.x + (this.videoWidth / 2 - this.x) * centerProgress * 0.1
          this.targetY = this.y + (this.videoHeight / 2 - this.y) * centerProgress * 0.1
        }
      }
      // If within tap duration, maintain zoom (handled by spring physics)
    }
    // If no first tap yet, stay zoomed out (default state)

    this.applyLerp()
    this.clampPosition()
  }

  /**
   * Find if current time is within a tap's active window
   */
  findActiveTap(currentTime, taps) {
    const anticipation = 0.25  // Start moving earlier for smoother arrival
    const holdTime = this.tapDuration
    
    for (const tap of taps) {
      const tapStart = tap.time - anticipation
      const tapEnd = tap.time + holdTime
      
      if (currentTime >= tapStart && currentTime <= tapEnd) {
        return tap
      }
    }
    
    return null
  }

  /**
   * Cubic ease in-out - smooth start and end
   */
  easeInOutCubic(t) {
    return t < 0.5
      ? 4 * t * t * t
      : 1 - Math.pow(-2 * t + 2, 3) / 2
  }

  /**
   * Apply simple linear interpolation - no bouncing possible
   */
  applyLerp() {
    // Position - smooth lerp toward target
    this.x += (this.targetX - this.x) * this.lerpSpeed
    this.y += (this.targetY - this.y) * this.lerpSpeed

    // Zoom - even smoother lerp
    this.zoom += (this.targetZoom - this.zoom) * this.zoomLerpSpeed
  }

  /**
   * Clamp camera position
   */
  clampPosition() {
    const viewWidth = this.videoWidth / this.zoom
    const viewHeight = this.videoHeight / this.zoom
    
    const minX = viewWidth / 2
    const maxX = this.videoWidth - viewWidth / 2
    const minY = viewHeight / 2
    const maxY = this.videoHeight - viewHeight / 2

    if (maxX > minX) {
      this.x = Math.max(minX, Math.min(maxX, this.x))
    } else {
      this.x = this.videoWidth / 2
    }
    
    if (maxY > minY) {
      this.y = Math.max(minY, Math.min(maxY, this.y))
    } else {
      this.y = this.videoHeight / 2
    }
    
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
      targetZoom: this.targetZoom,
      hasHadFirstTap: this.hasHadFirstTap,
    }
  }

  /**
   * Reset camera
   */
  reset() {
    this.x = this.videoWidth / 2
    this.y = this.videoHeight / 2
    this.targetX = this.x
    this.targetY = this.y
    this.zoom = 1
    this.targetZoom = 1
    this.activeTapTime = -999
    this.hasHadFirstTap = false
  }

  /**
   * Generate keyframes for export
   */
  generateKeyframes(taps, duration, fps = 30, maxZoomLevel = 1.8) {
    const keyframes = []
    const frameInterval = 1 / fps
    
    this.reset()
    
    for (let time = 0; time < duration; time += frameInterval) {
      this.update(time, taps, maxZoomLevel)
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
