# Pages

This directory contains the top-level page components for the application.

## Structure

- `HomePage.jsx` - The video editor workflow (upload, preview, timeline, export)
- `MarketingPage.jsx` - App Store marketing image generator
- `index.js` - Barrel export for clean imports

## Routing

Pages are rendered via React Router in `App.jsx`:

- `/` - HomePage (Video Editor)
- `/marketing` - MarketingPage (Marketing Images)

## Adding New Pages

1. Create a new page component in this directory
2. Export it from `index.js`
3. Add a Route in `App.jsx`
4. Add navigation link in the header tabs
