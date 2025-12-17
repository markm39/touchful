import { useState, useCallback } from 'react'
import { renderVideoWithMetadata, getExportExtension } from '../lib/videoRenderer'

/**
 * Export panel - exports video exactly as shown in preview
 */
function ExportPanel({ videoFile, previewSettings }) {
  const [isExporting, setIsExporting] = useState(false)
  const [exportProgress, setExportProgress] = useState(0)

  const handleExport = useCallback(async () => {
    if (!videoFile || !previewSettings) return

    setIsExporting(true)
    setExportProgress(0)

    try {
      console.log('[ExportPanel] Starting export...')
      const result = await renderVideoWithMetadata(
        videoFile,
        previewSettings,
        (progress) => setExportProgress(progress)
      )

      console.log('[ExportPanel] Export result:', result)

      // Validate result
      if (!result || !result.data) {
        throw new Error('Export returned empty result')
      }

      // Download the result with correct mime type and extension
      const { data, mimeType, extension } = result
      console.log('[ExportPanel] Data size:', data.length, 'bytes')
      console.log('[ExportPanel] MIME type:', mimeType)
      console.log('[ExportPanel] Extension:', extension)

      if (data.length === 0) {
        throw new Error('Exported video has 0 bytes')
      }

      const blob = new Blob([data], { type: mimeType })
      console.log('[ExportPanel] Blob size:', blob.size, 'bytes')

      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `video-${previewSettings.outputAspect.replace(':', 'x')}-${Date.now()}.${extension}`
      a.click()
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('[ExportPanel] Export failed:', error)
      alert(`Export failed: ${error.message}`)
    } finally {
      setIsExporting(false)
      setExportProgress(0)
    }
  }, [videoFile, previewSettings])

  const canExport = videoFile && previewSettings && previewSettings.tapEvents?.length > 0

  return (
    <div className="glass-panel p-6">
      <h3 className="text-white font-semibold text-xl mb-4">Export Video</h3>

      <div className="space-y-4">
        {/* Preview Summary */}
        <div className="glass-panel-light p-4 rounded-xl">
          <p className="text-mavs-silver text-sm mb-2">Export will match your preview settings:</p>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <span className="text-mavs-silver/60">Aspect Ratio:</span>
              <span className="text-white ml-2">{previewSettings?.outputAspect || '9:16'}</span>
            </div>
            <div>
              <span className="text-mavs-silver/60">Mode:</span>
              <span className="text-white ml-2">{previewSettings?.showDeviceFrame ? 'Device Frame' : 'Video Only'}</span>
            </div>
            <div>
              <span className="text-mavs-silver/60">Taps:</span>
              <span className="text-white ml-2">{previewSettings?.tapEvents?.length || 0}</span>
            </div>
            <div>
              <span className="text-mavs-silver/60">Zoom:</span>
              <span className="text-white ml-2">{previewSettings?.zoomLevel?.toFixed(1) || '1.4'}x</span>
            </div>
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
                Videos are rendered frame-by-frame to match preview exactly.
                Processing happens entirely in your browser.
              </p>
            </div>
          </div>
        </div>

        {/* Export Button */}
        <button
          onClick={handleExport}
          disabled={isExporting || !canExport}
          className="glass-button glass-button-accent w-full py-4 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isExporting ? (
            <span className="flex items-center justify-center gap-3">
              <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Exporting... {Math.round(exportProgress)}%
            </span>
          ) : (
            'Export Video'
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
        {!canExport && !isExporting && (
          <p className="text-yellow-400/80 text-sm text-center">
            {!previewSettings?.tapEvents?.length
              ? 'Please detect taps first before exporting.'
              : 'Please upload a video to export.'}
          </p>
        )}
      </div>
    </div>
  )
}

export default ExportPanel
