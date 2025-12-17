import { setCalibration } from '../../../lib/circleDetector'
import { CropOverlay } from './CropOverlay'
import { ResizeHandles } from './ResizeHandles'

/**
 * Preview overlays - calibration markers, guides, handles, and tap drag overlay
 * Shared between device frame and video-only preview modes
 */
export function PreviewOverlays({
  videoRef,
  containerRef,
  calibrationStep,
  autodetectMode,
  targetCirclePos,
  setTargetCirclePos,
  targetCircleRadius,
  setTargetCircleRadius,
  excludePosition,
  setExcludePosition,
  excludeRadius,
  setExcludeRadius,
  setIsDraggingMarker,
  snapGuides,
  editMode,
  videoTransform,
  handleDragStart,
  cropMode,
  cropBounds,
  handleCropDragStart,
  selectedTapIndex,
  tapEvents,
  isDraggingTap,
  handleTapDragStart,
  onSelectTap,
}) {
  const video = videoRef.current
  const container = containerRef.current
  const videoW = video?.videoWidth || 1080
  const videoH = video?.videoHeight || 1920
  const rect = container?.getBoundingClientRect()

  return (
    <>
      {/* Calibration step overlay */}
      {calibrationStep && (
        <div className="absolute inset-0 bg-black/30 flex items-center justify-center z-50 pointer-events-none">
          <div className={`px-4 py-2 rounded-lg text-white text-sm ${calibrationStep === 'circle' ? 'bg-green-600' : 'bg-red-600'}`}>
            {calibrationStep === 'circle' ? 'Click on the touch indicator circle' : 'Click on the menu button to exclude'}
          </div>
        </div>
      )}

      {/* Calibration markers during autodetect */}
      {autodetectMode && !calibrationStep && (targetCirclePos || excludePosition) && rect && (
        <>
          {targetCirclePos && (() => {
            const screenX = (targetCirclePos.x / videoW) * rect.width
            const screenY = (targetCirclePos.y / videoH) * rect.height
            const screenRadius = (targetCircleRadius / videoW) * rect.width
            return (
              <div className="absolute z-40 cursor-move" style={{ left: screenX - screenRadius, top: screenY - screenRadius, width: screenRadius * 2, height: screenRadius * 2 }} onMouseDown={(e) => { e.stopPropagation(); setIsDraggingMarker('circle') }}>
                <div className="absolute inset-0 rounded-full border-2 border-green-500 bg-green-500/20" />
                <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-green-600 text-white text-xs px-2 py-0.5 rounded whitespace-nowrap">Circle</div>
                <div className="absolute -right-1 -bottom-1 w-4 h-4 bg-green-500 rounded-full cursor-se-resize border-2 border-white" onMouseDown={(e) => { e.stopPropagation(); setIsDraggingMarker('circle-resize') }} />
                <button className="absolute -right-1 -top-1 w-4 h-4 bg-red-500 rounded-full text-white text-xs flex items-center justify-center hover:bg-red-400" onClick={(e) => { e.stopPropagation(); setTargetCirclePos(null); setCalibration(null, excludePosition) }}>x</button>
              </div>
            )
          })()}
          {excludePosition && (() => {
            const screenX = (excludePosition.x / videoW) * rect.width
            const screenY = (excludePosition.y / videoH) * rect.height
            const screenRadius = (excludeRadius / videoW) * rect.width
            return (
              <div className="absolute z-40 cursor-move" style={{ left: screenX - screenRadius, top: screenY - screenRadius, width: screenRadius * 2, height: screenRadius * 2 }} onMouseDown={(e) => { e.stopPropagation(); setIsDraggingMarker('menu') }}>
                <div className="absolute inset-0 rounded-full border-2 border-red-500 bg-red-500/20" />
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none"><div className="w-full h-0.5 bg-red-500 rotate-45" /><div className="absolute w-full h-0.5 bg-red-500 -rotate-45" /></div>
                <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-red-600 text-white text-xs px-2 py-0.5 rounded whitespace-nowrap">Exclude</div>
                <div className="absolute -right-1 -bottom-1 w-4 h-4 bg-red-500 rounded-full cursor-se-resize border-2 border-white" onMouseDown={(e) => { e.stopPropagation(); setIsDraggingMarker('menu-resize') }} />
                <button className="absolute -right-1 -top-1 w-4 h-4 bg-gray-600 rounded-full text-white text-xs flex items-center justify-center hover:bg-gray-500" onClick={(e) => { e.stopPropagation(); setExcludePosition(null); setCalibration(targetCirclePos, null) }}>x</button>
              </div>
            )
          })()}
        </>
      )}

      {/* Snap guides */}
      {snapGuides.v && <div className="absolute top-0 bottom-0 left-1/2 w-px bg-yellow-400 pointer-events-none z-20" />}
      {snapGuides.h && <div className="absolute left-0 right-0 top-1/2 h-px bg-yellow-400 pointer-events-none z-20" />}

      {/* Resize handles */}
      {editMode === 'resize' && <ResizeHandles videoTransform={videoTransform} onDragStart={handleDragStart} />}

      {/* Crop overlay */}
      {cropMode && <CropOverlay cropBounds={cropBounds} onDragStart={handleCropDragStart} />}

      {/* Tap drag overlay */}
      {selectedTapIndex !== null && tapEvents[selectedTapIndex] && !editMode && !cropMode && (
        <div className={`absolute inset-0 z-30 ${isDraggingTap ? 'cursor-grabbing' : 'cursor-grab'}`} onMouseDown={handleTapDragStart}>
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-white/50 text-xs bg-black/30 px-2 py-1 rounded flex items-center gap-2">
              <span>Drag to reposition</span>
              <button className="bg-white/20 hover:bg-white/40 px-2 py-0.5 rounded pointer-events-auto" onClick={(e) => { e.stopPropagation(); if (onSelectTap) onSelectTap(null) }}>Done</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
