/**
 * Resize handles for video transform editing
 */
export function ResizeHandles({ videoTransform, onDragStart }) {
  return (
    <>
      {/* Video bounding box - positioned to match videoTransform */}
      <div
        className="absolute pointer-events-none z-20"
        style={{
          left: '50%',
          top: '50%',
          width: `${videoTransform.scale * 100}%`,
          height: `${videoTransform.scale * 100}%`,
          transform: `translate(calc(-50% + ${videoTransform.x * 0.5}%), calc(-50% + ${videoTransform.y * 0.5}%))`,
          border: '2px solid #00538C',
        }}
      >
        {/* Corner handles */}
        <div
          className="absolute w-4 h-4 bg-white border-2 border-mavs-blue rounded-sm cursor-nw-resize pointer-events-auto"
          style={{ left: 0, top: 0, transform: 'translate(-50%, -50%)' }}
          onMouseDown={(e) => onDragStart('tl', e)}
        />
        <div
          className="absolute w-4 h-4 bg-white border-2 border-mavs-blue rounded-sm cursor-ne-resize pointer-events-auto"
          style={{ right: 0, top: 0, transform: 'translate(50%, -50%)' }}
          onMouseDown={(e) => onDragStart('tr', e)}
        />
        <div
          className="absolute w-4 h-4 bg-white border-2 border-mavs-blue rounded-sm cursor-sw-resize pointer-events-auto"
          style={{ left: 0, bottom: 0, transform: 'translate(-50%, 50%)' }}
          onMouseDown={(e) => onDragStart('bl', e)}
        />
        <div
          className="absolute w-4 h-4 bg-white border-2 border-mavs-blue rounded-sm cursor-se-resize pointer-events-auto"
          style={{ right: 0, bottom: 0, transform: 'translate(50%, 50%)' }}
          onMouseDown={(e) => onDragStart('br', e)}
        />

        {/* Edge handles */}
        <div
          className="absolute w-8 h-3 bg-white border border-mavs-blue rounded-sm cursor-n-resize pointer-events-auto"
          style={{ left: '50%', top: 0, transform: 'translate(-50%, -50%)' }}
          onMouseDown={(e) => onDragStart('t', e)}
        />
        <div
          className="absolute w-8 h-3 bg-white border border-mavs-blue rounded-sm cursor-s-resize pointer-events-auto"
          style={{ left: '50%', bottom: 0, transform: 'translate(-50%, 50%)' }}
          onMouseDown={(e) => onDragStart('b', e)}
        />
        <div
          className="absolute w-3 h-8 bg-white border border-mavs-blue rounded-sm cursor-w-resize pointer-events-auto"
          style={{ left: 0, top: '50%', transform: 'translate(-50%, -50%)' }}
          onMouseDown={(e) => onDragStart('l', e)}
        />
        <div
          className="absolute w-3 h-8 bg-white border border-mavs-blue rounded-sm cursor-e-resize pointer-events-auto"
          style={{ right: 0, top: '50%', transform: 'translate(50%, -50%)' }}
          onMouseDown={(e) => onDragStart('r', e)}
        />
      </div>

      {/* Move overlay - covers entire area for move dragging */}
      <div
        className="absolute inset-0 z-10"
        onMouseDown={(e) => onDragStart('move', e)}
      />
    </>
  )
}
