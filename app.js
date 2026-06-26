/**
 * ====================================================
 * EL PAREDÓN SURF FORECAST APP
 * ==============================
 * Learn: This module uses ES6+ patterns including:
 * - Constants for configuration
 * - Async/await for API calls
 * - Template literals for string interpolation
 * - Arrow functions for concise callbacks
 * ====================================================
 */

// Configuration
const CONFIG = {
    location: {
        lat: 14.43,
        lon: -91.70
    },
    // Request hourly data for wave info + basic weather
    apiUrl: 'https://marine-api.open-meteo.com/v1/marine',
    parameters: 'wave_height,wave_direction,wave_period,wind_speed,temperature_2m'
};

// Cache last successful response to avoid unnecessary network calls
let cachedData = null;
let lastUpdatedTimestamp = null;

// ============================================
// INITIALIZATION - Runs when page loads
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    console.log('🏄 Surf forecast app initialized');
    initializeLastUpdatedDisplay();
    attachEventListeners();
    loadData();
});

/**
 * Load data from API or cache
 * Uses cache-refresh strategy for better UX
 */
async function loadData() {
    try {
        // Try loading fresh data first
        const newData = await fetchSurfForecast();
        updateUI(newData);
        cacheData(newData);
    } catch (error) {
        handleError(error);
        
        // If API fails and we have cached data, show it anyway
        if (cachedData) {
            console.warn('Using cached data due to API failure');
            updateUI(cachedData, true);
        }
    }
}

/**
 * Fetches marine weather data from Open-Meteo
 * Returns parsed JSON object
 */
async function fetchSurfForecast() {
    const params = new URLSearchParams({
        latitude: CONFIG.location.lat,
        longitude: CONFIG.location.lon,
        hourly: CONFIG.parameters
    });
    
    const url = `${CONFIG.apiUrl}?${params.toString()}`;
    
    console.log(`Fetching from: ${url}`);
    
    const response = await fetch(url);
    
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
}

/**
 * Update all UI elements with fetched data
 * @param {Object} data - Open-Meteo JSON response
 * @param {Boolean} isCached - Whether this is stale cached data
 */
function updateUI(data, isCached = false) {
    const hourly = data.hourly;
    
    // Set last updated timestamp
    if (!isCached) {
        lastUpdatedTimestamp = new Date();
        document.getElementById('last-updated').textContent = 
            `Updated: ${formatTime(lastUpdatedTimestamp)}`;
    }
    
    // Extract current hour's data
    const currentHourIndex = getCurrentHourIndex(hourly.time);
    
    // Update top condition cards
    document.getElementById('wave-height').textContent = 
        formatToDisplaySize(hourly.wave_height[currentHourIndex]);
    
    document.getElementById('wind-speed').textContent = 
        Math.round(hourly.wind_speed[currentHourIndex]).toString();
    
    document.getElementById('air-temp').textContent = 
        Math.round(hourly.temperature_2m[currentHourIndex]).toString();
    
    document.getElementById('wave-direction').textContent = 
        `${hourly.wave_direction?.[currentHourIndex] || '--'}°`;
    
    document.getElementById('swell-period').textContent = 
        `${hourly.wave_period?.[currentHourIndex] || '--'} s`;
    
    // Render hourly forecast list
    renderHourlyForecast(hourly, currentHourIndex);
    
    // Remove any existing error messages
    document.querySelector('.error-message')?.remove();
}

/**
 * Renders the horizontal scrolling hourly forecast
 * Adds colored borders based on wave conditions
 */
function renderHourlyForecast(hourly, startIndex) {
    const container = document.getElementById('hourly-forecast');
    container.innerHTML = ''; // Clear loading state
    
    // Show next 10 hours starting from current
    const endIndex = Math.min(startIndex + 10, hourly.time.length);
    
    for (let i = startIndex; i < endIndex; i++) {
        const timeStr = hourly.time[i];
        const waveHeight = hourly.wave_height[i];
        const windSpeed = hourly.wind_speed[i];
        
        const item = document.createElement('div');
        item.className = 'hourly-item';
        
        // Add rating class for visual feedback
        const rating = getWaveRating(waveHeight);
        item.setAttribute('data-wave-rating', rating);
        
        // Convert ISO timestamp to local time
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
 * Adjust thresholds based on what's considered "great" at your spot
 */
function getWaveRating(heightMeters) {
    if (heightMeters >= 1.5) return 'good';     // 1.5m+ = great (knees-head+)
    if (heightMeters >= 0.8) return 'moderate'; // 0.8-1.5m = decent
    return 'poor';                              // Below 0.8m = small
}

/**
 * Finds which array index corresponds to the current hour
 */
function getCurrentHourIndex(timeArray) {
    const now = new Date();
    
    for (let i = 0; i < timeArray.length; i++) {
        const apiDate = new Date(timeArray[i]);
        
        // Match year, month, and day
        if (apiDate.getFullYear() === now.getFullYear() &&
            apiDate.getMonth() === now.getMonth() &&
            apiDate.getDate() === now.getDate()) {
            
            // Return closest matching index
            return i;
        }
    }
    
    // Fallback to middle index if no match
    return Math.floor(timeArray.length / 2);
}

/**
 * Format wave height with special case for very small waves
 */
function formatToDisplaySize(value) {
    if (value < 0.3) return '<0.3';
    return value.toFixed(1);
}

/**
 * Helper: Format timestamp nicely
 */
function formatTime(date) {
    return date.toLocaleString([], {
        weekday: 'short',
        hour: '2-digit',
        minute: '2-digit'
    });
}

/**
 * Error handling with user-friendly message
 */
function handleError(error) {
    console.error('Error fetching forecast:', error);
    
    // Create and insert error element
    const container = document.querySelector('.hourly-list');
    container.innerHTML = `<div class="error-message">⚠️ Unable to load forecast. Check connection.</div>`;
}

/**
 * Cache data to localStorage for offline resilience
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
 * Initialize last-updated display
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
 * Attach event listeners for refresh button
 */
function attachEventListeners() {
    document.getElementById('refresh-btn').addEventListener('click', () => {
        // Clear cache to force fresh data
        localStorage.removeItem('surfCache');
        loadData();
        
        // Button feedback animation
        const btn = document.getElementById('refresh-btn');
        btn.style.transform = 'rotate(360deg)';
        setTimeout(() => {
            btn.style.transform = '';
        }, 200);
    });
}