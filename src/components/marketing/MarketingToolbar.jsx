import { useMarketingState, MARKETING_SIZES } from '../../hooks'
import { BACKGROUNDS } from '../../lib/frameRenderer'

/**
 * MarketingToolbar - Controls for marketing image generation
 * Includes output size, canvas count, and add device/text buttons
 */
export function MarketingToolbar() {
  const { state, actions } = useMarketingState()
  const { project, canvases, selectedCanvasIndex } = state

  const currentCanvas = canvases[selectedCanvasIndex]
  const sizeConfig = MARKETING_SIZES[project.sizePreset]
  const dims = sizeConfig[project.orientation]

  return (
    <div className="glass-panel p-4">
      <div className="flex flex-wrap items-center gap-4">
        {/* Output Size */}
        <div className="flex items-center gap-2">
          <label className="text-sm text-mavs-silver">Size:</label>
          <select
            value={project.sizePreset}
            onChange={(e) => actions.setSizePreset(e.target.value)}
            className="glass-input text-sm px-3 py-1.5"
          >
            {Object.entries(MARKETING_SIZES).map(([key, config]) => (
              <option key={key} value={key}>{config.name}</option>
            ))}
          </select>
        </div>

        {/* Orientation */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => actions.setOrientation('portrait')}
            className={`px-3 py-1.5 rounded-lg text-sm transition-all ${
              project.orientation === 'portrait'
                ? 'bg-mavs-blue text-white'
                : 'text-mavs-silver hover:text-white hover:bg-white/10'
            }`}
            title="Portrait"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          </button>
          <button
            onClick={() => actions.setOrientation('landscape')}
            className={`px-3 py-1.5 rounded-lg text-sm transition-all ${
              project.orientation === 'landscape'
                ? 'bg-mavs-blue text-white'
                : 'text-mavs-silver hover:text-white hover:bg-white/10'
            }`}
            title="Landscape"
          >
            <svg className="w-4 h-4 rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          </button>
        </div>

        {/* Dimensions display */}
        <span className="text-xs text-mavs-silver/60">
          {dims.width} x {dims.height}px
        </span>

        <div className="w-px h-6 bg-white/10" />

        {/* Canvas Count */}
        <div className="flex items-center gap-2">
          <label className="text-sm text-mavs-silver">Screens:</label>
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map(count => (
              <button
                key={count}
                onClick={() => actions.setCanvasCount(count)}
                className={`w-8 h-8 rounded-lg text-sm font-medium transition-all ${
                  canvases.length === count
                    ? 'bg-mavs-blue text-white'
                    : 'text-mavs-silver hover:text-white hover:bg-white/10'
                }`}
              >
                {count}
              </button>
            ))}
          </div>
        </div>

        <div className="w-px h-6 bg-white/10" />

        {/* Background for selected canvas */}
        <div className="flex items-center gap-2">
          <label className="text-sm text-mavs-silver">Background:</label>
          <select
            value={currentCanvas?.background || 'ocean'}
            onChange={(e) => actions.updateCanvasBackground(selectedCanvasIndex, e.target.value)}
            className="glass-input text-sm px-3 py-1.5"
          >
            {Object.entries(BACKGROUNDS).map(([key, config]) => (
              <option key={key} value={key}>{config.name}</option>
            ))}
          </select>
        </div>

        <div className="flex-1" />

        {/* Add Device */}
        <button
          onClick={() => actions.addDevice()}
          className="glass-button px-4 py-2 text-sm flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
          Add Device
        </button>

        {/* Add Text */}
        <button
          onClick={() => actions.addText()}
          className="glass-button px-4 py-2 text-sm flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h8m-8 6h16" />
          </svg>
          Add Text
        </button>
      </div>
    </div>
  )
}

export default MarketingToolbar
