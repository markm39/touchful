import { useState, useCallback, useRef, useMemo } from 'react'
import VideoUploader from '../components/VideoUploader'
import VideoPreview from '../components/VideoPreview'
import Timeline from '../components/Timeline'
import ExportPanel from '../components/ExportPanel'

/**
 * HomePage - Video editor workflow
 * Contains the original video processing functionality:
 * Upload -> Preview & Edit -> Export
 */
function HomePage() {
  const [videoFile, setVideoFile] = useState(null)
  const [videoUrl, setVideoUrl] = useState(null)
  const [tapEvents, setTapEvents] = useState([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [processingProgress, setProcessingProgress] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [selectedTapIndex, setSelectedTapIndex] = useState(null)

  // Preview settings - lifted from VideoPreview for export sharing
  const [outputAspect, setOutputAspect] = useState('9:16')
  const [showDeviceFrame, setShowDeviceFrame] = useState(true)
  const [zoomLevel, setZoomLevel] = useState(1.4)
  const [videoTransform, setVideoTransform] = useState({ scale: 1, x: 0, y: 0, stretch: false })
  const [appliedCrop, setAppliedCrop] = useState({ x: 0, y: 0, width: 100, height: 100 })
  const [selectedBackground, setSelectedBackground] = useState('ocean')
  const [selectedDevice, setSelectedDevice] = useState('match')
  const [showNotch, setShowNotch] = useState(true)

  // Ref to access video element for seeking
  const videoRef = useRef(null)

  const handleVideoUpload = useCallback((file) => {
    setVideoFile(file)
    setVideoUrl(URL.createObjectURL(file))
    setTapEvents([])
    setCurrentTime(0)
    setSelectedTapIndex(null)
    // Reset preview settings
    setVideoTransform({ scale: 1, x: 0, y: 0, stretch: false })
    setAppliedCrop({ x: 0, y: 0, width: 100, height: 100 })
  }, [])

  const handleTapEventsDetected = useCallback((events) => {
    setTapEvents(events)
  }, [])

  const handleTimeUpdate = useCallback((time) => {
    setCurrentTime(time)
  }, [])

  const handleDurationChange = useCallback((dur) => {
    setDuration(dur)
  }, [])

  const handleSeek = useCallback((time) => {
    setCurrentTime(time)
  }, [])

  const handleDeleteTap = useCallback((index) => {
    setTapEvents(prev => prev.filter((_, i) => i !== index))
    if (selectedTapIndex === index) {
      setSelectedTapIndex(null)
    }
  }, [selectedTapIndex])

  const handleSelectTap = useCallback((index) => {
    setSelectedTapIndex(index)
    // Jump to tap time
    if (tapEvents[index]) {
      setCurrentTime(tapEvents[index].time)
    }
  }, [tapEvents])

  const handleNewVideo = useCallback(() => {
    setVideoFile(null)
    setVideoUrl(null)
    setTapEvents([])
    setSelectedTapIndex(null)
  }, [])

  // Memoized preview settings for export
  const previewSettings = useMemo(() => ({
    tapEvents,
    outputAspect,
    showDeviceFrame,
    videoTransform,
    appliedCrop,
    zoomLevel,
    selectedBackground,
    selectedDevice,
    showNotch,
  }), [tapEvents, outputAspect, showDeviceFrame, videoTransform, appliedCrop, zoomLevel, selectedBackground, selectedDevice, showNotch])

  return (
    <>
      {!videoUrl ? (
        <VideoUploader onUpload={handleVideoUpload} />
      ) : (
        <div className="space-y-3">
          {/* New Video button for header */}
          <div className="flex justify-end">
            <button
              onClick={handleNewVideo}
              className="glass-button text-sm text-mavs-silver hover:text-white"
            >
              New Video
            </button>
          </div>

          {/* Video Preview */}
          <VideoPreview
            videoUrl={videoUrl}
            videoFile={videoFile}
            tapEvents={tapEvents}
            currentTime={currentTime}
            onTimeUpdate={handleTimeUpdate}
            onDurationChange={handleDurationChange}
            onTapEventsDetected={handleTapEventsDetected}
            isProcessing={isProcessing}
            processingProgress={processingProgress}
            setIsProcessing={setIsProcessing}
            setProcessingProgress={setProcessingProgress}
            selectedTapIndex={selectedTapIndex}
            onSelectTap={handleSelectTap}
            // Preview settings (lifted state)
            outputAspect={outputAspect}
            setOutputAspect={setOutputAspect}
            showDeviceFrame={showDeviceFrame}
            setShowDeviceFrame={setShowDeviceFrame}
            zoomLevel={zoomLevel}
            setZoomLevel={setZoomLevel}
            videoTransform={videoTransform}
            setVideoTransform={setVideoTransform}
            appliedCrop={appliedCrop}
            setAppliedCrop={setAppliedCrop}
            selectedBackground={selectedBackground}
            setSelectedBackground={setSelectedBackground}
            selectedDevice={selectedDevice}
            setSelectedDevice={setSelectedDevice}
            showNotch={showNotch}
            setShowNotch={setShowNotch}
          />

          {/* Timeline - right under preview with minimal gap */}
          <Timeline
            duration={duration}
            currentTime={currentTime}
            tapEvents={tapEvents}
            onSeek={handleSeek}
            onDeleteTap={handleDeleteTap}
            onSelectTap={handleSelectTap}
            selectedTapIndex={selectedTapIndex}
          />

          {/* Export Panel */}
          <ExportPanel
            videoFile={videoFile}
            previewSettings={previewSettings}
          />
        </div>
      )}
    </>
  )
}

export default HomePage
