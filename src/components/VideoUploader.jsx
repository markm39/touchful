import { useState, useCallback, useRef } from 'react'

function VideoUploader({ onUpload }) {
  const [isDragOver, setIsDragOver] = useState(false)
  const fileInputRef = useRef(null)

  const handleDragOver = useCallback((e) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e) => {
    e.preventDefault()
    setIsDragOver(false)
  }, [])

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    setIsDragOver(false)
    
    const files = e.dataTransfer.files
    if (files.length > 0) {
      const file = files[0]
      if (file.type.startsWith('video/')) {
        onUpload(file)
      }
    }
  }, [onUpload])

  const handleFileSelect = useCallback((e) => {
    const file = e.target.files?.[0]
    if (file && file.type.startsWith('video/')) {
      onUpload(file)
    }
  }, [onUpload])

  const handleClick = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  return (
    <div
      className={`glass-panel p-12 drop-zone cursor-pointer transition-all duration-300 ${
        isDragOver ? 'drag-over' : ''
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleClick}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="video/*"
        onChange={handleFileSelect}
        className="hidden"
      />
      
      <div className="flex flex-col items-center justify-center min-h-[300px] text-center">
        {/* Upload Icon */}
        <div className="w-24 h-24 mb-8 relative">
          <div className="absolute inset-0 bg-mavs-blue/20 rounded-full animate-pulse-glow" />
          <div className="absolute inset-2 glass-panel-light rounded-full flex items-center justify-center">
            <svg
              className="w-10 h-10 text-mavs-silver"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
          </div>
        </div>

        {/* Text */}
        <h2 className="text-2xl font-bold text-white mb-3">
          {isDragOver ? 'Drop your video here' : 'Upload Screen Recording'}
        </h2>
        <p className="text-mavs-silver text-lg mb-6 max-w-md">
          Drag & drop your iPhone screen recording here, or click to browse.
          We'll detect your taps and create smooth zoom animations.
        </p>

        {/* Supported formats */}
        <div className="flex items-center gap-4 text-sm text-mavs-silver/70">
          <span className="glass-panel-light px-3 py-1 rounded-full">.MOV</span>
          <span className="glass-panel-light px-3 py-1 rounded-full">.MP4</span>
          <span className="glass-panel-light px-3 py-1 rounded-full">.WEBM</span>
        </div>

        {/* Instructions */}
        <div className="mt-10 glass-panel-light p-6 rounded-2xl max-w-lg">
          <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-mavs-blue/40 flex items-center justify-center text-xs">
              ?
            </span>
            How to record with tap indicators
          </h3>
          <ol className="text-mavs-silver text-sm space-y-2 text-left">
            <li>1. Go to Settings → Accessibility → Touch → AssistiveTouch</li>
            <li>2. Enable AssistiveTouch and create a custom "Tap" gesture</li>
            <li>3. Set "Idle Opacity" to minimum (15%)</li>
            <li>4. Record your screen — the tap circles will be visible!</li>
          </ol>
        </div>
      </div>
    </div>
  )
}

export default VideoUploader








