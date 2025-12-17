import { useState, useCallback } from 'react'
import VideoUploader from './components/VideoUploader'
import VideoPreview from './components/VideoPreview'
import Timeline from './components/Timeline'
import ExportPanel from './components/ExportPanel'

function App() {
  const [videoFile, setVideoFile] = useState(null)
  const [videoUrl, setVideoUrl] = useState(null)
  const [tapEvents, setTapEvents] = useState([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [processingProgress, setProcessingProgress] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)

  const handleVideoUpload = useCallback((file) => {
    setVideoFile(file)
    setVideoUrl(URL.createObjectURL(file))
    setTapEvents([])
    setCurrentTime(0)
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

  return (
    <div className="min-h-screen p-6 md:p-10">
      {/* Header */}
      <header className="max-w-6xl mx-auto mb-10 animate-slide-up">
        <div className="glass-panel px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight">
                Mobile Videos
              </h1>
              <p className="text-mavs-silver mt-1 text-lg">
                Transform screen recordings into cinematic marketing content
              </p>
            </div>
            <div className="hidden md:flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-mavs-blue animate-pulse-glow" />
              <span className="text-mavs-silver text-sm">Ready</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto space-y-6">
        {!videoUrl ? (
          /* Upload State */
          <div className="animate-slide-up" style={{ animationDelay: '0.1s' }}>
            <VideoUploader onUpload={handleVideoUpload} />
          </div>
        ) : (
          /* Editor State */
          <>
            {/* Video Preview */}
            <div className="animate-slide-up" style={{ animationDelay: '0.1s' }}>
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
              />
            </div>

            {/* Timeline */}
            <div className="animate-slide-up" style={{ animationDelay: '0.2s' }}>
              <Timeline
                duration={duration}
                currentTime={currentTime}
                tapEvents={tapEvents}
                onSeek={handleSeek}
              />
            </div>

            {/* Export Panel */}
            <div className="animate-slide-up" style={{ animationDelay: '0.3s' }}>
              <ExportPanel
                videoFile={videoFile}
                videoUrl={videoUrl}
                tapEvents={tapEvents}
              />
            </div>

            {/* New Video Button */}
            <div className="flex justify-center pt-4">
              <button
                onClick={() => {
                  setVideoFile(null)
                  setVideoUrl(null)
                  setTapEvents([])
                }}
                className="glass-button text-mavs-silver hover:text-white"
              >
                ← Upload New Video
              </button>
            </div>
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="max-w-6xl mx-auto mt-16 text-center">
        <p className="text-mavs-silver/60 text-sm">
          Powered by OpenCV.js & FFmpeg.wasm — All processing happens locally in your browser
        </p>
      </footer>
    </div>
  )
}

export default App

