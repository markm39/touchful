import { useMarketingState } from '../../../hooks'

/**
 * Device type options
 */
const DEVICE_OPTIONS = [
  { value: 'iphone', label: 'iPhone' },
  { value: 'ipad', label: 'iPad' },
  { value: 'android', label: 'Android' },
]

/**
 * DeviceControls - Settings panel for selected device
 * Appears when a device is selected
 */
export function DeviceControls() {
  const { state, actions } = useMarketingState()
  const { devices, selectedDeviceId } = state

  const selectedDevice = devices.find(d => d.id === selectedDeviceId)

  if (!selectedDevice) {
    return null
  }

  return (
    <div className="glass-panel p-4 space-y-4">
      <h3 className="text-sm font-medium text-white">Device Settings</h3>

      {/* Device Type */}
      <div className="space-y-2">
        <label className="text-xs text-mavs-silver">Device Type</label>
        <select
          value={selectedDevice.type}
          onChange={(e) => actions.updateDevice(selectedDevice.id, { type: e.target.value })}
          className="glass-input w-full text-sm px-3 py-2"
        >
          {DEVICE_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      {/* Show Notch */}
      <div className="flex items-center justify-between">
        <label className="text-xs text-mavs-silver">Show Notch</label>
        <button
          onClick={() => actions.updateDevice(selectedDevice.id, { showNotch: !selectedDevice.showNotch })}
          className={`w-10 h-6 rounded-full transition-colors ${
            selectedDevice.showNotch ? 'bg-mavs-blue' : 'bg-gray-600'
          }`}
        >
          <div
            className={`w-4 h-4 bg-white rounded-full transition-transform ${
              selectedDevice.showNotch ? 'translate-x-5' : 'translate-x-1'
            }`}
          />
        </button>
      </div>

      {/* Rotation */}
      <div className="space-y-2">
        <label className="text-xs text-mavs-silver">Rotation: {selectedDevice.rotation}deg</label>
        <input
          type="range"
          min="-45"
          max="45"
          value={selectedDevice.rotation}
          onChange={(e) => actions.updateDevice(selectedDevice.id, { rotation: parseInt(e.target.value) })}
          className="w-full"
        />
        <div className="flex gap-2">
          {[-15, 0, 15].map(angle => (
            <button
              key={angle}
              onClick={() => actions.updateDevice(selectedDevice.id, { rotation: angle })}
              className={`flex-1 py-1 rounded text-xs ${
                selectedDevice.rotation === angle
                  ? 'bg-mavs-blue text-white'
                  : 'bg-white/10 text-mavs-silver hover:bg-white/20'
              }`}
            >
              {angle}
            </button>
          ))}
        </div>
      </div>

      {/* Screenshot */}
      <div className="space-y-2">
        <label className="text-xs text-mavs-silver">Screenshot</label>
        {selectedDevice.screenshot ? (
          <div className="relative">
            <img
              src={selectedDevice.screenshot}
              alt="Current screenshot"
              className="w-full h-20 object-cover rounded"
            />
            <button
              onClick={() => actions.updateDevice(selectedDevice.id, { screenshot: null })}
              className="absolute top-1 right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white text-xs"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ) : (
          <label className="block w-full py-3 border-2 border-dashed border-gray-600 rounded text-center text-xs text-mavs-silver cursor-pointer hover:border-mavs-blue">
            Click to upload
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files[0]
                if (file) {
                  const url = URL.createObjectURL(file)
                  actions.updateDevice(selectedDevice.id, { screenshot: url })
                }
              }}
            />
          </label>
        )}
      </div>

      {/* Delete Device */}
      <button
        onClick={() => actions.removeDevice(selectedDevice.id)}
        className="w-full py-2 bg-red-500/20 text-red-400 rounded hover:bg-red-500/30 text-sm"
      >
        Delete Device
      </button>
    </div>
  )
}

export default DeviceControls
