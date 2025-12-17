// OpenCV.js Circle Detection for AssistiveTouch indicators
// Detects the semi-transparent grey AssistiveTouch dot and tracks taps
// Uses movement tracking to distinguish moving touch circle from stationary menu

let cv = null
let opencvLoaded = false
let loadingPromise = null

// Position history for movement tracking
let positionHistory = []
const HISTORY_LENGTH = 10

// Stationary position tracking - positions that don't move are likely the menu
let stationaryPositions = new Map() // gridKey -> { x, y, frameCount, lastSeen }
const STATIONARY_THRESHOLD = 5 // frames without movement to be considered stationary
const STATIONARY_GRID_SIZE = 50 // grid size for stationary tracking

// Calibration state
let calibratedTargetPos = null
let calibratedExcludePos = null

// Set calibration positions
export function setCalibration(targetPos, excludePos) {
  calibratedTargetPos = targetPos
  calibratedExcludePos = excludePos
  console.log('Calibration set - target:', targetPos, 'exclude:', excludePos)
}

// Exported for real-time debug view
export function findGreyCircleLive(ctx, width, height, lastPosition = null) {
  const circle = findGreyCircle(ctx, width, height, lastPosition, positionHistory, stationaryPositions)

  if (circle) {
    // Update history
    positionHistory.push({ x: circle.x, y: circle.y, time: Date.now() })
    if (positionHistory.length > HISTORY_LENGTH) {
      positionHistory.shift()
    }
  }

  return circle
}

// Reset history (call when starting new detection)
export function resetTracking() {
  positionHistory = []
  stationaryPositions.clear()
}

export async function initOpenCV() {
  if (opencvLoaded && cv) return true
  if (loadingPromise) return loadingPromise

  loadingPromise = new Promise((resolve, reject) => {
    if (window.cv && window.cv.Mat && typeof window.cv.imread === 'function') {
      cv = window.cv
      opencvLoaded = true
      console.log('OpenCV.js already available')
      resolve(true)
      return
    }

    const existingScript = document.querySelector('script[src="/opencv.js"]')

    const waitForRuntime = () => {
      if (window.cv && !window.cv.Mat) {
        window.cv.onRuntimeInitialized = () => {
          cv = window.cv
          opencvLoaded = true
          console.log('OpenCV.js runtime initialized')
          resolve(true)
        }
      } else {
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

    const script = document.createElement('script')
    script.src = '/opencv.js'
    script.async = true
    script.onload = () => waitForRuntime()
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
 * Calculate velocity from position history
 */
function calculateVelocity(history) {
  if (history.length < 3) return { x: 0, y: 0, magnitude: 0 }

  const recent = history.slice(-3)
  const vx = (recent[2].x - recent[0].x) / 2
  const vy = (recent[2].y - recent[0].y) / 2

  return {
    x: vx,
    y: vy,
    magnitude: Math.sqrt(vx * vx + vy * vy)
  }
}

/**
 * Predict next position based on trajectory
 */
function predictNextPosition(history) {
  if (history.length < 2) return null

  const velocity = calculateVelocity(history)
  const last = history[history.length - 1]

  return {
    x: last.x + velocity.x,
    y: last.y + velocity.y
  }
}

/**
 * Get stationary grid key for a position
 */
function getStationaryKey(x, y) {
  const gx = Math.floor(x / STATIONARY_GRID_SIZE)
  const gy = Math.floor(y / STATIONARY_GRID_SIZE)
  return `${gx},${gy}`
}

/**
 * Check if a position is in a stationary zone (likely menu button)
 */
function isInStationaryZone(x, y, stationaryMap) {
  const key = getStationaryKey(x, y)
  const stationary = stationaryMap.get(key)
  return stationary && stationary.frameCount >= STATIONARY_THRESHOLD
}

/**
 * Update stationary tracking for detected circles
 */
function updateStationaryTracking(circles, frameIndex, stationaryMap) {
  // Mark all detected circles
  for (const circle of circles) {
    const key = getStationaryKey(circle.x, circle.y)
    const existing = stationaryMap.get(key)

    if (existing) {
      // Check if position is similar (within grid cell)
      const dist = Math.sqrt((circle.x - existing.x) ** 2 + (circle.y - existing.y) ** 2)
      if (dist < STATIONARY_GRID_SIZE) {
        // Same position - increment counter
        existing.frameCount++
        existing.lastSeen = frameIndex
      } else {
        // Different position in same grid - reset
        stationaryMap.set(key, { x: circle.x, y: circle.y, frameCount: 1, lastSeen: frameIndex })
      }
    } else {
      stationaryMap.set(key, { x: circle.x, y: circle.y, frameCount: 1, lastSeen: frameIndex })
    }
  }

  // Decay old entries not seen recently
  for (const [key, entry] of stationaryMap) {
    if (frameIndex - entry.lastSeen > 20) {
      stationaryMap.delete(key)
    }
  }
}

/**
 * Detect AssistiveTouch dot by looking for grey/white semi-transparent circles
 * Uses movement tracking to distinguish from stationary menu button
 */
export async function detectCircles(video, canvas, onProgress) {
  if (!cv) {
    throw new Error('OpenCV not initialized. Call initOpenCV() first.')
  }

  const ctx = canvas.getContext('2d')
  const duration = video.duration
  const fps = 10 // Sample rate
  const frameInterval = 1 / fps

  canvas.width = video.videoWidth
  canvas.height = video.videoHeight

  const frameData = []
  let currentTime = 0
  const totalFrames = Math.floor(duration * fps)
  let frameIndex = 0

  // Movement tracking state
  const history = []
  const localStationaryMap = new Map()
  let lastValidPosition = null

  while (currentTime < duration) {
    video.currentTime = currentTime
    await new Promise(resolve => {
      video.onseeked = resolve
    })

    ctx.drawImage(video, 0, 0)

    // Get all candidate circles (not just the best one)
    const candidates = findAllGreyCircles(ctx, canvas.width, canvas.height)

    // Update stationary tracking with all candidates
    updateStationaryTracking(candidates, frameIndex, localStationaryMap)

    // Select the best circle using movement tracking
    const circle = selectBestCircle(
      candidates,
      lastValidPosition,
      history,
      localStationaryMap,
      frameIndex
    )

    if (circle) {
      frameData.push({
        time: currentTime,
        x: circle.x,
        y: circle.y,
        radius: circle.radius,
        brightness: circle.brightness,
        greyScore: circle.greyScore
      })

      // Update tracking
      history.push({ x: circle.x, y: circle.y, frame: frameIndex })
      if (history.length > HISTORY_LENGTH) history.shift()
      lastValidPosition = { x: circle.x, y: circle.y }
    } else {
      frameData.push({
        time: currentTime,
        x: null,
        y: null,
        radius: null,
        brightness: 0,
        greyScore: 0
      })
    }

    frameIndex++
    onProgress((frameIndex / totalFrames) * 60)
    currentTime += frameInterval
  }

  // Detect taps when the circle stops moving
  const taps = detectTapsFromMovement(frameData)

  onProgress(80)

  // Cluster nearby taps
  const clusteredTaps = clusterTaps(taps, 80, 0.5)

  onProgress(100)

  console.log(`Detected ${frameData.length} frames, ${taps.length} movement stops, ${clusteredTaps.length} taps`)
  console.log(`Identified ${localStationaryMap.size} stationary positions (potential menu buttons)`)

  return {
    taps: clusteredTaps,
    debugData: frameData
  }
}

/**
 * Find ALL grey circles in the frame (not just best one)
 */
function findAllGreyCircles(ctx, width, height) {
  const step = 4
  const imageData = ctx.getImageData(0, 0, width, height)
  const data = imageData.data

  const gridSize = 20
  const grid = new Map()

  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < width; x += step) {
      const i = (y * width + x) * 4
      const r = data[i]
      const g = data[i + 1]
      const b = data[i + 2]

      const avg = (r + g + b) / 3
      const maxDiff = Math.max(Math.abs(r - avg), Math.abs(g - avg), Math.abs(b - avg))

      if (maxDiff < 30 && avg > 90 && avg < 230) {
        const gx = Math.floor(x / gridSize)
        const gy = Math.floor(y / gridSize)
        const key = `${gx},${gy}`
        if (!grid.has(key)) grid.set(key, [])
        grid.get(key).push({ x, y, brightness: avg })
      }
    }
  }

  // Find connected components
  const visited = new Set()
  const circles = []

  for (const [key, pixels] of grid) {
    if (visited.has(key) || pixels.length < 2) continue

    const blob = []
    const queue = [key]

    while (queue.length > 0) {
      const k = queue.shift()
      if (visited.has(k)) continue
      visited.add(k)

      const cellPixels = grid.get(k)
      if (!cellPixels) continue
      blob.push(...cellPixels)

      const [gx, gy] = k.split(',').map(Number)
      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          if (dx === 0 && dy === 0) continue
          const nk = `${gx + dx},${gy + dy}`
          if (!visited.has(nk) && grid.has(nk) && grid.get(nk).length >= 2) {
            queue.push(nk)
          }
        }
      }
    }

    if (blob.length >= 10) {
      // Calculate circle properties
      let sumX = 0, sumY = 0, sumB = 0
      for (const p of blob) {
        sumX += p.x
        sumY += p.y
        sumB += p.brightness
      }
      const centerX = sumX / blob.length
      const centerY = sumY / blob.length
      const avgBrightness = sumB / blob.length

      let maxDist = 0
      for (const p of blob) {
        const dist = Math.sqrt((p.x - centerX) ** 2 + (p.y - centerY) ** 2)
        if (dist > maxDist) maxDist = dist
      }
      const radius = maxDist

      const estimatedPixels = blob.length * step * step
      const expectedArea = Math.PI * radius * radius
      const circularity = expectedArea > 0 ? estimatedPixels / expectedArea : 0

      // Only include reasonably circular blobs with valid size
      if (radius >= 15 && radius <= 120 && circularity > 0.2 && circularity < 1.5) {
        circles.push({
          x: centerX,
          y: centerY,
          radius,
          brightness: avgBrightness,
          greyScore: circularity,
          pixelCount: blob.length
        })
      }
    }
  }

  return circles
}

/**
 * Select the best circle using movement tracking logic
 * Rejects stationary objects (menu button) and prefers trajectory-consistent motion
 */
function selectBestCircle(candidates, lastPosition, history, stationaryMap, frameIndex) {
  if (candidates.length === 0) return null

  // Calculate predicted position based on trajectory
  const predicted = history.length >= 2 ? predictNextPosition(history) : null
  const velocity = history.length >= 3 ? calculateVelocity(history) : { magnitude: 0 }

  let bestCircle = null
  let bestScore = 0

  for (const circle of candidates) {
    let score = circle.pixelCount // Base score

    // === STATIONARY REJECTION ===
    // If this position has been stationary for many frames, heavily penalize or skip
    if (isInStationaryZone(circle.x, circle.y, stationaryMap)) {
      const key = getStationaryKey(circle.x, circle.y)
      const stationary = stationaryMap.get(key)
      if (stationary && stationary.frameCount >= STATIONARY_THRESHOLD * 2) {
        // Very stationary - almost certainly the menu button
        continue // Hard skip this candidate
      }
      score *= 0.1 // Heavy penalty for somewhat stationary positions
    }

    // === CALIBRATION EXCLUSION ===
    if (calibratedExcludePos) {
      const distToExclude = Math.sqrt(
        (circle.x - calibratedExcludePos.x) ** 2 +
        (circle.y - calibratedExcludePos.y) ** 2
      )
      if (distToExclude < 60) {
        continue // Hard skip - too close to marked menu
      } else if (distToExclude < 120) {
        score *= 0.2
      }
    }

    // === TRAJECTORY CONSISTENCY ===
    if (predicted && velocity.magnitude > 5) {
      // We have meaningful motion - prefer circles near predicted position
      const distToPredicted = Math.sqrt(
        (circle.x - predicted.x) ** 2 +
        (circle.y - predicted.y) ** 2
      )

      if (distToPredicted < 50) {
        score *= 3 // Strong bonus for trajectory-consistent detection
      } else if (distToPredicted < 100) {
        score *= 1.5
      } else if (distToPredicted > 200) {
        // Large jump from predicted - suspicious
        // Check if it's jumping TO a stationary position (likely menu)
        if (isInStationaryZone(circle.x, circle.y, stationaryMap)) {
          continue // Reject jump to stationary position
        }
        score *= 0.3 // Penalize large trajectory breaks
      }
    }

    // === TRACKING CONTINUITY ===
    if (lastPosition) {
      const distFromLast = Math.sqrt(
        (circle.x - lastPosition.x) ** 2 +
        (circle.y - lastPosition.y) ** 2
      )

      if (distFromLast < 60) {
        score *= 2 // Good continuity
      } else if (distFromLast < 120) {
        score *= 1.2
      } else if (distFromLast > 250) {
        // Sudden large jump - only allow if NOT going to stationary position
        if (isInStationaryZone(circle.x, circle.y, stationaryMap)) {
          continue
        }
      }
    }

    // === CALIBRATION TARGET BONUS ===
    if (calibratedTargetPos) {
      const distToTarget = Math.sqrt(
        (circle.x - calibratedTargetPos.x) ** 2 +
        (circle.y - calibratedTargetPos.y) ** 2
      )
      if (distToTarget < 100) {
        score *= 1.5 // Mild bonus for being near calibrated start position
      }
    }

    if (score > bestScore) {
      bestScore = score
      bestCircle = circle
    }
  }

  return bestCircle
}

/**
 * Legacy function for backward compatibility with live debug view
 */
function findGreyCircle(ctx, width, height, lastPosition, history = [], stationaryMap = new Map()) {
  const candidates = findAllGreyCircles(ctx, width, height)
  return selectBestCircle(candidates, lastPosition, history, stationaryMap, 0)
}

/**
 * Detect taps by finding moments where the dot stops moving
 */
function detectTapsFromMovement(frameData) {
  const taps = []
  const movementThreshold = 15
  const minPauseFrames = 2

  let pauseStart = null
  let pausePosition = null

  for (let i = 1; i < frameData.length; i++) {
    const prev = frameData[i - 1]
    const curr = frameData[i]

    if (curr.x === null || prev.x === null) {
      if (pauseStart !== null && (i - pauseStart) >= minPauseFrames) {
        taps.push({
          time: frameData[pauseStart].time,
          x: Math.round(pausePosition.x),
          y: Math.round(pausePosition.y)
        })
      }
      pauseStart = null
      continue
    }

    const movement = Math.sqrt((curr.x - prev.x) ** 2 + (curr.y - prev.y) ** 2)

    if (movement < movementThreshold) {
      if (pauseStart === null) {
        pauseStart = i
        pausePosition = { x: curr.x, y: curr.y }
      }
    } else {
      if (pauseStart !== null) {
        const pauseLength = i - pauseStart
        if (pauseLength >= minPauseFrames) {
          taps.push({
            time: frameData[pauseStart].time,
            x: Math.round(pausePosition.x),
            y: Math.round(pausePosition.y)
          })
        }
      }
      pauseStart = null
    }
  }

  if (pauseStart !== null && (frameData.length - pauseStart) >= minPauseFrames) {
    taps.push({
      time: frameData[pauseStart].time,
      x: Math.round(pausePosition.x),
      y: Math.round(pausePosition.y)
    })
  }

  return taps
}

/**
 * Cluster taps that are close in space and time
 */
function clusterTaps(taps, distThreshold, timeThreshold) {
  if (taps.length === 0) return []

  const clusters = []
  let currentCluster = [taps[0]]

  for (let i = 1; i < taps.length; i++) {
    const tap = taps[i]
    const lastTap = currentCluster[currentCluster.length - 1]

    const dist = Math.sqrt(
      Math.pow(tap.x - lastTap.x, 2) +
      Math.pow(tap.y - lastTap.y, 2)
    )
    const timeDiff = tap.time - lastTap.time

    if (dist < distThreshold && timeDiff < timeThreshold) {
      currentCluster.push(tap)
    } else {
      clusters.push(currentCluster)
      currentCluster = [tap]
    }
  }
  clusters.push(currentCluster)

  return clusters.map(cluster => ({
    time: cluster[0].time,
    x: cluster[0].x,
    y: cluster[0].y,
    type: 'tap'
  }))
}
