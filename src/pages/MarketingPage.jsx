import { MarketingProvider } from '../hooks'
import { MarketingToolbar, CanvasStrip } from '../components/marketing'
import { DeviceControls } from '../components/marketing/devices'
import { TextControls } from '../components/marketing/text'
import { MarketingExporter } from '../components/marketing/export'
import { MarketingWorkspace } from '../components/marketing/MarketingWorkspace'

/**
 * MarketingPage - App Store marketing image generator
 * Creates multi-canvas layouts with device frames and captions
 */
function MarketingPage() {
  return (
    <MarketingProvider>
      <MarketingPageContent />
    </MarketingProvider>
  )
}

/**
 * Inner content that has access to MarketingProvider context
 */
function MarketingPageContent() {
  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <MarketingToolbar />

      {/* Main workspace */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-4">
        {/* Canvas area - takes most space */}
        <div className="xl:col-span-3 space-y-4">
          {/* Large preview of selected canvas */}
          <MarketingWorkspace />

          {/* Canvas strip for navigation */}
          <CanvasStrip />
        </div>

        {/* Properties panel */}
        <div className="space-y-4">
          {/* Device or Text controls based on selection */}
          <DeviceControls />
          <TextControls />

          {/* Export panel */}
          <MarketingExporter />
        </div>
      </div>
    </div>
  )
}

export default MarketingPage
