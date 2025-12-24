import { createContext, useContext, useReducer, useCallback } from 'react'

/**
 * App Store marketing image size presets
 * All dimensions are in pixels, supporting portrait and landscape
 */
export const MARKETING_SIZES = {
  'iphone-6.5': {
    name: 'iPhone 6.5"',
    portrait: { width: 1242, height: 2688 },
    landscape: { width: 2688, height: 1242 },
  },
  'iphone-6.7': {
    name: 'iPhone 6.7"',
    portrait: { width: 1290, height: 2796 },
    landscape: { width: 2796, height: 1290 },
  },
  'iphone-6.9': {
    name: 'iPhone 6.9"',
    portrait: { width: 1320, height: 2868 },
    landscape: { width: 2868, height: 1320 },
  },
  'ipad-12.9': {
    name: 'iPad 12.9"',
    portrait: { width: 2048, height: 2732 },
    landscape: { width: 2732, height: 2048 },
  },
  'iphone-5.5': {
    name: 'iPhone 5.5"',
    portrait: { width: 1242, height: 2208 },
    landscape: { width: 2208, height: 1242 },
  },
}

/**
 * System fonts available for text layers
 */
export const SYSTEM_FONTS = [
  { name: 'System Default', value: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' },
  { name: 'San Francisco', value: '-apple-system, BlinkMacSystemFont, sans-serif' },
  { name: 'Helvetica', value: 'Helvetica Neue, Helvetica, Arial, sans-serif' },
  { name: 'Arial', value: 'Arial, sans-serif' },
  { name: 'Georgia', value: 'Georgia, serif' },
  { name: 'Times', value: 'Times New Roman, Times, serif' },
]

// Generate unique IDs
const generateId = () => crypto.randomUUID()

/**
 * Create initial state for marketing page
 */
function createInitialState() {
  return {
    // Project settings
    project: {
      sizePreset: 'iphone-6.7',
      orientation: 'portrait',
    },

    // Canvases (1-5)
    canvases: [
      { id: generateId(), index: 0, background: 'ocean' },
    ],

    // Devices with world coordinates (can span canvases)
    devices: [],

    // Text layers per canvas
    textLayers: [],

    // Selection state
    selectedDeviceId: null,
    selectedTextId: null,
    selectedCanvasIndex: 0,

    // View state
    zoom: 1,
  }
}

/**
 * Action types for marketing state
 */
const ActionTypes = {
  // Project
  SET_SIZE_PRESET: 'SET_SIZE_PRESET',
  SET_ORIENTATION: 'SET_ORIENTATION',

  // Canvases
  SET_CANVAS_COUNT: 'SET_CANVAS_COUNT',
  UPDATE_CANVAS_BACKGROUND: 'UPDATE_CANVAS_BACKGROUND',

  // Devices
  ADD_DEVICE: 'ADD_DEVICE',
  UPDATE_DEVICE: 'UPDATE_DEVICE',
  REMOVE_DEVICE: 'REMOVE_DEVICE',
  SELECT_DEVICE: 'SELECT_DEVICE',

  // Text
  ADD_TEXT: 'ADD_TEXT',
  UPDATE_TEXT: 'UPDATE_TEXT',
  REMOVE_TEXT: 'REMOVE_TEXT',
  SELECT_TEXT: 'SELECT_TEXT',

  // Selection
  SELECT_CANVAS: 'SELECT_CANVAS',
  CLEAR_SELECTION: 'CLEAR_SELECTION',

  // View
  SET_ZOOM: 'SET_ZOOM',
}

/**
 * Reducer for marketing state
 */
function marketingReducer(state, action) {
  switch (action.type) {
    // Project settings
    case ActionTypes.SET_SIZE_PRESET:
      return { ...state, project: { ...state.project, sizePreset: action.payload } }

    case ActionTypes.SET_ORIENTATION:
      return { ...state, project: { ...state.project, orientation: action.payload } }

    // Canvas management
    case ActionTypes.SET_CANVAS_COUNT: {
      const count = Math.max(1, Math.min(5, action.payload))
      const currentCount = state.canvases.length

      if (count === currentCount) return state

      let newCanvases
      if (count > currentCount) {
        // Add new canvases
        const toAdd = count - currentCount
        const newOnes = Array.from({ length: toAdd }, (_, i) => ({
          id: generateId(),
          index: currentCount + i,
          background: 'ocean',
        }))
        newCanvases = [...state.canvases, ...newOnes]
      } else {
        // Remove canvases from end
        newCanvases = state.canvases.slice(0, count)
      }

      // Re-index canvases
      newCanvases = newCanvases.map((c, i) => ({ ...c, index: i }))

      // Remove devices and text that are now out of bounds
      const maxWorldX = count * getCanvasWidth(state)
      const devices = state.devices.filter(d => d.worldX < maxWorldX)
      const textLayers = state.textLayers.filter(t => t.canvasIndex < count)

      return {
        ...state,
        canvases: newCanvases,
        devices,
        textLayers,
        selectedCanvasIndex: Math.min(state.selectedCanvasIndex, count - 1),
      }
    }

    case ActionTypes.UPDATE_CANVAS_BACKGROUND:
      return {
        ...state,
        canvases: state.canvases.map(c =>
          c.index === action.payload.index
            ? { ...c, background: action.payload.background }
            : c
        ),
      }

    // Device management
    case ActionTypes.ADD_DEVICE: {
      const sizeConfig = MARKETING_SIZES[state.project.sizePreset]
      const dims = sizeConfig[state.project.orientation]
      const canvasWidth = dims.width

      // Position new device in center of selected canvas
      const newDevice = {
        id: generateId(),
        type: 'iphone',
        screenshot: null,
        worldX: state.selectedCanvasIndex * canvasWidth + canvasWidth * 0.2,
        worldY: dims.height * 0.1,
        width: canvasWidth * 0.6,
        height: dims.height * 0.8,
        rotation: 0,
        showNotch: true,
        zIndex: state.devices.length,
        ...action.payload,
      }
      return {
        ...state,
        devices: [...state.devices, newDevice],
        selectedDeviceId: newDevice.id,
        selectedTextId: null,
      }
    }

    case ActionTypes.UPDATE_DEVICE:
      return {
        ...state,
        devices: state.devices.map(d =>
          d.id === action.payload.id ? { ...d, ...action.payload.updates } : d
        ),
      }

    case ActionTypes.REMOVE_DEVICE:
      return {
        ...state,
        devices: state.devices.filter(d => d.id !== action.payload),
        selectedDeviceId: state.selectedDeviceId === action.payload ? null : state.selectedDeviceId,
      }

    case ActionTypes.SELECT_DEVICE:
      return {
        ...state,
        selectedDeviceId: action.payload,
        selectedTextId: null,
      }

    // Text management
    case ActionTypes.ADD_TEXT: {
      const newText = {
        id: generateId(),
        canvasIndex: state.selectedCanvasIndex,
        content: 'Your caption here',
        x: 50, // percentage from left
        y: 10, // percentage from top
        fontSize: 48,
        fontFamily: SYSTEM_FONTS[0].value,
        fontWeight: '600',
        color: '#FFFFFF',
        textAlign: 'center',
        rotation: 0,
        ...action.payload,
      }
      return {
        ...state,
        textLayers: [...state.textLayers, newText],
        selectedTextId: newText.id,
        selectedDeviceId: null,
      }
    }

    case ActionTypes.UPDATE_TEXT:
      return {
        ...state,
        textLayers: state.textLayers.map(t =>
          t.id === action.payload.id ? { ...t, ...action.payload.updates } : t
        ),
      }

    case ActionTypes.REMOVE_TEXT:
      return {
        ...state,
        textLayers: state.textLayers.filter(t => t.id !== action.payload),
        selectedTextId: state.selectedTextId === action.payload ? null : state.selectedTextId,
      }

    case ActionTypes.SELECT_TEXT:
      return {
        ...state,
        selectedTextId: action.payload,
        selectedDeviceId: null,
      }

    // Selection
    case ActionTypes.SELECT_CANVAS:
      return { ...state, selectedCanvasIndex: action.payload }

    case ActionTypes.CLEAR_SELECTION:
      return { ...state, selectedDeviceId: null, selectedTextId: null }

    // View
    case ActionTypes.SET_ZOOM:
      return { ...state, zoom: action.payload }

    default:
      return state
  }
}

/**
 * Helper to get canvas width from state
 */
function getCanvasWidth(state) {
  const sizeConfig = MARKETING_SIZES[state.project.sizePreset]
  return sizeConfig[state.project.orientation].width
}

/**
 * Context for marketing state
 */
const MarketingContext = createContext(null)

/**
 * Provider component for marketing state
 */
export function MarketingProvider({ children }) {
  const [state, dispatch] = useReducer(marketingReducer, null, createInitialState)

  // Action creators
  const actions = {
    setSizePreset: useCallback((preset) => {
      dispatch({ type: ActionTypes.SET_SIZE_PRESET, payload: preset })
    }, []),

    setOrientation: useCallback((orientation) => {
      dispatch({ type: ActionTypes.SET_ORIENTATION, payload: orientation })
    }, []),

    setCanvasCount: useCallback((count) => {
      dispatch({ type: ActionTypes.SET_CANVAS_COUNT, payload: count })
    }, []),

    updateCanvasBackground: useCallback((index, background) => {
      dispatch({ type: ActionTypes.UPDATE_CANVAS_BACKGROUND, payload: { index, background } })
    }, []),

    addDevice: useCallback((overrides = {}) => {
      dispatch({ type: ActionTypes.ADD_DEVICE, payload: overrides })
    }, []),

    updateDevice: useCallback((id, updates) => {
      dispatch({ type: ActionTypes.UPDATE_DEVICE, payload: { id, updates } })
    }, []),

    removeDevice: useCallback((id) => {
      dispatch({ type: ActionTypes.REMOVE_DEVICE, payload: id })
    }, []),

    selectDevice: useCallback((id) => {
      dispatch({ type: ActionTypes.SELECT_DEVICE, payload: id })
    }, []),

    addText: useCallback((overrides = {}) => {
      dispatch({ type: ActionTypes.ADD_TEXT, payload: overrides })
    }, []),

    updateText: useCallback((id, updates) => {
      dispatch({ type: ActionTypes.UPDATE_TEXT, payload: { id, updates } })
    }, []),

    removeText: useCallback((id) => {
      dispatch({ type: ActionTypes.REMOVE_TEXT, payload: id })
    }, []),

    selectText: useCallback((id) => {
      dispatch({ type: ActionTypes.SELECT_TEXT, payload: id })
    }, []),

    selectCanvas: useCallback((index) => {
      dispatch({ type: ActionTypes.SELECT_CANVAS, payload: index })
    }, []),

    clearSelection: useCallback(() => {
      dispatch({ type: ActionTypes.CLEAR_SELECTION })
    }, []),

    setZoom: useCallback((zoom) => {
      dispatch({ type: ActionTypes.SET_ZOOM, payload: zoom })
    }, []),
  }

  return (
    <MarketingContext.Provider value={{ state, actions }}>
      {children}
    </MarketingContext.Provider>
  )
}

/**
 * Hook to access marketing state and actions
 */
export function useMarketingState() {
  const context = useContext(MarketingContext)
  if (!context) {
    throw new Error('useMarketingState must be used within a MarketingProvider')
  }
  return context
}

/**
 * Hook to get current canvas dimensions
 */
export function useCanvasDimensions() {
  const { state } = useMarketingState()
  const sizeConfig = MARKETING_SIZES[state.project.sizePreset]
  return sizeConfig[state.project.orientation]
}

/**
 * Get devices that overlap a specific canvas
 * @param {Array} devices - All devices
 * @param {number} canvasIndex - Canvas index to check
 * @param {number} canvasWidth - Width of each canvas
 * @returns {Array} Devices with their clip bounds for this canvas
 */
export function getDevicesForCanvas(devices, canvasIndex, canvasWidth) {
  const canvasLeft = canvasIndex * canvasWidth
  const canvasRight = (canvasIndex + 1) * canvasWidth

  return devices
    .filter(device => {
      const deviceRight = device.worldX + device.width
      return deviceRight > canvasLeft && device.worldX < canvasRight
    })
    .map(device => ({
      ...device,
      // Position relative to this canvas
      relativeX: device.worldX - canvasLeft,
      // Clip bounds within this canvas
      clipLeft: Math.max(0, canvasLeft - device.worldX),
      clipRight: Math.min(device.width, canvasRight - device.worldX),
    }))
}
