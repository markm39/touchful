/**
 * Crop overlay UI with grid and drag handles
 */
export function CropOverlay({ cropBounds, onDragStart }) {
  return (
    <div className="absolute inset-0 z-20 pointer-events-none">
      {/* Darkened areas using clip-path */}
      <div
        className="absolute inset-0 bg-black/60"
        style={{
          clipPath: `polygon(
            0% 0%, 100% 0%, 100% 100%, 0% 100%, 0% 0%,
            ${cropBounds.x}% ${cropBounds.y}%,
            ${cropBounds.x}% ${cropBounds.y + cropBounds.height}%,
            ${cropBounds.x + cropBounds.width}% ${cropBounds.y + cropBounds.height}%,
            ${cropBounds.x + cropBounds.width}% ${cropBounds.y}%,
            ${cropBounds.x}% ${cropBounds.y}%
          )`
        }}
      />

      {/* Crop region */}
      <div
        className="absolute border-2 border-white cursor-move pointer-events-auto"
        style={{
          left: `${cropBounds.x}%`,
          top: `${cropBounds.y}%`,
          width: `${cropBounds.width}%`,
          height: `${cropBounds.height}%`,
        }}
        onMouseDown={(e) => onDragStart('move', e)}
      >
        {/* Grid lines */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute left-1/3 top-0 bottom-0 w-px bg-white/40" />
          <div className="absolute left-2/3 top-0 bottom-0 w-px bg-white/40" />
          <div className="absolute top-1/3 left-0 right-0 h-px bg-white/40" />
          <div className="absolute top-2/3 left-0 right-0 h-px bg-white/40" />
        </div>

        {/* Corner handles */}
        <div
          className="absolute w-5 h-5 bg-white rounded-sm cursor-nw-resize pointer-events-auto"
          style={{ left: 0, top: 0, transform: 'translate(-50%, -50%)' }}
          onMouseDown={(e) => onDragStart('tl', e)}
        />
        <div
          className="absolute w-5 h-5 bg-white rounded-sm cursor-ne-resize pointer-events-auto"
          style={{ right: 0, top: 0, transform: 'translate(50%, -50%)' }}
          onMouseDown={(e) => onDragStart('tr', e)}
        />
        <div
          className="absolute w-5 h-5 bg-white rounded-sm cursor-sw-resize pointer-events-auto"
          style={{ left: 0, bottom: 0, transform: 'translate(-50%, 50%)' }}
          onMouseDown={(e) => onDragStart('bl', e)}
        />
        <div
          className="absolute w-5 h-5 bg-white rounded-sm cursor-se-resize pointer-events-auto"
          style={{ right: 0, bottom: 0, transform: 'translate(50%, 50%)' }}
          onMouseDown={(e) => onDragStart('br', e)}
        />
      </div>

      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white text-xs bg-black/70 px-3 py-1.5 rounded pointer-events-none">
        Drag to move - Corners to resize
      </div>
    </div>
  )
}
