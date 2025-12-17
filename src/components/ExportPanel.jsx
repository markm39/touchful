import { useState, useCallback } from 'react'
import { renderVideo } from '../lib/videoRenderer'

function ExportPanel({ videoFile, videoUrl, tapEvents }) {
  const [selectedFormats, setSelectedFormats] = useState(['vertical'])
  const [isExporting, setIsExporting] = useState(false)
  const [exportProgress, setExportProgress] = useState(0)
  const [zoomLevel, setZoomLevel] = useState(1.5)

  const formats = [
    { id: 'vertical', label: '9:16', desc: 'TikTok, Reels, Shorts', width: 1080, height: 1920 },
    { id: 'square', label: '1:1', desc: 'Instagram Feed', width: 1080, height: 1080 },
    { id: 'horizontal', label: '16:9', desc: 'YouTube, Website', width: 1920, height: 1080 },
  ]

  const toggleFormat = useCallback((formatId) => {
    setSelectedFormats(prev => 
      prev.includes(formatId)
        ? prev.filter(f => f !== formatId)
        : [...prev, formatId]
    )
  }, [])

  const handleExport = useCallback(async () => {
    if (!videoFile || selectedFormats.length === 0) return

    setIsExporting(true)
    setExportProgress(0)

    try {
      for (let i = 0; i < selectedFormats.length; i++) {
        const formatId = selectedFormats[i]
        const format = formats.find(f => f.id === formatId)
        
        if (!format) continue

        const result = await renderVideo(
          videoFile,
          tapEvents,
          format,
          zoomLevel,
          (progress) => {
            const overallProgress = ((i + progress / 100) / selectedFormats.length) * 100
            setExportProgress(overallProgress)
          }
        )

        // Download the result
        const url = URL.createObjectURL(new Blob([result], { type: 'video/mp4' }))
        const a = document.createElement('a')
        a.href = url
        a.download = `video-${formatId}-${Date.now()}.mp4`
        a.click()
        URL.revokeObjectURL(url)
      }
    } catch (error) {
      console.error('Export failed:', error)
      alert('Export failed. Check console for details.')
    } finally {
      setIsExporting(false)
      setExportProgress(0)
    }
  }, [videoFile, selectedFormats, tapEvents, zoomLevel, formats])

  return (
    <div className="glass-panel p-6">
      <h3 className="text-white font-semibold text-xl mb-6">Export Video</h3>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Format Selection */}
        <div>
          <label className="text-mavs-silver text-sm mb-3 block">Select Aspect Ratios</label>
          <div className="grid gap-3">
            {formats.map((format) => (
              <button
                key={format.id}
                onClick={() => toggleFormat(format.id)}
                className={`glass-panel-light p-4 rounded-xl text-left transition-all ${
                  selectedFormats.includes(format.id)
                    ? 'ring-2 ring-mavs-blue bg-mavs-blue/20'
                    : 'hover:bg-mavs-blue/10'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-white font-semibold text-lg">{format.label}</span>
                    <span className="text-mavs-silver text-sm ml-3">{format.desc}</span>
                  </div>
                  <div className={`w-5 h-5 rounded-full border-2 transition-colors ${
                    selectedFormats.includes(format.id)
                      ? 'bg-mavs-blue border-mavs-blue'
                      : 'border-mavs-silver/50'
                  }`}>
                    {selectedFormats.includes(format.id) && (
                      <svg className="w-full h-full text-white p-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                </div>
                <div className="text-mavs-silver/60 text-xs mt-1">
                  {format.width} × {format.height}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Export Options */}
        <div className="space-y-6">
          {/* Zoom Level */}
          <div>
            <label className="text-mavs-silver text-sm mb-3 block">Export Zoom Level</label>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min="1"
                max="3"
                step="0.1"
                value={zoomLevel}
                onChange={(e) => setZoomLevel(parseFloat(e.target.value))}
                className="flex-1 accent-mavs-blue"
              />
              <span className="text-white w-12 text-right">{zoomLevel.toFixed(1)}x</span>
            </div>
          </div>

          {/* Info */}
          <div className="glass-panel-light p-4 rounded-xl">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-mavs-blue/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                <svg className="w-4 h-4 text-mavs-silver" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-mavs-silver text-sm">
                  Videos are processed entirely in your browser using FFmpeg.wasm. 
                  No data is uploaded to any server.
                </p>
              </div>
            </div>
          </div>

          {/* Export Button */}
          <button
            onClick={handleExport}
            disabled={isExporting || selectedFormats.length === 0 || tapEvents.length === 0}
            className="glass-button glass-button-accent w-full py-4 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isExporting ? (
              <span className="flex items-center justify-center gap-3">
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Exporting... {Math.round(exportProgress)}%
              </span>
            ) : (
              `Export ${selectedFormats.length} Video${selectedFormats.length !== 1 ? 's' : ''}`
            )}
          </button>

          {/* Progress Bar */}
          {isExporting && (
            <div className="w-full h-3 bg-mavs-navy/50 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-mavs-blue via-mavs-silver to-mavs-blue transition-all duration-300"
                style={{ width: `${exportProgress}%` }}
              />
            </div>
          )}

          {/* Requirements notice */}
          {tapEvents.length === 0 && (
            <p className="text-yellow-400/80 text-sm text-center">
              Please detect taps first before exporting.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

export default ExportPanel

