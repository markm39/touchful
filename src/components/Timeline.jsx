import { useRef, useCallback } from 'react'

function Timeline({ duration, currentTime, tapEvents, onSeek }) {
  const trackRef = useRef(null)

  const handleClick = useCallback((e) => {
    const track = trackRef.current
    if (!track || duration === 0) return

    const rect = track.getBoundingClientRect()
    const x = e.clientX - rect.left
    const progress = x / rect.width
    const seekTime = progress * duration

    onSeek(Math.max(0, Math.min(seekTime, duration)))
  }, [duration, onSeek])

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const playheadPosition = duration > 0 ? (currentTime / duration) * 100 : 0

  return (
    <div className="glass-panel p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white font-semibold">Timeline</h3>
        <div className="flex items-center gap-4 text-sm text-mavs-silver">
          <span>{formatTime(currentTime)}</span>
          <span>/</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* Timeline Track */}
      <div
        ref={trackRef}
        className="timeline-track cursor-pointer relative"
        onClick={handleClick}
      >
        {/* Tap markers */}
        {tapEvents.map((tap, index) => (
          <div
            key={index}
            className="tap-indicator"
            style={{
              left: `${(tap.time / duration) * 100}%`,
              top: '50%',
              transform: 'translate(-50%, -50%)',
            }}
            title={`Tap at ${formatTime(tap.time)}`}
          />
        ))}

        {/* Playhead */}
        <div
          className="timeline-marker"
          style={{ left: `${playheadPosition}%` }}
        />

        {/* Time markers */}
        <div className="absolute bottom-0 left-0 right-0 flex justify-between px-2 py-1 text-xs text-mavs-silver/50">
          <span>0:00</span>
          {duration > 0 && (
            <>
              <span>{formatTime(duration / 4)}</span>
              <span>{formatTime(duration / 2)}</span>
              <span>{formatTime((duration * 3) / 4)}</span>
              <span>{formatTime(duration)}</span>
            </>
          )}
        </div>
      </div>

      {/* Tap events summary */}
      {tapEvents.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {tapEvents.slice(0, 10).map((tap, index) => (
            <button
              key={index}
              onClick={() => onSeek(tap.time)}
              className="glass-panel-light px-3 py-1 rounded-full text-sm text-mavs-silver hover:text-white hover:bg-mavs-blue/30 transition-colors"
            >
              {formatTime(tap.time)}
            </button>
          ))}
          {tapEvents.length > 10 && (
            <span className="px-3 py-1 text-sm text-mavs-silver/50">
              +{tapEvents.length - 10} more
            </span>
          )}
        </div>
      )}
    </div>
  )
}

export default Timeline

