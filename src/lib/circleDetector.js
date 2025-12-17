// OpenCV.js Circle Detection for AssistiveTouch indicators

let cv = null
let opencvLoaded = false
let loadingPromise = null

export async function initOpenCV() {
  // Already loaded
  if (opencvLoaded && cv) return true

  // Already loading - return existing promise
  if (loadingPromise) return loadingPromise

  loadingPromise = new Promise((resolve, reject) => {
    // Check if already loaded and fully initialized
    if (window.cv && window.cv.Mat && typeof window.cv.imread === 'function') {
      cv = window.cv
      opencvLoaded = true
      console.log('OpenCV.js already available')
      resolve(true)
      return
    }

    // Check if script tag already exists
    const existingScript = document.querySelector('script[src="/opencv.js"]')
    
    const waitForRuntime = () => {
      // Set up the onRuntimeInitialized callback
      if (window.cv && !window.cv.Mat) {
        // cv exists but not fully initialized - set up callback
        window.cv.onRuntimeInitialized = () => {
          cv = window.cv
          opencvLoaded = true
          console.log('OpenCV.js runtime initialized')
          resolve(true)
        }
      } else {
        // Poll for readiness
        let attempts = 0
        const maxAttempts = 100
        const checkReady = () => {
          attempts++
          if (window.cv && window.cv.Mat && typeof window.cv.imread === 'function') {
            cv = window.cv
            opencvLoaded = true
            console.log('OpenCV.js loaded successfully')
            resolve(true)
          } else if (attempts < maxAttempts) {
            setTimeout(checkReady, 100)
          } else {
            reject(new Error('OpenCV.js failed to initialize'))
          }
        }
        checkReady()
      }
    }

    if (existingScript) {
      waitForRuntime()
      return
    }

    // Load from local file (bundled in public folder)
    const script = document.createElement('script')
    script.src = '/opencv.js'
    script.async = true
    
    script.onload = () => {
      waitForRuntime()
    }

    script.onerror = (err) => {
      console.error('Failed to load OpenCV.js:', err)
      loadingPromise = null
      reject(new Error('Failed to load OpenCV.js'))
    }

    document.head.appendChild(script)
  })

  return loadingPromise
}

/**
 * Detect AssistiveTouch circles in video frames
 * @param {HTMLVideoElement} video - The video element
 * @param {HTMLCanvasElement} canvas - A canvas for frame extraction
 * @param {Function} onProgress - Progress callback (0-100)
 * @returns {Array<{time: number, x: number, y: number}>} - Detected tap events
 */
export async function detectCircles(video, canvas, onProgress) {
  if (!cv) {
    throw new Error('OpenCV not initialized. Call initOpenCV() first.')
  }

  const events = []
  const ctx = canvas.getContext('2d')
  const duration = video.duration
  const fps = 10 // Sample 10 frames per second for efficiency
  const frameInterval = 1 / fps
  
  // Set canvas size
  canvas.width = video.videoWidth
  canvas.height = video.videoHeight

  // Store previous circle position to filter out stationary menu button
  let stationaryPosition = null
  let stationaryCount = 0
  const stationaryThreshold = 30 // pixels

  // Process frames
  let currentTime = 0
  const totalFrames = Math.floor(duration * fps)
  let frameIndex = 0

  while (currentTime < duration) {
    // Seek to frame
    video.currentTime = currentTime
    await new Promise(resolve => {
      video.onseeked = resolve
    })

    // Draw frame to canvas
    ctx.drawImage(video, 0, 0)

    // Create OpenCV matrices using imread from canvas (more compatible)
    const src = cv.imread(canvas)
    const gray = new cv.Mat()
    const circles = new cv.Mat()

    try {
      // Convert to grayscale
      cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY)

      // Apply Gaussian blur to reduce noise
      const ksize = new cv.Size(9, 9)
      cv.GaussianBlur(gray, gray, ksize, 2, 2)

      // Detect circles using Hough Circle Transform
      // Parameters tuned for AssistiveTouch circles (~40-80px diameter on retina screens)
      cv.HoughCircles(
        gray,
        circles,
        cv.HOUGH_GRADIENT,
        1,                    // dp - accumulator resolution
        100,                  // minDist - minimum distance between circle centers
        100,                  // param1 - Canny edge detector threshold
        30,                   // param2 - accumulator threshold (lower = more circles)
        20,                   // minRadius
        80                    // maxRadius
      )

      // Process detected circles
      for (let i = 0; i < circles.cols; i++) {
        const x = circles.data32F[i * 3]
        const y = circles.data32F[i * 3 + 1]
        const radius = circles.data32F[i * 3 + 2]

        // Skip if this is likely the stationary menu button
        if (stationaryPosition) {
          const dist = Math.sqrt(
            Math.pow(x - stationaryPosition.x, 2) +
            Math.pow(y - stationaryPosition.y, 2)
          )
          if (dist < stationaryThreshold) {
            stationaryCount++
            continue
          }
        }

        // Check if circle is at screen edge (likely menu button)
        const edgeMargin = 100
        const isAtEdge = 
          x < edgeMargin || 
          x > canvas.width - edgeMargin ||
          y < edgeMargin ||
          y > canvas.height - edgeMargin

        if (isAtEdge && stationaryCount < 5) {
          // Track as potential stationary button
          if (!stationaryPosition) {
            stationaryPosition = { x, y }
          }
          continue
        }

        // Valid tap detected!
        // Avoid duplicate events (within 0.2s and 50px)
        const isDuplicate = events.some(e => 
          Math.abs(e.time - currentTime) < 0.2 &&
          Math.sqrt(Math.pow(e.x - x, 2) + Math.pow(e.y - y, 2)) < 50
        )

        if (!isDuplicate) {
          events.push({
            time: currentTime,
            x: Math.round(x),
            y: Math.round(y),
            radius: Math.round(radius)
          })
        }
      }
    } finally {
      // Clean up OpenCV matrices
      src.delete()
      gray.delete()
      circles.delete()
    }

    // Update progress
    frameIndex++
    onProgress((frameIndex / totalFrames) * 100)

    // Next frame
    currentTime += frameInterval
  }

  // Sort events by time
  events.sort((a, b) => a.time - b.time)

  // Post-process: merge very close events
  const mergedEvents = []
  for (const event of events) {
    const lastEvent = mergedEvents[mergedEvents.length - 1]
    if (lastEvent && event.time - lastEvent.time < 0.15) {
      // Merge with previous event (average position)
      lastEvent.x = Math.round((lastEvent.x + event.x) / 2)
      lastEvent.y = Math.round((lastEvent.y + event.y) / 2)
    } else {
      mergedEvents.push(event)
    }
  }

  return mergedEvents
}

/**
 * Debug: Draw detected circles on canvas
 */
export function debugDrawCircles(canvas, events, currentTime) {
  const ctx = canvas.getContext('2d')
  
  for (const event of events) {
    if (Math.abs(event.time - currentTime) < 0.1) {
      ctx.beginPath()
      ctx.arc(event.x, event.y, event.radius || 30, 0, Math.PI * 2)
      ctx.strokeStyle = '#00538C'
      ctx.lineWidth = 3
      ctx.stroke()
      
      ctx.fillStyle = 'rgba(0, 83, 140, 0.3)'
      ctx.fill()
    }
  }
}

