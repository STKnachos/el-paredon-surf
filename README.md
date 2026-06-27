# 🏄 El Paredón Surf Forecast

Personal surf and weather dashboard for El Paredón, Guatemala — a beach break on the Pacific coast.

## Live Demo
Visit the deployed app at:  
https://stknachos.github.io/el-paredon-surf/

## Features

### Surf Conditions
- Wave height, direction (with compass label), and swell period
- Wind speed and direction with onshore/offshore indicator
- Water temperature from marine API
- Air temperature
- Data freshness indicator (green/yellow/red)

### Tide & Sun
- High and low tide times calculated from sea level data
- Tide status indicator (rising/falling)
- Sunrise and sunset times

### Smart Display
- Daily summary banner with dynamic condition-based text and color
- Best surfing window highlighting (🌊) in hourly forecast
- Color-coded wave quality ratings (green/orange/red)
- Horizontal scrollable hourly forecast (Shift + mouse wheel on desktop)

### User Experience
- Spanish language interface (es-GT)
- 24-hour time format
- Dark/light mode toggle (saved per browser)
- Progressive Web App (installable on mobile via "Add to Home Screen")
- Responsive design (mobile-first, adapts to tablet/desktop)
- Local cache fallback when API is unavailable

## Tech Stack
- **Frontend**: Vanilla HTML/CSS/JavaScript (no frameworks)
- **APIs**: Open-Meteo Marine Weather API + Weather Forecast API
- **Hosting**: GitHub Pages
- **No build tools, no dependencies, no API keys required**

## API Sources
- [Open-Meteo Marine API](https://open-meteo.com/en/docs/marine-weather-api) — wave data, sea level height, water temperature
- [Open-Meteo Forecast API](https://open-meteo.com/en/docs) — wind, air temperature, sunrise/sunset

## File Structure