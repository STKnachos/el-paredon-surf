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
 * - Dark/light mode toggle
 * - Compass directions displayed
 * - 24hr format, Spanish UI
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

// ============================================
// INITIALIZATION
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    console.log('🏄 App de pronóstico inicializada');
    loadThemePreference();
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
        hourly: CONFIG.marineParams
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

    // Top condition cards
    document.getElementById('wave-height').textContent =
        formatToDisplaySize(hourly.wave_height[currentHourIndex]);

    document.getElementById('wind-speed').textContent =
        Math.round(hourly.wind_speed[currentHourIndex]).toString();

    document.getElementById('air-temp').textContent =
        Math.round(hourly.temperature_2m[currentHourIndex]).toString();

    // WATER TEMP DISPLAY (NEW)
    if (hourly.sea_surface_temperature?.[currentHourIndex] !== undefined) {
        document.getElementById('water-temp').textContent =
            Math.round(hourly.sea_surface_temperature[currentHourIndex]).toString();
    } else {
        document.getElementById('water-temp').textContent = '--';
    }

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
    updateSummaryBanner(summary);

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

/**
 * NEW: Calculate tide status (rising/falling)
 */
function updateTideStatus(hourly, currentIndex) {
    const statusElement = document.getElementById('tide-status');
    const statusIcon = document.getElementById('tide-status-icon');
    const statusText = document.getElementById('tide-status-text');
    
    if (!hourly.sea_level_height_msl || !hourly.time) {
        statusText.textContent = 'Datos no disponibles';
        statusIcon.textContent = '⏳';
        statusElement.className = 'tide-status tide-neutral';
        return;
    }
    
    const currentLevel = hourly.sea_level_height_msl[currentIndex];
    const nextLevel = hourly.sea_level_height_msl[Math.min(currentIndex + 1, hourly.sea_level_height_msl.length - 1)];
    
    if (nextLevel > currentLevel) {
        statusText.textContent = 'Marea subiendo';
        statusIcon.textContent = '↑';
        statusElement.className = 'tide-status tide-rising';
    } else if (nextLevel < currentLevel) {
        statusText.textContent = 'Marea bajando';
        statusIcon.textContent = '↓';
        statusElement.className = 'tide-status tide-falling';
    } else {
        statusText.textContent = 'Marea estable';
        statusIcon.textContent = '•';
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
    const windDirection = hourly.wind_direction?.[currentIndex];
    
    let waveDesc, overallRating, summaryText;
    const badges = [];

    // Wave description
    if (waveHeight >= 1.5) {
        waveDesc = 'olas grandes';
        overallRating = 'good';
    } else if (waveHeight >= 0.8) {
        waveDesc = 'olas medianas';
        overallRating = 'moderate';
    } else {
        waveDesc = 'olas pequeñas';
        overallRating = 'poor';
    }

    // Build wind badge
    if (windType && windType.class !== 'moderate') {
        const dirCardinal = getCardinalDirection(windDirection);
        badges.push(`${dirCardinal} @ ${Math.round(windSpeed)} km/h`);
    } else if (windType) {
        badges.push('ventolina suave');
    }

    // Build summary text
    if (overallRating === 'good' && windType?.class === 'favorable') {
        summaryText = `¡Excelentes condiciones! ${capitalize(waveDesc)}. Ideal para surfear.`;
    } else if (overallRating === 'good' && windType?.class === 'challenging') {
        summaryText = `Hay ${waveDesc} hoy. Oleaje picado por viento onshore.`;
    } else if (overallRating === 'good') {
        summaryText = `Hay ${waveDesc} hoy. Revisa las otras condiciones.`;
    } else if (overallRating === 'moderate' && windType?.class !== 'challenging') {
        summaryText = `${capitalize(waveDesc)} con viento manejable. Condiciones decentes.`;
    } else if (overallRating === 'moderate') {
        summaryText = `${capitalize(waveDesc)}, pero viento onshore. Oleaje menos limpio.`;
    } else if (overallRating === 'poor') {
        summaryText = `${capitalize(waveDesc)} hoy. Perfecto para descansar o practicar paddling.`;
    } else {
        summaryText = `Condiciones variables: ${waveDesc}.`;
    }

    return { text: summaryText, rating: overallRating, badges };
}

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

function updateSummaryBanner(summary) {
    const banner = document.getElementById('summary-banner');
    const text = document.getElementById('summary-text');
    const icon = document.getElementById('summary-icon');
    const badgesContainer = document.getElementById('condition-badges');
    
    banner.classList.remove('good', 'moderate', 'poor');
    banner.classList.add(summary.rating);
    text.textContent = summary.text;
    
    const iconMap = { good: '🏄', moderate: '😎', poor: '😴' };
    icon.textContent = iconMap[summary.rating] || '🏄';
    
    if (summary.badges && summary.badges.length > 0) {
        badgesContainer.innerHTML = summary.badges.map(badge =>
            `<span class="badge">${badge}</span>`
        ).join('');
    } else {
        badgesContainer.innerHTML = '';
    }
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
        const heightStr = tide.height.toFixed(2);
        const rowClass = tide.type === 'high' ? 'tide-high' : 'tide-low';
        
        return `
            <div class="tide-row ${rowClass}">
                <span class="tide-label">${label}</span>
                <span class="tide-time">${time} (${heightStr}m)</span>
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
            <div class="hourly-wave">${waveHeight.toFixed(1)}m</div>
            <div class="hourly-wind">${Math.round(windSpeed)} km/h</div>
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

function formatToDisplaySize(value) {
    if (value < 0.3) return '<0.3';
    return value.toFixed(1);
}

function formatTime(date) {
    return date.toLocaleString('es-GT', {
        weekday: 'short',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    });
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
    
    // NEW: Dark mode toggle listener
    document.getElementById('dark-mode-toggle').addEventListener('click', toggleTheme);
}