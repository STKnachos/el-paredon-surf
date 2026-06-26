/**
 * ====================================================
 * EL PARedÓN SURF FORECAST APP
 * ==============================
 * Uses TWO Open-Meteo APIs:
 * 1. Marine API → wave data (height, direction, period)
 * 2. Weather API → wind speed, air temperature
 * Results are merged by matching hourly timestamps.
 * ====================================================
 */

// Configuration
const CONFIG = {
    location: {
        lat: 14.43,
        lon: -91.70
    },
    // Marine API: wave-only parameters
    marineUrl: 'https://marine-api.open-meteo.com/v1/marine',
    marineParams: 'wave_height,wave_direction,wave_period',

    // Weather API: wind + temperature parameters
    weatherUrl: 'https://api.open-meteo.com/v1/forecast',
    weatherParams: 'wind_speed_10m,temperature_2m'
};

// Cache last successful response
let cachedData = null;
let lastUpdatedTimestamp = null;

// ============================================
// INITIALIZATION
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    console.log('🏄 Surf forecast app initialized');
    initializeLastUpdatedDisplay();
    attachEventListeners();
    loadData();
});

/**
 * Load data from both APIs in parallel, then merge
 */
async function loadData() {
    try {
        const [marineData, weatherData] = await Promise.all([
            fetchMarineForecast(),
            fetchWeatherForecast()
        ]);

        // Merge weather fields into marine data's hourly object
        const merged = mergeData(marineData, weatherData);

        updateUI(merged);
        cacheData(merged);
    } catch (error) {
        handleError(error);

        // Fall back to cached data if available
        if (cachedData) {
            console.warn('Using cached data due to API failure');
            updateUI(cachedData, true);
        }
    }
}

/**
 * Fetches MARINE data (waves) from Open-Meteo
 */
async function fetchMarineForecast() {
    const params = new URLSearchParams({
        latitude: CONFIG.location.lat,
        longitude: CONFIG.location.lon,
        hourly: CONFIG.marineParams
    });

    const url = `${CONFIG.marineUrl}?${params.toString()}`;
    console.log(`Fetching marine data from: ${url}`);

    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Marine API error! status: ${response.status}`);
    }
    return await response.json();
}

/**
 * Fetches WEATHER data (wind, temp) from Open-Meteo
 */
async function fetchWeatherForecast() {
    const params = new URLSearchParams({
        latitude: CONFIG.location.lat,
        longitude: CONFIG.location.lon,
        hourly: CONFIG.weatherParams
    });

    const url = `${CONFIG.weatherUrl}?${params.toString()}`;
    console.log(`Fetching weather data from: ${url}`);

    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Weather API error! status: ${response.status}`);
    }
    return await response.json();
}

/**
 * Merges marine + weather data by matching timestamps
 * Returns a combined hourly object with all fields
 */
function mergeData(marineData, weatherData) {
    const marineHourly = marineData.hourly;
    const weatherHourly = weatherData.hourly;

    // Add wind and temp into the marine hourly object
    marineHourly.wind_speed = weatherHourly.wind_speed_10m;
    marineHourly.temperature_2m = weatherHourly.temperature_2m;

    return marineData;
}

/**
 * Update all UI elements with merged data
 */
function updateUI(data, isCached = false) {
    const hourly = data.hourly;

    if (!isCached) {
        lastUpdatedTimestamp = new Date();
        document.getElementById('last-updated').textContent =
            `Updated: ${formatTime(lastUpdatedTimestamp)}`;
    }

    const currentHourIndex = getCurrentHourIndex(hourly.time);

    // Top condition cards
    document.getElementById('wave-height').textContent =
        formatToDisplaySize(hourly.wave_height[currentHourIndex]);

    document.getElementById('wind-speed').textContent =
        Math.round(hourly.wind_speed[currentHourIndex]).toString();

    document.getElementById('air-temp').textContent =
        Math.round(hourly.temperature_2m[currentHourIndex]).toString();

    document.getElementById('wave-direction').textContent =
        `${Math.round(hourly.wave_direction?.[currentHourIndex]) || '--'}°`;

    document.getElementById('swell-period').textContent =
        `${hourly.wave_period?.[currentHourIndex]?.toFixed(1) || '--'} s`;

    // Render hourly forecast
    renderHourlyForecast(hourly, currentHourIndex);

    // Remove error messages
    document.querySelector('.error-message')?.remove();
}

/**
 * Renders the horizontal scrolling hourly forecast
 */
function renderHourlyForecast(hourly, startIndex) {
    const container = document.getElementById('hourly-forecast');
    container.innerHTML = '';

    const endIndex = Math.min(startIndex + 10, hourly.time.length);

    for (let i = startIndex; i < endIndex; i++) {
        const timeStr = hourly.time[i];
        const waveHeight = hourly.wave_height[i];
        const windSpeed = hourly.wind_speed[i];

        const item = document.createElement('div');
        item.className = 'hourly-item';

        const rating = getWaveRating(waveHeight);
        item.setAttribute('data-wave-rating', rating);

        const dateObj = new Date(timeStr);
        const hourOnly = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        item.innerHTML = `
            <div class="hourly-time">${hourOnly}</div>
            <div class="hourly-wave">${waveHeight.toFixed(1)}m</div>
            <div class="hourly-wind">${Math.round(windSpeed)} km/h</div>
        `;

        container.appendChild(item);
    }
}

/**
 * Returns rating category for conditional styling
 */
function getWaveRating(heightMeters) {
    if (heightMeters >= 1.5) return 'good';
    if (heightMeters >= 0.8) return 'moderate';
    return 'poor';
}

/**
 * Finds which array index corresponds to the current hour
 */
function getCurrentHourIndex(timeArray) {
    const now = new Date();

    for (let i = 0; i < timeArray.length; i++) {
        const apiDate = new Date(timeArray[i]);

        if (apiDate.getFullYear() === now.getFullYear() &&
            apiDate.getMonth() === now.getMonth() &&
            apiDate.getDate() === now.getDate()) {
            return i;
        }
    }

    return Math.floor(timeArray.length / 2);
}

/**
 * Format wave height display
 */
function formatToDisplaySize(value) {
    if (value < 0.3) return '<0.3';
    return value.toFixed(1);
}

/**
 * Format timestamp nicely
 */
function formatTime(date) {
    return date.toLocaleString([], {
        weekday: 'short',
        hour: '2-digit',
        minute: '2-digit'
    });
}

/**
 * Error handling with user-

/**
 * Error handling with user-friendly message
 */
function handleError(error) {
    console.error('Error fetching forecast:', error);

    const container = document.querySelector('.hourly-list');
    container.innerHTML = `<div class="error-message">⚠️ Unable to load forecast. Check connection.</div>`;
}

/**
 * Cache data to localStorage
 */
function cacheData(data) {
    try {
        localStorage.setItem('surfCache', JSON.stringify(data));
        localStorage.setItem('cacheTimestamp', new Date().toISOString());
        cachedData = data;
        lastUpdatedTimestamp = new Date();
    } catch (e) {
        console.warn('Could not cache data:', e);
    }
}

/**
 * Initialize last-updated display from cache
 */
function initializeLastUpdatedDisplay() {
    const savedTimestamp = localStorage.getItem('cacheTimestamp');

    if (savedTimestamp) {
        const stored = new Date(savedTimestamp);
        document.getElementById('last-updated').textContent =
            `Cached: ${formatTime(stored)}`;
    } else {
        document.getElementById('last-updated').textContent =
            'Awaiting first load...';
    }
}

/**
 * Attach refresh button listener
 */
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
}
