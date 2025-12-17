import { useRef, useCallback, useState, useEffect } from 'react'

function Timeline({ duration, currentTime, tapEvents, onSeek, onEditTap, onDeleteTap, onSelectTap, selectedTapIndex }) {
  const trackRef = useRef(null)
  const containerRef = useRef(null)
  const [isDragging, setIsDragging] = useState(false)
  const [hoveredTapIndex, setHoveredTapIndex] = useState(null)
  
  // Timeline zoom
  const [zoom, setZoom] = useState(1) // 1 = fit all, higher = zoomed in
  const [scrollPosition, setScrollPosition] = useState(0)

  // Calculate visible range based on zoom
  const visibleDuration = duration / zoom
  const startTime = scrollPosition
  const endTime = Math.min(startTime + visibleDuration, duration)

  const getTimeFromPosition = useCallback((clientX) => {
    const track = trackRef.current
    if (!track || duration === 0) return 0

    const rect = track.getBoundingClientRect()
    const x = clientX - rect.left
    const progress = Math.max(0, Math.min(1, x / rect.width))
    return startTime + progress * visibleDuration
  }, [duration, startTime, visibleDuration])

  const handleMouseDown = useCallback((e) => {
    if (e.target.closest('.tap-marker')) return
    
    // Deselect any selected tap when clicking on timeline (not on a marker)
    if (onSelectTap && selectedTapIndex !== null) {
      onSelectTap(null)
    }
    
    setIsDragging(true)
    const time = getTimeFromPosition(e.clientX)
    onSeek(Math.max(0, Math.min(time, duration)))
  }, [getTimeFromPosition, onSeek, duration, onSelectTap, selectedTapIndex])

  const handleMouseMove = useCallback((e) => {
    if (!isDragging) return
    const time = getTimeFromPosition(e.clientX)
    onSeek(Math.max(0, Math.min(time, duration)))
  }, [isDragging, getTimeFromPosition, onSeek, duration])

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  // Global mouse events
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
      return () => {
        window.removeEventListener('mousemove', handleMouseMove)
        window.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [isDragging, handleMouseMove, handleMouseUp])

  const handleTapClick = useCallback((index, e) => {
    e.stopPropagation()
    if (onSelectTap) {
      onSelectTap(selectedTapIndex === index ? null : index)
    }
    if (tapEvents[index]) {
      onSeek(tapEvents[index].time)
    }
  }, [selectedTapIndex, tapEvents, onSeek, onSelectTap])

  // Mouse wheel zoom
  const handleWheel = useCallback((e) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault()
      const delta = e.deltaY > 0 ? -0.2 : 0.2
      setZoom(prev => Math.max(1, Math.min(10, prev + delta * prev)))
    } else {
      // Scroll timeline horizontally
      const delta = e.deltaX || e.deltaY
      setScrollPosition(prev => {
        const maxScroll = Math.max(0, duration - visibleDuration)
        return Math.max(0, Math.min(maxScroll, prev + delta * 0.01 * visibleDuration))
      })
    }
  }, [duration, visibleDuration])

  // Keep playhead in view
  useEffect(() => {
    if (currentTime < startTime) {
      setScrollPosition(Math.max(0, currentTime - visibleDuration * 0.1))
    } else if (currentTime > endTime) {
      setScrollPosition(Math.min(duration - visibleDuration, currentTime - visibleDuration * 0.9))
    }
  }, [currentTime, startTime, endTime, visibleDuration, duration])

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    const ms = Math.floor((seconds % 1) * 10)
    return `${mins}:${secs.toString().padStart(2, '0')}.${ms}`
  }

  // Calculate position within visible range
  const getVisiblePosition = (time) => {
    if (time < startTime || time > endTime) return null
    return ((time - startTime) / visibleDuration) * 100
  }

  const playheadPosition = getVisiblePosition(currentTime)

  return (
    <div className="glass-panel p-4">
      {/* Header with time and zoom controls */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <h3 className="text-white font-semibold text-sm">Timeline</h3>
          <span className="text-mavs-blue font-mono text-sm">{formatTime(currentTime)}</span>
          <span className="text-mavs-silver text-xs">/ {formatTime(duration)}</span>
        </div>
        
        {/* Zoom controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setZoom(prev => Math.max(1, prev / 1.5))}
            className="w-6 h-6 rounded bg-mavs-navy/50 text-mavs-silver hover:text-white text-xs flex items-center justify-center"
            title="Zoom out"
          >
            -
          </button>
          <span className="text-mavs-silver text-xs w-12 text-center">{zoom.toFixed(1)}x</span>
          <button
            onClick={() => setZoom(prev => Math.min(10, prev * 1.5))}
            className="w-6 h-6 rounded bg-mavs-navy/50 text-mavs-silver hover:text-white text-xs flex items-center justify-center"
            title="Zoom in"
          >
            +
          </button>
          <button
            onClick={() => { setZoom(1); setScrollPosition(0) }}
            className="px-2 h-6 rounded bg-mavs-navy/50 text-mavs-silver hover:text-white text-xs"
          >
            Fit
          </button>
        </div>
      </div>

      {/* Timeline Track */}
      <div
        ref={containerRef}
        className="relative"
        onWheel={handleWheel}
      >
        <div
          ref={trackRef}
          className="relative h-14 bg-mavs-navy/60 rounded-lg cursor-pointer select-none overflow-hidden"
          onMouseDown={handleMouseDown}
        >
          {/* Waveform visualization */}
          <div className="absolute inset-0 flex items-center px-0.5">
            {Array.from({ length: Math.floor(visibleDuration * 5) }).map((_, i) => {
              const waveTime = startTime + (i / (visibleDuration * 5)) * visibleDuration
              return (
                <div
                  key={i}
                  className="flex-1 mx-px bg-mavs-blue/20 rounded-sm"
                  style={{ 
                    height: `${20 + Math.sin(waveTime * 2) * 15 + Math.cos(waveTime * 5) * 10}%`,
                  }}
                />
              )
            })}
          </div>

          {/* Progress fill */}
          {playheadPosition !== null && (
            <div 
              className="absolute inset-y-0 left-0 bg-mavs-blue/20 pointer-events-none"
              style={{ width: `${playheadPosition}%` }}
            />
          )}

          {/* Tap markers */}
          {tapEvents.map((tap, index) => {
            const position = getVisiblePosition(tap.time)
            if (position === null) return null
            
            const isSelected = selectedTapIndex === index
            const isHovered = hoveredTapIndex === index
            
            return (
              <div
                key={index}
                className="tap-marker absolute top-0 bottom-0 flex flex-col items-center justify-center cursor-pointer z-10"
                style={{ left: `${position}%`, transform: 'translateX(-50%)' }}
                onClick={(e) => handleTapClick(index, e)}
                onMouseEnter={() => setHoveredTapIndex(index)}
                onMouseLeave={() => setHoveredTapIndex(null)}
              >
                {/* Tap line */}
                <div 
                  className={`w-0.5 h-full transition-all ${
                    isSelected ? 'bg-white w-1' : isHovered ? 'bg-mavs-silver' : 'bg-mavs-blue'
                  }`}
                />
                
                {/* Tap dot */}
                <div 
                  className={`absolute top-1/2 -translate-y-1/2 rounded-full border-2 transition-all ${
                    isSelected 
                      ? 'w-5 h-5 bg-white border-white' 
                      : isHovered
                        ? 'w-4 h-4 bg-mavs-silver border-mavs-silver'
                        : 'w-3 h-3 bg-mavs-blue border-mavs-blue'
                  }`}
                />

                {/* Tooltip */}
                {(isHovered || isSelected) && (
                  <div className="absolute -top-8 bg-mavs-navy/95 px-2 py-1 rounded text-xs text-white whitespace-nowrap shadow-lg z-20 border border-mavs-blue/30">
                    {formatTime(tap.time)} • {tap.animation || 'ripple'}
                  </div>
                )}
              </div>
            )
          })}

          {/* Playhead */}
          {playheadPosition !== null && (
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-white shadow-lg z-20 pointer-events-none"
              style={{ left: `${playheadPosition}%` }}
            >
              <div className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-white rounded-full shadow" />
              <div className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-white rounded-full shadow" />
            </div>
          )}

          {/* Time markers */}
          <div className="absolute bottom-0 left-0 right-0 flex justify-between px-2 text-xs text-mavs-silver/40 pointer-events-none">
            {Array.from({ length: 5 }).map((_, i) => {
              const time = startTime + (visibleDuration * i / 4)
              return <span key={i}>{formatTime(time)}</span>
            })}
          </div>
        </div>

        {/* Scroll bar for zoomed timeline */}
        {zoom > 1 && (
          <div className="mt-1 h-1.5 bg-mavs-navy/40 rounded-full overflow-hidden">
            <div
              className="h-full bg-mavs-blue/50 rounded-full cursor-grab active:cursor-grabbing"
              style={{
                width: `${(1 / zoom) * 100}%`,
                marginLeft: `${(scrollPosition / duration) * 100}%`,
              }}
              onMouseDown={(e) => {
                e.stopPropagation()
                const startX = e.clientX
                const startScroll = scrollPosition
                
                const handleMove = (me) => {
                  const container = containerRef.current
                  if (!container) return
                  const dx = me.clientX - startX
                  const pxPerSecond = container.offsetWidth / duration
                  setScrollPosition(Math.max(0, Math.min(duration - visibleDuration, startScroll + dx / pxPerSecond)))
                }
                
                const handleUp = () => {
                  window.removeEventListener('mousemove', handleMove)
                  window.removeEventListener('mouseup', handleUp)
                }
                
                window.addEventListener('mousemove', handleMove)
                window.addEventListener('mouseup', handleUp)
              }}
            />
          </div>
        )}
      </div>

      {/* Selected tap controls */}
      {selectedTapIndex !== null && tapEvents[selectedTapIndex] && (
        <div className="mt-3 p-2 glass-panel-light rounded-lg flex items-center gap-3 text-sm">
          <span className="text-mavs-silver">
            Tap {selectedTapIndex + 1}: {formatTime(tapEvents[selectedTapIndex].time)}
          </span>
          <span className="text-mavs-blue">{tapEvents[selectedTapIndex].animation || 'ripple'}</span>
          <div className="flex-1" />
          {onDeleteTap && (
            <button
              onClick={() => {
                onDeleteTap(selectedTapIndex)
                if (onSelectTap) onSelectTap(null)
              }}
              className="text-red-400 hover:text-red-300 text-xs"
            >
              Delete
            </button>
          )}
        </div>
      )}

      {/* Quick tap navigation */}
      {tapEvents.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {tapEvents.map((tap, index) => (
            <button
              key={index}
              onClick={() => {
                if (onSelectTap) onSelectTap(index)
                onSeek(tap.time)
                // Scroll to make tap visible
                if (tap.time < startTime || tap.time > endTime) {
                  setScrollPosition(Math.max(0, tap.time - visibleDuration / 2))
                }
              }}
              className={`px-2 py-0.5 rounded text-xs transition-all ${
                selectedTapIndex === index
                  ? 'bg-mavs-blue text-white'
                  : 'bg-mavs-navy/50 text-mavs-silver hover:text-white'
              }`}
            >
              {formatTime(tap.time)}
            </button>
          ))}
        </div>
      )}

      {/* Help text */}
      <p className="mt-2 text-mavs-silver/40 text-xs">
        Scroll to pan • Ctrl+scroll to zoom • Click to scrub • Click taps to edit
      </p>
    </div>
  )
}

export default Timeline
