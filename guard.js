/**
 * ====================================================
 * EL PAREDÓN GUARD REPORT
 * Professional daily snapshot for beach patrol / ocean rescue
 * Dual-unit display (metric + imperial)
 * ====================================================
 */

const GUARD_CONFIG = {
    location: { lat: 14.43, lon: -91.70 },
    marineUrl: 'https://marine-api.open-meteo.com/v1/marine',
    weatherUrl: 'https://api.open-meteo.com/v1/forecast',
    marineParams: 'wave_height,wave_direction,wave_period,sea_level_height_msl,sea_surface_temperature',
    weatherParams: 'wind_speed_10m,temperature_2m,wind_direction_10m,weathercode,' +
                   'relative_humidity_2m,dew_point_2m,pressure_msl,visibility,apparent_temperature',
    weatherDailyParams: 'sunrise,sunset,weathercode,temperature_2m_max,temperature_2m_min,' +
                       'wind_speed_10m_max,precipitation_sum'
};

// ============================================
// DUAL-UNIT FORMATTERS
// Shows both metric and imperial simultaneously
// ============================================

function dualWave(meters) {
    if (meters == null || isNaN(meters)) return '--';
    return `${meters.toFixed(1)}m (${(meters * 3.28084).toFixed(1)}ft)`;
}

function dualWind(kmh) {
    if (kmh == null || isNaN(kmh)) return '--';
    return `${Math.round(kmh)} km/h (${Math.round(kmh * 0.621371)} mph)`;
}

function dualTemp(celsius) {
    if (celsius == null || isNaN(celsius)) return '--';
    return `${Math.round(celsius)}°C (${Math.round((celsius * 9/5) + 32)}°F)`;
}

function dualPressure(mb) {
    if (mb == null || isNaN(mb)) return '--';
    const inches = (mb * 0.02953).toFixed(2);
    return `${Math.round(mb)} mb (${inches} in)`;
}

function dualDistance(meters) {
    if (meters == null || isNaN(meters)) return '--';
    const km = (meters / 1000).toFixed(1);
    const miles = (meters / 1609.34).toFixed(1);
    return `${km} km (${miles} mi)`;
}

function getCardinalDirection(degrees) {
    if (!degrees || degrees === '--') return '?';
    const dirs = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE',
                  'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
    const index = Math.round((degrees % 360) / 22.5) % 16;
    return dirs[index];
}

// Use 16-point compass for more precision on the guard page

function getCurrentHourIndex(timeArray) {
    const nowMs = Date.now();
    let bestIdx = 0;
    let bestDiff = Infinity;
    for (let i = 0; i < timeArray.length; i++) {
        const diff = Math.abs(new Date(timeArray[i]).getTime() - nowMs);
        if (diff < bestDiff) {
            bestDiff = diff;
            bestIdx = i;
        }
    }
    return bestIdx;
}

function formatTime(date) {
    return date.toLocaleString('es-GT', {
        weekday: 'short', day: '2-digit', month: 'short',
        hour: '2-digit', minute: '2-digit', hour12: false
    });
}

function formatHour(timeString) {
    return new Date(timeString).toLocaleTimeString('es-GT', {
        hour: '2-digit', minute: '2-digit', hour12: false
    });
}

// ============================================
// API FETCHERS
// ============================================

async function fetchMarineData() {
    const params = new URLSearchParams({
        latitude: GUARD_CONFIG.location.lat,
        longitude: GUARD_CONFIG.location.lon,
        hourly: GUARD_CONFIG.marineParams,
        timezone: 'America/Guatemala'
    });
    const response = await fetch(`${GUARD_CONFIG.marineUrl}?${params}`);
    if (!response.ok) throw new Error(`Error API marina: ${response.status}`);
    return response.json();
}

async function fetchWeatherData() {
    const params = new URLSearchParams({
        latitude: GUARD_CONFIG.location.lat,
        longitude: GUARD_CONFIG.location.lon,
        hourly: GUARD_CONFIG.weatherParams,
        daily: GUARD_CONFIG.weatherDailyParams,
        timezone: 'America/Guatemala'
    });
    const response = await fetch(`${GUARD_CONFIG.weatherUrl}?${params}`);
    if (!response.ok) throw new Error(`Error API clima: ${response.status}`);
    return response.json();
}

// ============================================
// WEATHER CODE MAP
// ============================================

const WEATHER_MAP = {
    0: { text: 'Soleado', icon: '☀️' },
    1: { text: 'Mayormente despejado', icon: '🌤️' },
    2: { text: 'Parcialmente nublado', icon: '⛅' },
    3: { text: 'Nublado', icon: '☁️' },
    45: { text: 'Niebla', icon: '🌫️' },
    48: { text: 'Niebla con escarcha', icon: '🌫️' },
    51: { text: 'Llovizna ligera', icon: '🌦️' },
    53: { text: 'Llovizna moderada', icon: '🌦️' },
    55: { text: 'Llovizna intensa', icon: '🌧️' },
    56: { text: 'Llovizna helada', icon: '🌧️' },
    57: { text: 'Llovizna helada intensa', icon: '🌧️' },
    61: { text: 'Lluvia ligera', icon: '🌧️' },
    63: { text: 'Lluvia moderada', icon: '🌧️' },
    65: { text: 'Lluvia intensa', icon: '☔' },
    66: { text: 'Lluvia helada', icon: '🌧️' },
    67: { text: 'Lluvia helada intensa', icon: '☔' },
    71: { text: 'Nieve ligera', icon: '🌨️' },
    73: { text: 'Nieve moderada', icon: '🌨️' },
    75: { text: 'Nieve intensa', icon: '❄️' },
    77: { text: 'Granos de nieve', icon: '🌨️' },
    80: { text: 'Chubascos', icon: '🌦️' },
    81: { text: 'Chubascos moderados', icon: '🌧️' },
    82: { text: 'Chubascos violentos', icon: '⛈️' },
    85: { text: 'Chubascos de nieve', icon: '🌨️' },
    86: { text: 'Chubascos de nieve intensos', icon: '❄️' },
    95: { text: 'Tormenta eléctrica', icon: '⚡' },
    96: { text: 'Tormenta con granizo', icon: '⛈️' },
    99: { text: 'Tormenta severa con granizo', icon: '⛈️' }
};

// Codes that constitute "events" for the weather log
const EVENT_CODES = [45, 48, 51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82, 95, 96, 99];

// ============================================
// RENDER FUNCTIONS
// ============================================

function renderSnapshot(weather, marine) {
    const wHourly = weather.hourly;
    const mHourly = marine.hourly;
    const idx = getCurrentHourIndex(wHourly.time);

    document.getElementById('wave-height').textContent =
        dualWave(mHourly.wave_height?.[idx]);
    document.getElementById('wind-speed').textContent =
        dualWind(wHourly.wind_speed_10m?.[idx]);
    document.getElementById('air-temp').textContent =
        dualTemp(wHourly.temperature_2m?.[idx]);
    document.getElementById('humidity').textContent =
        `${wHourly.relative_humidity_2m?.[idx] ?? '--'}%`;
    document.getElementById('barometer').textContent =
        dualPressure(wHourly.pressure_msl?.[idx]);
    document.getElementById('dewpoint').textContent =
        dualTemp(wHourly.dew_point_2m?.[idx]);
    document.getElementById('visibility').textContent =
        dualDistance(wHourly.visibility?.[idx]);
    document.getElementById('heat-index').textContent =
        dualTemp(wHourly.apparent_temperature?.[idx]);
}

function renderOceanDetail(weather, marine) {
    const wHourly = weather.hourly;
    const mHourly = marine.hourly;
    const idx = getCurrentHourIndex(wHourly.time);

    const waveDir = mHourly.wave_direction?.[idx];
    const waveDirCardinal = getCardinalDirection(waveDir);
    document.getElementById('wave-direction').textContent =
        `${Math.round(waveDir) || '--'}° ${waveDirCardinal}`;

    document.getElementById('wave-period').textContent =
        `${mHourly.wave_period?.[idx]?.toFixed(1) || '--'} s`;

    // Wind type classification
    const windDir = wHourly.wind_direction_10m?.[idx];
    const windSpd = wHourly.wind_speed_10m?.[idx];
    let windLabel, windClass;
    if (windSpd < 10) {
        windLabel = 'Ventolina suave';
        windClass = 'moderate';
    } else if (windDir >= 150 && windDir <= 270) {
        windLabel = 'Onshore (de mar)';
        windClass = 'challenging';
    } else {
        windLabel = 'Offshore (de tierra)';
        windClass = 'favorable';
    }
    const windTypeEl = document.getElementById('wind-type');
    windTypeEl.textContent = windLabel;
    windTypeEl.className = 'metric-value ' + windClass;

    document.getElementById('water-temp').textContent =
        dualTemp(mHourly.sea_surface_temperature?.[idx]);
}

function drawBarChart(svgElement, waveData, currentIdx, type = 'wave') {
    if (!svgElement || !waveData || waveData.length === 0) return;

    const svgNS = 'http://www.w3.org/2000/svg';
    while (svgElement.firstChild) {
        svgElement.removeChild(svgElement.firstChild);
    }

    const width = 280;
    const height = 50;
    const labelArea = 14;
    const chartHeight = height - labelArea;
    const padding = 3;
    const barGap = 1.5;

    const minVal = Math.min(...waveData);
    const maxVal = Math.max(...waveData);
    const range = Math.max(maxVal - minVal, 0.3);

    const availableWidth = width - padding * 2;
    const barWidth = (availableWidth - (barGap * (waveData.length - 1))) / waveData.length;

    waveData.forEach((h, idx) => {
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

        if (type === 'wave') {
            const rating = h >= 1.5 ? 'good' : h >= 0.8 ? 'moderate' : 'poor';
            rect.setAttribute('fill',
                rating === 'good' ? '#10b981' :
                rating === 'moderate' ? '#f59e0b' : '#ef4444');
        } else {
            // Tide: color by rising/falling
            const next = waveData[Math.min(idx + 1, waveData.length - 1)];
            rect.setAttribute('fill', next > h ? '#0ea5e9' : '#7dd3fc');
        }

        svgElement.appendChild(rect);
    });

    // Current hour marker
    if (currentIdx != null && currentIdx < waveData.length) {
        const lineX = padding + currentIdx * (barWidth + barGap) + (barWidth / 2);
        const line = document.createElementNS(svgNS, 'line');
        line.setAttribute('x1', lineX);
        line.setAttribute('y1', 0);
        line.setAttribute('x2', lineX);
        line.setAttribute('y2', chartHeight);
        line.setAttribute('stroke', '#ef4444');
        line.setAttribute('stroke-width', '2');
        line.setAttribute('stroke-dasharray', '3,2');
        svgElement.appendChild(line);
    }

    // Time labels
    const labelHours = [
        { idx: 0, label: '00' }, { idx: 6, label: '06' },
        { idx: 12, label: '12' }, { idx: 18, label: '18' },
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

    svgElement.setAttribute('viewBox', `0 0 ${width} ${height}`);
}

function renderTideTimes(timeArray, seaLevelArray, startIndex) {
    const container = document.getElementById('tide-times');
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

    if (tides.length === 0) {
        container.innerHTML = '<p class="info-loading">No disponible</p>';
        return;
    }

    container.innerHTML = tides.slice(0, 4).map(tide => {
        const label = tide.type === 'high' ? 'Alta' : 'Baja';
        const ftStr = (tide.height * 3.28084).toFixed(1);
        const rowClass = tide.type === 'high' ? 'tide-high' : 'tide-low';
        return `
            <div class="tide-row ${rowClass}">
                <span class="tide-label">${label}</span>
                <span class="tide-time">${formatHour(tide.time)} (${tide.height.toFixed(2)}m / ${ftStr}ft)</span>
            </div>
        `;
    }).join('');
}

function renderSunTimes(daily) {
    const container = document.getElementById('sun-times');
    if (!daily?.sunrise?.length) {
        container.innerHTML = '<p class="info-loading">No disponible</p>';
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

function renderFiveDayForecast(daily) {
    const container = document.getElementById('forecast-list');
    const days = daily.time.slice(0, 5);

    if (!days.length) {
        container.innerHTML = '<p class="info-loading">No disponible</p>';
        return;
    }

    container.innerHTML = days.map((day, i) => {
        const date = new Date(day);
        const dateStr = date.toLocaleDateString('es-GT', {
            weekday: 'short', day: '2-digit', month: 'short'
        });
        const code = daily.weathercode?.[i] ?? 0;
        const weather = WEATHER_MAP[code] || { text: '--', icon: '❓' };
        const maxWave = daily.temperature_2m_max?.[i] ?? '--';
        const maxTemp = dualTemp(maxWave);
        const minTemp = dualTemp(daily.temperature_2m_min?.[i]);
        const windMax = dualWind(daily.wind_speed_10m_max?.[i]);
        const precip = daily.precipitation_sum?.[i] ?? 0;

        return `
            <div class="forecast-day">
                <div class="forecast-date">${dateStr}</div>
                <div class="forecast-icon">${weather.icon}</div>
                <div class="forecast-desc">${weather.text}</div>
                <div class="forecast-temps">${minTemp} / ${maxTemp}</div>
                <div class="forecast-wind">💨 ${windMax}</div>
                <div class="forecast-precip">🌧️ ${precip.toFixed(1)}mm</div>
            </div>
        `;
    }).join('');
}

function renderWeatherEvents(weatherCodes) {
    const container = document.getElementById('weather-events');
    const events = [];

    weatherCodes.forEach((code, idx) => {
        if (EVENT_CODES.includes(code)) {
            const weather = WEATHER_MAP[code] || { text: `Código ${code}`, icon: '⚠️' };
            events.push({ text: weather.text, icon: weather.icon });
        }
    });

    // Deduplicate
    const unique = [...new Map(events.map(e => [e.text, e])).values()];

    if (unique.length === 0) {
        container.innerHTML = '<li class="info-loading">Sin eventos significativos en las próximas 24 horas</li>';
        return;
    }

    container.innerHTML = unique.map(e =>
        `<li><span class="event-icon">${e.icon}</span> ${e.text}</li>`
    ).join('');
}

// ============================================
// MARINE HAZARD (localStorage based)
// ============================================

const HAZARD_LABELS = {
    none:   { label: 'Ninguno', class: 'hazard-none' },
    low:    { label: 'Bajo',    class: 'hazard-low' },
    medium: { label: 'Medio',   class: 'hazard-medium' },
    high:   { label: 'Alto',    class: 'hazard-high' }
};

function loadHazard() {
    const saved = JSON.parse(localStorage.getItem('guardHazard') || '{}');
    const level = saved.level || 'none';
    const notes = saved.notes || '';
    const date = saved.date || '';

    // Check if it's from today
    const today = new Date().toDateString();
    if (date !== today) {
        // Reset if it's a new day
        document.getElementById('hazard-level').value = 'none';
        document.getElementById('hazard-notes').value = '';
        updateHazardDisplay('none', '');
        return;
    }

    document.getElementById('hazard-level').value = level;
    document.getElementById('hazard-notes').value = notes;
    updateHazardDisplay(level, notes);
}

function updateHazardDisplay(level, notes) {
    const badge = document.getElementById('hazard-badge');
    const summary = document.getElementById('hazard-summary');
    const config = HAZARD_LABELS[level] || HAZARD_LABELS.none;

    badge.className = 'hazard-badge ' + config.class;
    badge.textContent = config.label;

    if (notes) {
        summary.textContent = notes;
        summary.style.display = 'block';
    } else {
        summary.style.display = 'none';
    }
}

function saveHazard() {
    const level = document.getElementById('hazard-level').value;
    const notes = document.getElementById('hazard-notes').value;
    const date = new Date().toDateString();

    localStorage.setItem('guardHazard', JSON.stringify({ level, notes, date }));
    updateHazardDisplay(level, notes);

    // Brief confirmation
    const btn = document.getElementById('save-hazard');
    const originalText = btn.textContent;
    btn.textContent = '✓ Guardado';
    setTimeout(() => { btn.textContent = originalText; }, 2000);
}

// ============================================
// FRESHNESS BADGE
// ============================================

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

// ============================================
// MAIN LOAD
// ============================================

async function loadGuardReport() {
    try {
        const [marine, weather] = await Promise.all([
            fetchMarineData(),
            fetchWeatherData()
        ]);

        const now = new Date();
        document.getElementById('last-updated').textContent =
            `Actualizado: ${formatTime(now)}`;
        document.getElementById('footer-time').textContent = formatTime(now);
        updateFreshnessBadge(now);

        renderSnapshot(weather, marine);
        renderOceanDetail(weather, marine);

        // Charts
        const idx = getCurrentHourIndex(weather.hourly.time);
        const waveSlice = marine.hourly.wave_height.slice(0, 24);
        const tideSlice = marine.hourly.sea_level_height_msl.slice(0, 24);
        const tideIdx = Math.min(idx, tideSlice.length - 1);

        drawBarChart(document.getElementById('wave-bar-chart'), waveSlice, idx, 'wave');
        drawBarChart(document.getElementById('tide-bar-chart'), tideSlice, tideIdx, 'tide');

        // Tide & Sun
        renderTideTimes(marine.hourly.time, marine.hourly.sea_level_height_msl, idx);
        renderSunTimes(weather.daily);

        // 5-day forecast
        renderFiveDayForecast(weather.daily);

        // Weather events (scan next 24 hours of codes)
        const codes = weather.hourly.weathercode.slice(idx, idx + 24);
        renderWeatherEvents(codes);

    } catch (error) {
        console.error('Error cargando informe:', error);
        document.getElementById('last-updated').textContent =
            '⚠️ Error cargando datos';
    }
}

// ============================================
// INIT
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    // Load theme preference
    const saved = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', saved);

    // Load hazard from localStorage
    loadHazard();

    // Attach listeners
    document.getElementById('refresh-btn').addEventListener('click', loadGuardReport);
    document.getElementById('save-hazard').addEventListener('click', saveHazard);

    // Load data
    loadGuardReport();
});
