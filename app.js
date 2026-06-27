/**
 * ====================================================
 * EL PAREDÓN SURF FORECAST
 * ==============================
 * Features:
 * - Wave height, direction, period (Marine API)
 * - Wind speed, direction, air temp (Weather API)
 * - Sea level height for tide calculation (Marine API)
 * - Sunrise/sunset times (Weather API daily)
 * - Daily summary banner (custom logic)
 * - Wind onshore/offshore indicator
 * - 24hr format, Spanish UI
 * ====================================================
 */

const CONFIG = {
    location: {
        lat: 14.43,
        lon: -91.70
    },
    // Marine API: wave + sea level (tides)
    marineUrl: 'https://marine-api.open-meteo.com/v1/marine',
    marineParams: 'wave_height,wave_direction,wave_period,sea_level_height_msl',

    // Weather API: wind + temp (hourly) + sunrise/sunset (daily)
    weatherUrl: 'https://api.open-meteo.com/v1/forecast',
    weatherParams: 'wind_speed_10m,temperature_2m,wind_direction_10m',
    weatherDailyParams: 'sunrise,sunset',
    
    beachBearing: 225  // El Paredón faces ~SW
};

let cachedData = null;
let lastUpdatedTimestamp = null;

// ============================================
// INITIALIZATION
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    console.log('🏄 App de pronóstico inicializada');
    initializeLastUpdatedDisplay();
    attachEventListeners();
    loadData();
    setupHorizontalScroll();
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

    // Merge hourly weather fields into marine data
    marineHourly.wind_speed = weatherHourly.wind_speed_10m;
    marineHourly.temperature_2m = weatherHourly.temperature_2m;
    marineHourly.wind_direction = weatherHourly.wind_direction_10m;

    // Merge daily sunrise/sunset
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
    }

    const currentHourIndex = getCurrentHourIndex(hourly.time);

    // Update top condition cards
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

    // Wind type indicator
    const windType = determineWindType(
        hourly.wind_direction?.[currentHourIndex],
        hourly.wind_speed?.[currentHourIndex]
    );
    updateWindHint(windType);

    // NEW: Daily summary banner
    const summary = generateDailySummary(hourly, currentHourIndex, windType);
    updateSummaryBanner(summary);

    // NEW: Tide times
    if (hourly.sea_level_height_msl) {
        const tides = calculateTideTimes(hourly.time, hourly.sea_level_height_msl, currentHourIndex);
        renderTideTimes(tides);
    }

    // NEW: Sunrise/Sunset
    if (daily) {
        renderSunTimes(daily);
    }

    // Hourly forecast
    renderHourlyForecast(hourly, currentHourIndex);
    document.querySelector('.error-message')?.remove();
}

/**
 * NEW: Generates a Spanish summary based on conditions
 */
function generateDailySummary(hourly, currentIndex, windType) {
    const waveHeight = hourly.wave_height[currentIndex];
    const windSpeed = hourly.wind_speed[currentIndex];
    
    let waveDesc, windDesc, overallRating, summaryText;

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

    // Wind description
    if (windType) {
        if (windType.class === 'favorable') {
            windDesc = 'viento offshore';
        } else if (windType.class === 'challenging') {
            windDesc = 'viento onshore';
        } else {
            windDesc = 'ventolina suave';
        }
    } else {
        windDesc = 'viento variable';
    }

    // Combined summary
    if (overallRating === 'good' && windType?.class === 'favorable') {
        summaryText = `¡Excelentes condiciones! ${capitalize(waveDesc)} con ${windDesc}. ¡A surfear! 🏄`;
    } else if (overallRating === 'good') {
        summaryText = `Hay ${waveDesc} hoy, pero ${windDesc}. Podría estar picado.`;
    } else if (overallRating === 'moderate' && windType?.class !== 'challenging') {
        summaryText = `${capitalize(waveDesc)} con ${windDesc}. Condiciones decentes.`;
    } else if (overallRating === 'moderate') {
        summaryText = `${capitalize(waveDesc)}, pero ${windDesc}. Oleaje picado.`;
    } else if (overallRating === 'poor') {
        summaryText = `${capitalize(waveDesc)} hoy con ${windDesc}. Día tranquilo.`;
    } else {
        summaryText = `Condiciones variables: ${waveDesc}, ${windDesc}.`;
    }

    return { text: summaryText, rating: overallRating };
}

function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

function updateSummaryBanner(summary) {
    const banner = document.getElementById('summary-banner');
    const text = document.getElementById('summary-text');
    
    banner.classList.remove('good', 'moderate', 'poor');
    banner.classList.add(summary.rating);
    text.textContent = summary.text;
}

/**
 * NEW: Calculates high and low tide times from sea level data
 * Finds local maxima (high) and minima (low) in the next 24 hours
 */
function calculateTideTimes(timeArray, seaLevelArray, startIndex) {
    const tides = [];
    const endIndex = Math.min(startIndex + 24, timeArray.length);

    for (let i = startIndex + 1; i < endIndex - 1; i++) {
        const prev = seaLevelArray[i - 1];
        const curr = seaLevelArray[i];
        const next = seaLevelArray[i + 1];

        // Local maximum = high tide
        if (curr > prev && curr >= next) {
            tides.push({
                type: 'high',
                time: timeArray[i],
                height: curr
            });
        }

        // Local minimum = low tide
        if (curr < prev && curr <= next) {
            tides.push({
                type: 'low',
                time: timeArray[i],
                height: curr
            });
        }
    }

    // Sort chronologically and return first 4 (typically 2 highs + 2 lows per day)
    tides.sort((a, b) => new Date(a.time) - new Date(b.time));
    return tides.slice(0, 4);
}

/**
 * NEW: Renders tide times into the DOM
 */
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

/**
 * NEW: Renders sunrise and sunset times
 */
function renderSunTimes(daily) {
    const container = document.getElementById('sun-times');
    
    if (!daily || !daily.sunrise || !daily.sunset) {
        container.innerHTML = '<p class="info-loading">Datos no disponibles</p>';
        return;
    }

    const sunrise = formatHour(daily.sunrise[0]);
    const sunset = formatHour(daily.sunset[0]);

    container.innerHTML = `
        <div class="sun-row">
            <span class="sun-label">🌅 Amanece</span>
            <span class="sun-time">${sunrise}</span>
        </div>
        <div class="sun-row">
            <span class="sun-label">🌇 Atardece</span>
            <span class="sun-time">${sunset}</span>
        </div>
    `;
}

/**
 * Determines if wind is favorable (offshore) or challenging (onshore)
 */
function determineWindType(windDir, windSpeed) {
    if (!windDir || !windSpeed) return null;

    let label, className;
    
    if (windSpeed < 10) {
        label = 'Ventolina suave';
        className = 'moderate';
    } else if (windDir >= 150 && windDir <= 270) {
        label = 'Viento de Mar (Onshore)';
        className = 'challenging';
    } else if ((windDir >= 0 && windDir < 150) || (windDir > 270 && windDir <= 360)) {
        label = 'Viento de Tierra (Offshore)';
        className = 'favorable';
    } else {
        label = 'Viento variable';
        className = 'moderate';
    }

    return { label, class: className };
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
        item.tabIndex = 0;
        
        const rating = getWaveRating(waveHeight);
        item.setAttribute('data-wave-rating', rating);
        item.setAttribute('role', 'button');
        item.setAttribute('aria-label', `Pronóstico para las ${formatHour(timeStr)}: ${waveHeight.toFixed(1)} metros de oleaje`);

        const hourOnly = formatHour(timeStr);

        item.innerHTML = `
            <div class="hourly-time">${hourOnly}</div>
            <div class="hourly-wave">${waveHeight.toFixed(1)}m</div>
            <div class="hourly-wind">${Math.round(windSpeed)} km/h</div>
        `;

        container.appendChild(item);
    }
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

function formatToDisplaySize(value) {
    if (value < 0.3) return '<0.3';
    return value.toFixed(1);
}

function formatTime(date) {
    return date.toLocaleString('es-GT', {
        weekday: 'short',
        hour: '2-digit',
        minute: '2-digit'
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

function setupHorizontalScroll() {
    const list = document.querySelector('.hourly-list');
    if (!list) return;

    list.addEventListener('scroll', () => {
        list.classList.toggle('scrolling-start', list.scrollLeft > 0);
        list.classList.toggle('scrolling-end', 
            list.scrollLeft + list.clientWidth < list.scrollWidth - 5);
    });

    list.addEventListener('wheel', (event) => {
        if (event.shiftKey) {
            event.preventDefault();
            list.scrollBy({ left: event.deltaY, behavior: 'smooth' });
        }
    }, { passive: false });
}