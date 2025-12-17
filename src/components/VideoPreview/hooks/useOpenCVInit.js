import { useState, useEffect } from 'react'
import { initOpenCV } from '../../../lib/circleDetector'

/**
 * Hook to initialize OpenCV.js
 * Returns ready state and any error that occurred
 */
export function useOpenCVInit() {
  const [opencvReady, setOpencvReady] = useState(false)
  const [opencvError, setOpencvError] = useState(null)

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

  return { opencvReady, opencvError }
}
