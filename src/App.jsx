import { Routes, Route, NavLink } from 'react-router-dom'
import { HomePage, MarketingPage } from './pages'

/**
 * App - Root component with navigation and routing
 * Provides tabbed navigation between Video Editor and Marketing pages
 */
function App() {
  return (
    <div className="min-h-screen p-4 md:p-6">
      {/* Header with Navigation Tabs */}
      <header className="max-w-7xl mx-auto mb-4">
        <div className="glass-panel px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
                Mobile Videos
              </h1>
              <p className="text-mavs-silver text-sm">
                Transform screen recordings into cinematic content
              </p>
            </div>

            {/* Navigation Tabs */}
            <nav className="flex gap-1">
              <NavLink
                to="/"
                className={({ isActive }) =>
                  `px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-mavs-blue text-white'
                      : 'text-mavs-silver hover:text-white hover:bg-white/10'
                  }`
                }
              >
                Video Editor
              </NavLink>
              <NavLink
                to="/marketing"
                className={({ isActive }) =>
                  `px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-mavs-blue text-white'
                      : 'text-mavs-silver hover:text-white hover:bg-white/10'
                  }`
                }
              >
                Marketing
              </NavLink>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/marketing" element={<MarketingPage />} />
        </Routes>
      </main>

      {/* Footer */}
      <footer className="max-w-7xl mx-auto mt-8 text-center">
        <p className="text-mavs-silver/50 text-xs">
          Powered by OpenCV.js & FFmpeg.wasm — All processing happens locally
        </p>
      </footer>
    </div>
  )
}

export default App
