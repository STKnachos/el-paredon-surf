/**
 * ====================================================
 * EL PAREDÓN SURF FORECAST
 * ==============================
 * Features:
 * - Wave height, direction, period (Marine API)
 * - Wind speed, direction, air temp (Weather API)
 * - Sea level height for tide calculation (Marine API)
 * - Sunrise/sunset times (Weather API daily)
 * - Water temperature from Marine API
 * - Tide rising/falling status
 * - Best window highlighting
 * - Weather condition icons (☀️ ⛅ 🌧️ ⚡) in hourly cards
 * - Dark/light mode toggle
 * - Compass directions displayed
 * - Metric/Imperial unit toggle
 * - 24hr format, Spanish UI
 * - Daily summary dashboard with bar chart
 * ====================================================
 */
const CONFIG = {
    location: {
        lat: 14.43,
        lon: -91.70
    },
    marineUrl: 'https://marine-api.open-meteo.com/v1/marine',
    // ADDED: sea_surface_temperature to parameters
    marineParams: 'wave_height,wave_direction,wave_period,sea_level_height_msl,sea_surface_temperature',
    weatherUrl: 'https://api.open-meteo.com/v1/forecast',
       // In CONFIG object
    weatherParams: 'wind_speed_10m,temperature_2m,wind_direction_10m,weathercode',
    weatherDailyParams: 'sunrise,sunset'
};

let cachedData = null;
let lastUpdatedTimestamp = null;
let currentUnits = 'metric';

// ============================================
// INITIALIZATION
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    console.log('🏄 App de pronóstico inicializada');
    loadThemePreference();
    loadUnitPreference();  // <-- ADD THIS LINE
    initializeLastUpdatedDisplay();
    attachEventListeners();
    loadData();
});

async function loadData() {
    try {
        const [marineData, weatherData] = await Promise.all([
            fetchMarineForecast(),
            fetchWeatherForecast()
        ]);

        const merged = mergeData(marineData, weatherData);
        updateUI(merged);
        cacheData(merged);
    } catch (error) {
        handleError(error);
        
        if (cachedData) {
            console.warn('Usando datos en caché debido a falla en API');
            updateUI(cachedData, true);
        }
    }
}

async function fetchMarineForecast() {
    const params = new URLSearchParams({
        latitude: CONFIG.location.lat,
        longitude: CONFIG.location.lon,
        hourly: CONFIG.marineParams,
        timezone: 'America/Guatemala'
    });

    const url = `${CONFIG.marineUrl}?${params.toString()}`;
    console.log(`Obteniendo datos marinos: ${url}`);

    const response = await fetch(url);
    if (!response.ok) throw new Error(`Error API marina: ${response.status}`);
    return await response.json();
}

async function fetchWeatherForecast() {
    const params = new URLSearchParams({
        latitude: CONFIG.location.lat,
        longitude: CONFIG.location.lon,
        hourly: CONFIG.weatherParams,
        daily: CONFIG.weatherDailyParams,
        timezone: 'America/Guatemala'
    });

    const url = `${CONFIG.weatherUrl}?${params.toString()}`;
    console.log(`Obteniendo datos climáticos: ${url}`);

    const response = await fetch(url);
    if (!response.ok) throw new Error(`Error API clima: ${response.status}`);
    return await response.json();
}

function mergeData(marineData, weatherData) {
    const marineHourly = marineData.hourly;
    const weatherHourly = weatherData.hourly;

    marineHourly.wind_speed = weatherHourly.wind_speed_10m;
    marineHourly.temperature_2m = weatherHourly.temperature_2m;
    marineHourly.wind_direction = weatherHourly.wind_direction_10m;
    
    marineHourly.weathercode = weatherHourly.weathercode;
    
    marineData.daily = weatherData.daily;

    return marineData;
}

function updateUI(data, isCached = false) {
    const hourly = data.hourly;
    const daily = data.daily;

    if (!isCached) {
        lastUpdatedTimestamp = new Date();
        document.getElementById('last-updated').textContent =
            `Actualizado: ${formatTime(lastUpdatedTimestamp)}`;
        
        // NEW: Update freshness badge
        updateFreshnessBadge(new Date());
    }

    const currentHourIndex = getCurrentHourIndex(hourly.time);

    // WAVE DIRECTION WITH COMPASS LABEL (ENHANCED)
    const waveDirDegrees = Math.round(hourly.wave_direction?.[currentHourIndex]) || '--';
    const waveDirCardinal = waveDirDegrees !== '--' ? getCardinalDirection(waveDirDegrees) : '-';
    document.getElementById('wave-direction').textContent =
        `${waveDirDegrees}° (${waveDirCardinal})`;

    document.getElementById('swell-period').textContent =
        `${hourly.wave_period?.[currentHourIndex]?.toFixed(1) || '--'} s`;

    // Wind type indicator
    const windType = determineWindType(
        hourly.wind_direction?.[currentHourIndex],
        hourly.wind_speed?.[currentHourIndex]
    );
    updateWindHint(windType);

    // NEW: Tide status (rising/falling)
    updateTideStatus(hourly, currentHourIndex);

    // Daily summary banner with icon + badges
const summary = generateDailySummary(hourly, currentHourIndex, windType);
updateDashboard(summary);

// Draw bar chart
if (summary.allWaveHeights) {
    const chart = document.getElementById('wave-bar-chart');
drawBarChart(chart, summary.allWaveHeights, hourly.time.slice(0, 24));}

/**
 * Draws a 24-hour wave height bar chart with time markers
 */
function drawBarChart(svgElement, waveData, timeArray) {
    if (!svgElement || !waveData || waveData.length === 0) return;
    
    const svgNS = 'http://www.w3.org/2000/svg';
    
    // Clear existing content
    while (svgElement.firstChild) {
        svgElement.removeChild(svgElement.firstChild);
    }
    
    const width = 280;
    const height = 50;
    const labelArea = 14; // Space for time labels
    const chartHeight = height - labelArea;
    const padding = 3;
    const barGap = 1.5;
    
    // Dynamic scaling
    const minVal = Math.min(...waveData);
    const maxVal = Math.max(...waveData);
    const range = Math.max(maxVal - minVal, 0.3);
    
    // Calculate bar width
    const availableWidth = width - padding * 2;
    const barWidth = (availableWidth - (barGap * (waveData.length - 1))) / waveData.length;
    
    waveData.forEach((h, idx) => {
        // Normalize with dynamic scaling
        const normalized = (h - minVal) / range;
        const barHeight = Math.max(normalized * (chartHeight - padding * 2), 3);
        
        const x = padding + idx * (barWidth + barGap);
        const y = chartHeight - padding - barHeight;
        
        const rect = document.createElementNS(svgNS, 'rect');
        rect.setAttribute('x', x);
        rect.setAttribute('y', y);
        rect.setAttribute('width', barWidth);
        rect.setAttribute('height', barHeight);
        rect.setAttribute('rx', '1');
        
        // Color by rating
        const rating = getWaveRating(h);
        const color = rating === 'good' ? '#10b981' : 
                      rating === 'moderate' ? '#f59e0b' : '#ef4444';
        rect.setAttribute('fill', color);
        
        svgElement.appendChild(rect);
    });
    
       // Add time labels every 6 hours + 24 at the end
    const labelHours = [
        { idx: 0, label: '00' },
        { idx: 6, label: '06' },
        { idx: 12, label: '12' },
        { idx: 18, label: '18' },
        { idx: 23, label: '24' }
    ];
    
    labelHours.forEach(({ idx, label }) => {
        if (idx >= waveData.length) return;
        
        const x = padding + idx * (barWidth + barGap) + (barWidth / 2);
        
        const text = document.createElementNS(svgNS, 'text');
        text.setAttribute('x', x);
        text.setAttribute('y', height - 2);
        text.setAttribute('text-anchor', 'middle');
        text.setAttribute('font-size', '8');
        text.setAttribute('fill', '#94a3b8');
        text.textContent = label;
        svgElement.appendChild(text);
    });
    
    // Update viewBox to include label area
    svgElement.setAttribute('viewBox', `0 0 ${width} ${height}`);
}
    // Tide times
    if (hourly.sea_level_height_msl) {
        const tides = calculateTideTimes(hourly.time, hourly.sea_level_height_msl, currentHourIndex);
        renderTideTimes(tides);
    }

    // Sunrise/Sunset
    if (daily) {
        renderSunTimes(daily);
    }

    // Hourly forecast with best window highlighting
renderHourlyForecast(hourly, currentHourIndex);
    document.querySelector('.error-message')?.remove();
}

    // Toggle switch for unit conversion
function loadUnitPreference() {
    const saved = localStorage.getItem('units') || 'metric';
    currentUnits = saved;
    updateUnitToggle();
}


/**
 * Draws a 24-hour tide cycle bar chart with current-position marker
 */
function updateTideStatus(hourly, currentIndex) {
    const svg = document.getElementById('tide-bar-chart');
    const statusText = document.getElementById('tide-status-text');
    const statusElement = document.getElementById('tide-status');
    
    if (!hourly.sea_level_height_msl || !hourly.time) {
        statusText.textContent = 'Datos no disponibles';
        statusElement.className = 'tide-status tide-neutral';
        return;
    }
    
    const seaLevels = hourly.sea_level_height_msl;
    const slice = seaLevels.slice(0, 24);
    
    const svgNS = 'http://www.w3.org/2000/svg';
    while (svg.firstChild) {
        svg.removeChild(svg.firstChild);
    }
    
    const width = 280;
    const height = 50;
    const labelArea = 14;
    const chartHeight = height - labelArea;
    const padding = 3;
    const barGap = 1.5;
    
    const minVal = Math.min(...slice);
    const maxVal = Math.max(...slice);
    const range = Math.max(maxVal - minVal, 0.3);
    
    const availableWidth = width - padding * 2;
    const barWidth = (availableWidth - (barGap * (slice.length - 1))) / slice.length;
    
    // Draw tide bars — rising = blue, falling = lighter blue
    slice.forEach((h, idx) => {
        const normalized = (h - minVal) / range;
        const barHeight = Math.max(normalized * (chartHeight - padding * 2), 3);
        
        const x = padding + idx * (barWidth + barGap);
        const y = chartHeight - padding - barHeight;
        
        const rect = document.createElementNS(svgNS, 'rect');
        rect.setAttribute('x', x);
        rect.setAttribute('y', y);
        rect.setAttribute('width', barWidth);
        rect.setAttribute('height', barHeight);
        rect.setAttribute('rx', '1');
        
        // Color based on rising/falling
        const nextLevel = seaLevels[Math.min(idx + 1, seaLevels.length - 1)];
        rect.setAttribute('fill', nextLevel > h ? '#0ea5e9' : '#7dd3fc');
        
        svg.appendChild(rect);
    });
    
    // Vertical marker line at current hour
    const markerIdx = Math.min(currentIndex, slice.length - 1);
    if (markerIdx >= 0) {
        const lineX = padding + markerIdx * (barWidth + barGap) + (barWidth / 2);
        
        const line = document.createElementNS(svgNS, 'line');
        line.setAttribute('x1', lineX);
        line.setAttribute('y1', 0);
        line.setAttribute('x2', lineX);
        line.setAttribute('y2', chartHeight);
        line.setAttribute('stroke', '#ef4444');
        line.setAttribute('stroke-width', '2');
        line.setAttribute('stroke-dasharray', '3,2');
        svg.appendChild(line);
    }
    
    // Time labels
    const labelHours = [
        { idx: 0, label: '00' },
        { idx: 6, label: '06' },
        { idx: 12, label: '12' },
        { idx: 18, label: '18' },
        { idx: 23, label: '24' }
    ];
    
    labelHours.forEach(({ idx, label }) => {
        if (idx >= slice.length) return;
        const x = padding + idx * (barWidth + barGap) + (barWidth / 2);
        
        const text = document.createElementNS(svgNS, 'text');
        text.setAttribute('x', x);
        text.setAttribute('y', height - 2);
        text.setAttribute('text-anchor', 'middle');
        text.setAttribute('font-size', '8');
        text.setAttribute('fill', '#94a3b8');
        text.textContent = label;
        svg.appendChild(text);
    });
    
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    
    // Set rising/falling text label below chart
    const currentLevel = seaLevels[currentIndex];
    const nextLevel = seaLevels[Math.min(currentIndex + 1, seaLevels.length - 1)];
    
    if (nextLevel > currentLevel) {
        statusText.textContent = 'Marea subiendo ↑';
        statusElement.className = 'tide-status tide-rising';
    } else if (nextLevel < currentLevel) {
        statusText.textContent = 'Marea bajando ↓';
        statusElement.className = 'tide-status tide-falling';
    } else {
        statusText.textContent = 'Marea estable •';
        statusElement.className = 'tide-status tide-neutral';
    }
}
/**
 * NEW: Update data freshness indicator
 */
function updateFreshnessBadge(timestamp) {
    const dot = document.getElementById('freshness-dot');
    const text = document.getElementById('freshness-text');
    
    const now = new Date();
    const diffHours = (now - timestamp) / (1000 * 60 * 60);
    
    dot.classList.remove('freshness-green', 'freshness-yellow', 'freshness-red');
    
    if (diffHours < 2) {
        dot.classList.add('freshness-green');
        text.textContent = 'Datos frescos ✓';
    } else if (diffHours < 6) {
        dot.classList.add('freshness-yellow');
        text.textContent = 'Actualizado recientemente';
    } else {
        dot.classList.add('freshness-red');
        text.textContent = 'Datos antiguos → Refrescar';
    }
}

/**
 * Generates daily summary with stats for badges
 */
function generateDailySummary(hourly, currentIndex, windType) {
    const waveHeight = hourly.wave_height[currentIndex];
    const windSpeed = hourly.wind_speed[currentIndex];
    const wavePeriod = hourly.wave_period?.[currentIndex] || '--';
    const waterTemp = hourly.sea_surface_temperature?.[currentIndex] || '--';
    const windDirection = hourly.wave_direction?.[currentIndex] || 0;
    const cardinalDir = getCardinalDirection(windDirection);
    
    // Determine overall rating
    let overallRating;
    if (waveHeight >= 1.5) {
        overallRating = 'good';
    } else if (waveHeight >= 0.8) {
        overallRating = 'moderate';
    } else {
        overallRating = 'poor';
    }
    
    return { 
        rating: overallRating, 
        data: {
            waveHeight: waveHeight.toFixed(1),
            windSpeed: Math.round(windSpeed),
            airTemp: Math.round(hourly.temperature_2m[currentIndex]),
            tidalStatus: window.tidalStatus || '—',
            direction: cardinalDir,
            period: typeof wavePeriod === 'number' ? wavePeriod.toFixed(1) : '--',
            waterTemp: typeof waterTemp === 'number' ? waterTemp.toFixed(1) : '--'
        },
        allWaveHeights: hourly.wave_height.slice(0, 24) // First 24 hours for sparkline
    };
}

function updateDashboard(summary) {
    const dashboard = document.getElementById('summary-dashboard');
    dashboard.classList.remove('good', 'moderate', 'poor');
    dashboard.classList.add(summary.rating);
    
    // Update dots — NO inline styles, pure CSS classes
    const dots = dashboard.querySelectorAll('.dot');
    const filledCount = summary.rating === 'good' ? 5 : 
                        summary.rating === 'moderate' ? 3 : 1;
    dots.forEach((dot, i) => {
        dot.className = 'dot';
        if (i < filledCount) {
            dot.classList.add(summary.rating);
        }
    });
    
    // Update stats
    document.getElementById('dash-wave-height').textContent = 
        formatWithUnit(parseFloat(summary.data.waveHeight), 'wave');
    document.getElementById('dash-wind-speed').textContent = 
        formatWithUnit(parseInt(summary.data.windSpeed), 'wind') + ' ' + summary.data.direction;
    document.getElementById('dash-water-temp').textContent = 
        formatWithUnit(parseFloat(summary.data.waterTemp), 'temp');
    document.getElementById('dash-air-temp').textContent = 
        formatWithUnit(parseInt(summary.data.airTemp), 'temp');}

function getCardinalDirection(degrees) {
    if (!degrees || degrees === '--') return '?';
    const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    const index = Math.round((degrees % 360) / 45) % 8;
    return dirs[index];
}
/**
 * Maps Open-Meteo WMO weather codes to Spanish labels & icons
 */
function getWeatherInfo(code) {
    const map = {
        0: { text: 'Soleado', icon: '☀️' },
        1: { text: 'Despejado', icon: '🌤️' },
        2: { text: 'Parcial.', icon: '⛅' },
        3: { text: 'Nublado', icon: '☁️' },
        45: { text: 'Niebla', icon: '🌫️' },
        48: { text: 'Escarcha', icon: '🌫️' },
        51: { text: 'Llovizna', icon: '💧' },
        53: { text: 'Llovizna', icon: '💧' },
        55: { text: 'Llovizna', icon: '💧' },
        61: { text: 'Lluvia', icon: '🌧️' },
        63: { text: 'Lluvia', icon: '🌧️' },
        65: { text: 'Chubasco', icon: '☔' },
        80: { text: 'Chubasco', icon: '🌦️' },
        81: { text: 'Chubasco', icon: '🌦️' },
        82: { text: 'Fuerte', icon: '⛈️' },
        95: { text: 'Tormenta', icon: '⚡' },
        96: { text: 'Tormenta', icon: '⚡' },
        99: { text: 'Tormenta', icon: '⚡' }
    };
    return map[code] || { text: '-', icon: '❓' };
}

function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

function calculateTideTimes(timeArray, seaLevelArray, startIndex) {
    const tides = [];
    const endIndex = Math.min(startIndex + 24, timeArray.length);

    for (let i = startIndex + 1; i < endIndex - 1; i++) {
        const prev = seaLevelArray[i - 1];
        const curr = seaLevelArray[i];
        const next = seaLevelArray[i + 1];

        if (curr > prev && curr >= next) {
            tides.push({ type: 'high', time: timeArray[i], height: curr });
        }

        if (curr < prev && curr <= next) {
            tides.push({ type: 'low', time: timeArray[i], height: curr });
        }
    }

    tides.sort((a, b) => new Date(a.time) - new Date(b.time));
    return tides.slice(0, 4);
}

function renderTideTimes(tides) {
    const container = document.getElementById('tide-times');
    
    if (!tides || tides.length === 0) {
        container.innerHTML = '<p class="info-loading">Datos no disponibles</p>';
        return;
    }

    container.innerHTML = tides.map(tide => {
        const time = formatHour(tide.time);
        const label = tide.type === 'high' ? 'Alta' : 'Baja';
        const heightStr = formatWithUnit(parseFloat(tide.height.toFixed(2)), 'tide');       
        const rowClass = tide.type === 'high' ? 'tide-high' : 'tide-low';
        
        return `
            <div class="tide-row ${rowClass}">
                <span class="tide-label">${label}</span>
                <span class="tide-time">${time} (${heightStr})</span>
            </div>
        `;
    }).join('');
}

function renderSunTimes(daily) {
    const container = document.getElementById('sun-times');
    
    if (!daily || !daily.sunrise || !daily.sunset) {
        container.innerHTML = '<p class="info-loading">Datos no disponibles</p>';
        return;
    }

    container.innerHTML = `
        <div class="sun-row">
            <span class="sun-label">🌅 Amanece</span>
            <span class="sun-time">${formatHour(daily.sunrise[0])}</span>
        </div>
        <div class="sun-row">
            <span class="sun-label">🌇 Atardece</span>
            <span class="sun-time">${formatHour(daily.sunset[0])}</span>
        </div>
    `;
}

function determineWindType(windDir, windSpeed) {
    if (!windDir || !windSpeed) return null;

    if (windSpeed < 10) {
        return { label: 'Ventolina suave', class: 'moderate' };
    }

    if (windDir >= 150 && windDir <= 270) {
        return { label: 'Viento de Mar (Onshore)', class: 'challenging' };
    }

    return { label: 'Viento de Tierra (Offshore)', class: 'favorable' };
}

function updateWindHint(windType) {
    const windHintElement = document.getElementById('wind-hint');
    const windValueElement = document.getElementById('wind-type');
    
    if (windType) {
        windHintElement.classList.remove('favorable', 'challenging', 'moderate');
        windValueElement.className = 'hint-value ' + windType.class;
        windValueElement.textContent = windType.label;
        windHintElement.style.display = 'flex';
    }
}

/**
 * ENHANCED: Render hourly forecast with best window highlighting + weather
 */
function renderHourlyForecast(hourly, startIndex) {
    const container = document.getElementById('hourly-forecast');
    container.innerHTML = '';

    const endIndex = Math.min(startIndex + 10, hourly.time.length);
    
    // Find indices with best conditions for highlighting
    const bestIndices = findBestWindows(hourly, startIndex, endIndex);

    for (let i = startIndex; i < endIndex; i++) {
        const timeStr = hourly.time[i];
        const waveHeight = hourly.wave_height[i];
        const windSpeed = hourly.wind_speed[i];
        
        // NEW: Get weather info from weathercode
        const weather = getWeatherInfo(hourly.weathercode?.[i]);

        const item = document.createElement('div');
        item.className = 'hourly-item';
        
        const rating = getWaveRating(waveHeight);
        item.setAttribute('data-wave-rating', rating);
        item.setAttribute('role', 'button');
        
        // BEST WINDOW HIGHLIGHTING (NEW)
        if (bestIndices.includes(i)) {
            item.classList.add('best-window');
            item.setAttribute('aria-label', `Mejor ventana - Pronóstico para las ${formatHour(timeStr)} - ${weather.text}`);
        }

        // UPDATED: Added weather icon row
item.innerHTML = `
    ${bestIndices.includes(i) ? '<span class="hourly-best-indicator">🌊</span>' : ''}
    <div class="hourly-weather">${weather.icon}</div>
    <div class="hourly-time">${formatHour(timeStr)}</div>
    <div class="hourly-wave">${formatWithUnit(waveHeight, 'wave')}</div>
    <div class="hourly-wind">${formatWithUnit(Math.round(windSpeed), 'wind')}</div>
`.trim();
        container.appendChild(item);
    }
}

/**
 * NEW: Identify best surfing windows based on wave + wind combo
 */
function findBestWindows(hourly, startIndex, endIndex) {
    const bestScores = [];
    
    for (let i = startIndex; i < endIndex; i++) {
        const waveHeight = hourly.wave_height[i] || 0;
        const windSpeed = hourly.wind_speed[i] || 0;
        const windDir = hourly.wind_direction?.[i] || 0;
        
        // Score: higher waves + lower wind + offshore = better
        let score = waveHeight * 10;
        
        if (windSpeed < 15) score += 20;
        else if (windSpeed < 25) score += 10;
        
        // Offshore bonus
        if ((windDir >= 0 && windDir < 150) || (windDir > 270)) {
            score += 15;
        }
        
        bestScores.push({ index: i, score });
    }
    
    // Sort by score descending
    bestScores.sort((a, b) => b.score - a.score);
    
    // Return top 2-3 best hours (but at most 30% of visible hours)
    const count = Math.max(2, Math.floor((endIndex - startIndex) * 0.3));
    return bestScores.slice(0, count).map(x => x.index);
}

function formatTime(date) {
    return date.toLocaleString('es-GT', {
        weekday: 'short',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    });
}

function formatHour(timeString) {
    const date = new Date(timeString);
    return date.toLocaleTimeString('es-GT', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    });
}

function getWaveRating(heightMeters) {
    if (heightMeters >= 1.5) return 'good';
    if (heightMeters >= 0.8) return 'moderate';
    return 'poor';
}

function getCurrentHourIndex(timeArray) {
  const nowMs = Date.now();

  let bestIdx = 0;
  let bestDiff = Infinity;

  for (let i = 0; i < timeArray.length; i++) {
    const t = new Date(timeArray[i]).getTime();
    const diff = Math.abs(t - nowMs);
    if (diff < bestDiff) {
      bestDiff = diff;
      bestIdx = i;
    }
  }
  return bestIdx;
}

function handleError(error) {
    console.error('Error obteniendo pronóstico:', error);
    const container = document.querySelector('.hourly-list');
    container.innerHTML = `<div class="error-message">⚠️ No se pudo cargar el pronóstico. Verifica conexión.</div>`;
}

function cacheData(data) {
    try {
        localStorage.setItem('surfCache', JSON.stringify(data));
        localStorage.setItem('cacheTimestamp', new Date().toISOString());
        cachedData = data;
        lastUpdatedTimestamp = new Date();
    } catch (e) {
        console.warn('No se pudieron guardar datos en caché:', e);
    }
}

function initializeLastUpdatedDisplay() {
    const savedTimestamp = localStorage.getItem('cacheTimestamp');

    if (savedTimestamp) {
        const stored = new Date(savedTimestamp);
        document.getElementById('last-updated').textContent =
            `Guardado: ${formatTime(stored)}`;
    } else {
        document.getElementById('last-updated').textContent =
            'Esperando primera carga...';
    }
}

// ============================================
// DARK MODE TOGGLE FUNCTIONALITY (NEW)
// ============================================

function loadThemePreference() {
    const saved = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', saved);
    updateDarkModeButton(saved);
}

function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
    updateDarkModeButton(next);
}

/**
 * Toggles between metric and imperial units
 */
function toggleUnits() {
    currentUnits = currentUnits === 'metric' ? 'imperial' : 'metric';
    localStorage.setItem('units', currentUnits);
    updateUnitToggle();
    
    // Manually refresh all visible numbers without reloading API
    if (cachedData) {
        updateUI(cachedData, true);
        updateFreshnessBadge(new Date());
    } else {
        loadData();
    }
}

function updateUnitToggle() {
    const btn = document.getElementById('unit-toggle');
    btn.textContent = currentUnits === 'metric' ? 'METRIC' : 'IMPERIAL';
    btn.classList.toggle('active', currentUnits === 'metric');
}

function updateDarkModeButton(theme) {
    const btn = document.getElementById('dark-mode-toggle');
    btn.textContent = theme === 'dark' ? '☀️' : '🌙';
    btn.setAttribute('aria-label', 
        theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'
    );
}

function attachEventListeners() {
    document.getElementById('refresh-btn').addEventListener('click', () => {
        localStorage.removeItem('surfCache');
        loadData();

        const btn = document.getElementById('refresh-btn');
        btn.style.transform = 'rotate(360deg)';
        setTimeout(() => {
            btn.style.transform = '';
        }, 200);
    });
    
    // Dark mode toggle listener
    document.getElementById('dark-mode-toggle').addEventListener('click', toggleTheme);
    
    // NEW: Unit toggle listener
    document.getElementById('unit-toggle').addEventListener('click', toggleUnits);
}
/**
 * Converts metric value to imperial based on type
 */
function toImperial(value, type) {
    if (value === '--' || typeof value !== 'number') return '--';
    switch (type) {
        case 'wave':   return (value * 3.28084).toFixed(1);  // meters → feet
        case 'wind':   return Math.round(value * 0.621371);  // km/h → mph
        case 'temp':   return Math.round((value * 9/5) + 32); // Celsius → Fahrenheit
        case 'tide':   return (value * 3.28084).toFixed(2); // meters → feet
        default:       return value.toString();
    }
}

/**
 * Returns appropriate unit symbol
 */
function getUnitSymbol(type) {
    if (currentUnits === 'metric') {
        switch (type) {
            case 'wave':   return 'm';
            case 'wind':   return 'km/h';
            case 'temp':   return '°C';
            case 'tide':   return 'm';
        }
    } else {
        switch (type) {
            case 'wave':   return 'ft';
            case 'wind':   return 'mph';
            case 'temp':   return '°F';
            case 'tide':   return 'ft';
        }
    }
}

/**
 * Formats value with correct unit suffix
 */
function formatWithUnit(value, type) {
    const raw = currentUnits === 'metric' ? value : toImperial(value, type);
    const symbol = getUnitSymbol(type);
    return `${raw}${symbol}`;
}