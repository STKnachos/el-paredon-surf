# 🏄 El Paredón Surf Forecast

Personal surf and weather dashboard for El Paredón, Guatemala — a beach break on the Pacific coast. Built as a lightweight Progressive Web App (PWA) with vanilla JavaScript, no frameworks, and no API keys.

## Live Demo
Visit the deployed app at:  
https://elparedonsurf.com/

## Features

### Surf Conditions
- Wave height, direction (with compass label), and swell period
- Wind speed and direction with onshore/offshore indicator
- Water temperature from marine API
- Air temperature
- Data freshness indicator (green/yellow/red)
- **Metric/Imperial unit toggle** (meters/feet, km/h/mph, °C/°F)

### Tide & Sun
- High and low tide times calculated from sea level data
- Tide status indicator (rising/falling)
- Sunrise and sunset times

### Smart Display
- Daily summary dashboard with condition dots and 24-hour wave height bar chart
- Time markers at 6-hour intervals (00, 06, 12, 18, 24)
- Best surfing window highlighting (🌊) in hourly forecast
- Weather condition icons (☀️ ⛅ 🌧️ ⚡) in hourly cards
- Color-coded wave quality ratings (green/orange/red)

### User Experience
- Spanish language interface (es-GT)
- 24-hour time format
- Dark/light mode toggle (saved per browser)
- Responsive sponsor banner with clickable logo
- Progressive Web App (installable on mobile via "Add to Home Screen")
- Responsive design (mobile-first, adapts to tablet/desktop)
- Horizontal scrollable hourly forecast (touch swipe on mobile, Shift + mouse wheel on desktop)
- Local cache fallback when API is unavailable
- Emoji favicon (🏄)

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
- [Open-Meteo Forecast API](https://open-meteo.com/en/docs) — wind, air temperature, weather codes, sunrise/sunset