import { useState, useCallback } from 'react'
import JSZip from 'jszip'
import { useMarketingState, MARKETING_SIZES } from '../../../hooks'
import { renderMarketingCanvasAtSize, downloadBlob } from '../../../lib/marketingRenderer'

/**
 * MarketingExporter - Export panel for marketing images
 * Supports single canvas, batch export, and multi-size export with zip
 */
export function MarketingExporter() {
  const { state } = useMarketingState()
  const { project, canvases, selectedCanvasIndex } = state

  const [isExporting, setIsExporting] = useState(false)
  const [progress, setProgress] = useState({ current: 0, total: 0, status: '' })
  const [filenamePrefix, setFilenamePrefix] = useState('appstore')
  const [selectedSizes, setSelectedSizes] = useState([project.sizePreset])

  const sizeConfig = MARKETING_SIZES[project.sizePreset]
  const dims = sizeConfig[project.orientation]

  // Toggle a size in the selection
  const toggleSize = useCallback((sizeKey) => {
    setSelectedSizes(prev => {
      if (prev.includes(sizeKey)) {
        // Don't allow deselecting the last one
        if (prev.length === 1) return prev
        return prev.filter(k => k !== sizeKey)
      }
      return [...prev, sizeKey]
    })
  }, [])

  // Select all sizes
  const selectAllSizes = useCallback(() => {
    setSelectedSizes(Object.keys(MARKETING_SIZES))
  }, [])

  // Export single canvas at current size
  const handleExportCurrent = useCallback(async () => {
    setIsExporting(true)
    try {
      const blob = await renderMarketingCanvasAtSize(state, selectedCanvasIndex, project.sizePreset, project.orientation)
      const filename = `${filenamePrefix}_${selectedCanvasIndex + 1}_${dims.width}x${dims.height}.png`
      downloadBlob(blob, filename)
    } catch (error) {
      console.error('Export failed:', error)
    } finally {
      setIsExporting(false)
    }
  }, [state, selectedCanvasIndex, filenamePrefix, dims, project.sizePreset, project.orientation])

  // Export all canvases for selected sizes as a zip
  const handleExportSelectedSizes = useCallback(async () => {
    setIsExporting(true)
    const zip = new JSZip()

    const totalOperations = selectedSizes.length * canvases.length * 2 // portrait + landscape
    let completed = 0

    try {
      for (const sizeKey of selectedSizes) {
        const sizeConfig = MARKETING_SIZES[sizeKey]

        // Export both orientations
        for (const orientation of ['portrait', 'landscape']) {
          const dims = sizeConfig[orientation]
          const folderName = `${sizeConfig.name.replace(/[^a-zA-Z0-9]/g, '_')}_${orientation}`
          const folder = zip.folder(folderName)

          for (let i = 0; i < canvases.length; i++) {
            setProgress({
              current: completed,
              total: totalOperations,
              status: `${sizeConfig.name} ${orientation} - Canvas ${i + 1}`
            })

            const blob = await renderMarketingCanvasAtSize(state, i, sizeKey, orientation)
            const filename = `${filenamePrefix}_${i + 1}_${dims.width}x${dims.height}.png`
            folder.file(filename, blob)

            completed++
          }
        }
      }

      setProgress({ current: totalOperations, total: totalOperations, status: 'Creating zip...' })

      // Generate and download zip
      const zipBlob = await zip.generateAsync({ type: 'blob' })
      downloadBlob(zipBlob, `${filenamePrefix}_marketing_images.zip`)

    } catch (error) {
      console.error('Export failed:', error)
    } finally {
      setIsExporting(false)
      setProgress({ current: 0, total: 0, status: '' })
    }
  }, [state, canvases.length, selectedSizes, filenamePrefix])

  // Export all canvases for ALL sizes (every device) as a zip
  const allSizeKeys = Object.keys(MARKETING_SIZES)
  const handleExportAllSizes = useCallback(async () => {
    setIsExporting(true)
    const zip = new JSZip()

    const totalOperations = allSizeKeys.length * canvases.length * 2 // portrait + landscape
    let completed = 0

    try {
      for (const sizeKey of allSizeKeys) {
        const sizeConfig = MARKETING_SIZES[sizeKey]

        // Export both orientations
        for (const orientation of ['portrait', 'landscape']) {
          const dims = sizeConfig[orientation]
          const folderName = `${sizeConfig.name.replace(/[^a-zA-Z0-9]/g, '_')}_${orientation}`
          const folder = zip.folder(folderName)

          for (let i = 0; i < canvases.length; i++) {
            setProgress({
              current: completed,
              total: totalOperations,
              status: `${sizeConfig.name} ${orientation} - Canvas ${i + 1}`
            })

            const blob = await renderMarketingCanvasAtSize(state, i, sizeKey, orientation)
            const filename = `${filenamePrefix}_${i + 1}_${dims.width}x${dims.height}.png`
            folder.file(filename, blob)

            completed++
          }
        }
      }

      setProgress({ current: totalOperations, total: totalOperations, status: 'Creating zip...' })

      // Generate and download zip
      const zipBlob = await zip.generateAsync({ type: 'blob' })
      downloadBlob(zipBlob, `${filenamePrefix}_all_devices.zip`)

    } catch (error) {
      console.error('Export failed:', error)
    } finally {
      setIsExporting(false)
      setProgress({ current: 0, total: 0, status: '' })
    }
  }, [state, canvases.length, allSizeKeys, filenamePrefix])

  // Export current size only (all canvases)
  const handleExportCurrentSize = useCallback(async () => {
    setIsExporting(true)
    const zip = new JSZip()

    const totalOperations = canvases.length

    try {
      const sizeConfig = MARKETING_SIZES[project.sizePreset]
      const dims = sizeConfig[project.orientation]

      for (let i = 0; i < canvases.length; i++) {
        setProgress({
          current: i,
          total: totalOperations,
          status: `Canvas ${i + 1}`
        })

        const blob = await renderMarketingCanvasAtSize(state, i, project.sizePreset, project.orientation)
        const filename = `${filenamePrefix}_${i + 1}_${dims.width}x${dims.height}.png`
        zip.file(filename, blob)
      }

      setProgress({ current: totalOperations, total: totalOperations, status: 'Creating zip...' })

      const zipBlob = await zip.generateAsync({ type: 'blob' })
      downloadBlob(zipBlob, `${filenamePrefix}_${sizeConfig.name.replace(/[^a-zA-Z0-9]/g, '_')}.zip`)

    } catch (error) {
      console.error('Export failed:', error)
    } finally {
      setIsExporting(false)
      setProgress({ current: 0, total: 0, status: '' })
    }
  }, [state, canvases.length, filenamePrefix, project.sizePreset, project.orientation])

  return (
    <div className="glass-panel p-4 space-y-4">
      <h3 className="text-sm font-medium text-white">Export Images</h3>

      {/* Current size info */}
      <div className="glass-panel-light p-3 rounded-lg">
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="text-mavs-silver">Current Size:</div>
          <div className="text-white">{sizeConfig.name}</div>
          <div className="text-mavs-silver">Dimensions:</div>
          <div className="text-white">{dims.width} x {dims.height}px</div>
          <div className="text-mavs-silver">Canvases:</div>
          <div className="text-white">{canvases.length}</div>
        </div>
      </div>

      {/* Size selection for multi-export */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs text-mavs-silver">Export Sizes</label>
          <button
            onClick={selectAllSizes}
            className="text-xs text-mavs-blue hover:text-white"
          >
            Select All
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {Object.entries(MARKETING_SIZES).map(([key, config]) => (
            <label
              key={key}
              className={`flex items-center gap-2 p-2 rounded cursor-pointer transition-colors ${
                selectedSizes.includes(key)
                  ? 'bg-mavs-blue/20 border border-mavs-blue'
                  : 'bg-white/5 border border-transparent hover:bg-white/10'
              }`}
            >
              <input
                type="checkbox"
                checked={selectedSizes.includes(key)}
                onChange={() => toggleSize(key)}
                className="w-4 h-4 rounded"
              />
              <div>
                <div className="text-xs text-white">{config.name}</div>
                <div className="text-xs text-mavs-silver/60">
                  {config.portrait.width}x{config.portrait.height}
                </div>
              </div>
            </label>
          ))}
        </div>
        <p className="text-xs text-mavs-silver/60">
          Multi-size export includes both portrait and landscape orientations
        </p>
      </div>

      {/* Filename prefix */}
      <div className="space-y-2">
        <label className="text-xs text-mavs-silver">Filename Prefix</label>
        <input
          type="text"
          value={filenamePrefix}
          onChange={(e) => setFilenamePrefix(e.target.value)}
          placeholder="appstore"
          className="glass-input w-full text-sm px-3 py-2"
        />
      </div>

      {/* Progress bar */}
      {isExporting && progress.total > 0 && (
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-mavs-silver">
            <span>{progress.status || 'Exporting...'}</span>
            <span>{progress.current} / {progress.total}</span>
          </div>
          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-mavs-blue transition-all"
              style={{ width: `${(progress.current / progress.total) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Export buttons */}
      <div className="space-y-2">
        <button
          onClick={handleExportCurrent}
          disabled={isExporting}
          className="w-full glass-button py-2.5 text-sm disabled:opacity-50"
        >
          {isExporting ? 'Exporting...' : `Export Canvas ${selectedCanvasIndex + 1} (PNG)`}
        </button>

        <button
          onClick={handleExportCurrentSize}
          disabled={isExporting}
          className="w-full glass-button py-2.5 text-sm disabled:opacity-50"
        >
          {isExporting ? 'Exporting...' : `Export All Canvases - ${sizeConfig.name} (ZIP)`}
        </button>

        {selectedSizes.length > 0 && selectedSizes.length < allSizeKeys.length && (
          <button
            onClick={handleExportSelectedSizes}
            disabled={isExporting}
            className="w-full glass-button py-2.5 text-sm disabled:opacity-50"
          >
            {isExporting ? 'Exporting...' : `Export Selected (${selectedSizes.length} sizes, ZIP)`}
          </button>
        )}

        <button
          onClick={handleExportAllSizes}
          disabled={isExporting}
          className="w-full glass-button-accent py-2.5 text-sm disabled:opacity-50"
        >
          {isExporting ? 'Exporting...' : `Export All Devices (${allSizeKeys.length} sizes, ZIP)`}
        </button>
      </div>

      {/* Export info */}
      <p className="text-xs text-mavs-silver/60 text-center">
        ZIP exports organize images into folders by size
      </p>
    </div>
  )
}

export default MarketingExporter
