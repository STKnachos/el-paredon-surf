# 🏄 El Paredón Surf Forecast

Personal surf and weather dashboard for El Paredón, Guatemala. Built as a lightweight Progressive Web App (PWA) with vanilla JavaScript, no frameworks, and no API keys.


## Live Site
Visit the deployed app at:  
https://elparedonsurf.com/

I made this for local beach patrol to have quick access to pertinent weather and ocean info:  
https://elparedonsurf.com/guard

## Pages

### Main Dashboard (`/`)
Consumer-facing surf forecast with current conditions, hourly outlook, and smart visual indicators.

### Guard Report (`/guard`)
Daily snapshot for beach patrol and ocean rescue teams, but accessible for all. Features dual-unit display (metric + imperial simultaneously), expanded weather metrics, 5-day forecast, daily period breakdown, weather event log, and editable marine hazard level.

## Features

### Surf Conditions
- Wave height, direction, and swell period
- Wind speed and direction with onshore/offshore indicator
- Water temperature from marine API
- Air temperature
- Data freshness indicator (green/yellow/red)
- **Metric/Imperial unit toggle** on main dashboard (meters/feet, km/h/mph, °C/°F)
- **Dual-unit display** on guard page (shows both units simultaneously, e.g., `1.2m (3.9ft)`)

### Tide & Sun
- High and low tide times calculated from sea level data
- Tide cycle bar chart with rising/falling color indicators and current-time marker
- Sunrise and sunset times
- Full-width solar schedule on guard page

### Smart Display
- Daily summary dashboard with condition dots and 24-hour wave height bar chart
- Enhanced chart scaling (15% minimum range) to amplify small wave height variations
- Time markers at 6-hour intervals (00, 06, 12, 18, 24)
- Current-time vertical marker line on all charts
- Best surfing window highlighting (🌊) in hourly forecast
- Weather condition icons (☀️ ⛅ 🌧️ ⚡) in hourly cards
- Color-coded wave quality ratings (green/orange/red)

### Guard Report Features
- Expanded weather metrics: humidity, barometric pressure, dewpoint, visibility, heat index
- Wind direction displayed alongside speed (16-point compass)
- 24-hour wave height and tide cycle charts
- Daily period forecast (00, 06, 12, 18, 24) with conditions per interval
- 5-day forecast with weather icons, temperature range, wind, and precipitation
- Weather event log scanning for significant conditions (storms, fog, heavy rain)
- Editable marine hazard level with notes (saved to localStorage, auto-resets daily)

### User Experience
- Spanish language interface (es-GT)
- 24-hour time format
- Dark/light mode toggle (saved per browser, persists across pages)
- Responsive sponsor banner with clickable logo
- Progressive Web App (installable on mobile via "Add to Home Screen")
- Custom PWA icons (192×192, 512×512, Apple touch icon)
- Responsive design (mobile-first, adapts to tablet/desktop)
- Horizontal scrollable hourly forecast (touch swipe on mobile, Shift + mouse wheel on desktop)
- Local cache fallback when API is unavailable
- Emoji favicon (🏄)

//### SEO
// - Open Graph meta tags for social sharing
// - Twitter Card support
// - Structured data (Schema.org LocalBusiness + WeatherForecast)
// - Geo tags for local search
// - XML sitemap
// - robots.txt
// - Canonical URLs

### Integrations
- **Analytics**: Privacy-friendly tracking via Plausible.io
- **Sponsorships**: Clickable logo linking to Instagram or partner website
- **Custom Domain**: Configured for GitHub Pages deployment

## Tech Stack
- **Frontend**: Vanilla HTML/CSS/JavaScript (no frameworks)
- **APIs**: Open-Meteo Marine Weather API + Weather Forecast API
- **Hosting**: GitHub Pages (custom domain supported)
- **Analytics**: Plausible.io (privacy-friendly, cookie-free)
- **No build tools, no dependencies, no API keys required**

## API Sources
- [Open-Meteo Marine API](https://open-meteo.com/en/docs/marine-weather-api) — wave data, sea level height, water temperature
- [Open-Meteo Forecast API](https://open-meteo.com/en/docs) — wind, air temperature, weather codes, sunrise/sunset, humidity, pressure, dewpoint, visibility, apparent temperature

## Project Structure