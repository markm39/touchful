import { useMarketingState, SYSTEM_FONTS } from '../../../hooks'

/**
 * TextControls - Settings panel for selected text layer
 * Includes font, size, color, and alignment options
 */
export function TextControls() {
  const { state, actions } = useMarketingState()
  const { textLayers, selectedTextId } = state

  const selectedText = textLayers.find(t => t.id === selectedTextId)

  if (!selectedText) {
    return null
  }

  return (
    <div className="glass-panel p-4 space-y-4">
      <h3 className="text-sm font-medium text-white">Text Settings</h3>

      {/* Text Content */}
      <div className="space-y-2">
        <label className="text-xs text-mavs-silver">Content</label>
        <input
          type="text"
          value={selectedText.content}
          onChange={(e) => actions.updateText(selectedText.id, { content: e.target.value })}
          className="glass-input w-full text-sm px-3 py-2"
        />
      </div>

      {/* Font Family */}
      <div className="space-y-2">
        <label className="text-xs text-mavs-silver">Font</label>
        <select
          value={selectedText.fontFamily}
          onChange={(e) => actions.updateText(selectedText.id, { fontFamily: e.target.value })}
          className="glass-input w-full text-sm px-3 py-2"
        >
          {SYSTEM_FONTS.map(font => (
            <option key={font.name} value={font.value}>{font.name}</option>
          ))}
        </select>
      </div>

      {/* Font Size */}
      <div className="space-y-2">
        <label className="text-xs text-mavs-silver">Size: {selectedText.fontSize}px</label>
        <input
          type="range"
          min="12"
          max="120"
          value={selectedText.fontSize}
          onChange={(e) => actions.updateText(selectedText.id, { fontSize: parseInt(e.target.value) })}
          className="w-full"
        />
        <div className="flex gap-2">
          {[24, 36, 48, 72].map(size => (
            <button
              key={size}
              onClick={() => actions.updateText(selectedText.id, { fontSize: size })}
              className={`flex-1 py-1 rounded text-xs ${
                selectedText.fontSize === size
                  ? 'bg-mavs-blue text-white'
                  : 'bg-white/10 text-mavs-silver hover:bg-white/20'
              }`}
            >
              {size}
            </button>
          ))}
        </div>
      </div>

      {/* Font Weight */}
      <div className="space-y-2">
        <label className="text-xs text-mavs-silver">Weight</label>
        <div className="flex gap-2">
          {[
            { value: '400', label: 'Regular' },
            { value: '600', label: 'Semi' },
            { value: '700', label: 'Bold' },
          ].map(weight => (
            <button
              key={weight.value}
              onClick={() => actions.updateText(selectedText.id, { fontWeight: weight.value })}
              className={`flex-1 py-1.5 rounded text-xs ${
                selectedText.fontWeight === weight.value
                  ? 'bg-mavs-blue text-white'
                  : 'bg-white/10 text-mavs-silver hover:bg-white/20'
              }`}
            >
              {weight.label}
            </button>
          ))}
        </div>
      </div>

      {/* Text Color */}
      <div className="space-y-2">
        <label className="text-xs text-mavs-silver">Color</label>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={selectedText.color}
            onChange={(e) => actions.updateText(selectedText.id, { color: e.target.value })}
            className="w-10 h-10 rounded cursor-pointer"
          />
          <input
            type="text"
            value={selectedText.color}
            onChange={(e) => actions.updateText(selectedText.id, { color: e.target.value })}
            className="glass-input flex-1 text-sm px-3 py-2 font-mono"
          />
        </div>
        {/* Quick color presets */}
        <div className="flex gap-2">
          {['#FFFFFF', '#000000', '#00538C', '#F59E0B', '#EF4444'].map(color => (
            <button
              key={color}
              onClick={() => actions.updateText(selectedText.id, { color })}
              className={`w-6 h-6 rounded-full border-2 ${
                selectedText.color === color ? 'border-mavs-blue' : 'border-transparent'
              }`}
              style={{ backgroundColor: color }}
            />
          ))}
        </div>
      </div>

      {/* Text Alignment */}
      <div className="space-y-2">
        <label className="text-xs text-mavs-silver">Alignment</label>
        <div className="flex gap-2">
          {[
            { value: 'left', icon: 'M4 6h16M4 12h8m-8 6h16' },
            { value: 'center', icon: 'M4 6h16M4 12h16M4 18h16' },
            { value: 'right', icon: 'M4 6h16M12 12h8M4 18h16' },
          ].map(align => (
            <button
              key={align.value}
              onClick={() => actions.updateText(selectedText.id, { textAlign: align.value })}
              className={`flex-1 py-2 rounded flex items-center justify-center ${
                selectedText.textAlign === align.value
                  ? 'bg-mavs-blue text-white'
                  : 'bg-white/10 text-mavs-silver hover:bg-white/20'
              }`}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={align.icon} />
              </svg>
            </button>
          ))}
        </div>
      </div>

      {/* Delete Text */}
      <button
        onClick={() => actions.removeText(selectedText.id)}
        className="w-full py-2 bg-red-500/20 text-red-400 rounded hover:bg-red-500/30 text-sm"
      >
        Delete Text
      </button>
    </div>
  )
}

export default TextControls
