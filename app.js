/**
 * ====================================================
 * PRONÓSTICO DE SURF EL PAREDÓN
 * ==============================
 * Versión traducida al español con mejoras:
 * - Formato horario 24 horas
 * - Indicador de dirección del viento (tierra/mar)
 * - Soporte mejorado para escritorio
 * ====================================================
 */

const CONFIG = {
    location: {
        lat: 14.43,
        lon: -91.70
    },
    marineUrl: 'https://marine-api.open-meteo.com/v1/marine',
    marineParams: 'wave_height,wave_direction,wave_period',
    weatherUrl: 'https://api.open-meteo.com/v1/forecast',
    weatherParams: 'wind_speed_10m,temperature_2m,wind_direction_10m',
    
    // Para determinar si viento es onshore/offshore
    // El Paredón mira aprox. SO (225°), viento del N/NW/O = ONSHORE, SE/S/E = OFFSHORE
    beachBearing: 225  // grados (dirección que mira la playa)
};

let cachedData = null;
let lastUpdatedTimestamp = null;

// ============================================
// INICIALIZACIÓN
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
        hourly: CONFIG.weatherParams
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

    return marineData;
}

function updateUI(data, isCached = false) {
    const hourly = data.hourly;

    if (!isCached) {
        lastUpdatedTimestamp = new Date();
        document.getElementById('last-updated').textContent =
            `Actualizado: ${formatTime(lastUpdatedTimestamp)}`;
    }

    const currentHourIndex = getCurrentHourIndex(hourly.time);

    // Tarjetas superiores
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

    // NUEVO: Calcular tipo de viento (onshore/offshore)
    const windType = determineWindType(hourly.wind_direction?.[currentHourIndex], hourly.wind_speed?.[currentHourIndex]);
    const windHintElement = document.getElementById('wind-hint');
    const windValueElement = document.getElementById('wind-type');
    
    if (windType) {
        windHintElement.classList.remove('favorable', 'challenging', 'moderate');
        windValueElement.className = 'hint-value ' + windType.class;
        windValueElement.textContent = windType.label;
        windHintElement.style.display = 'flex';
    }

    renderHourlyForecast(hourly, currentHourIndex);
    document.querySelector('.error-message')?.remove();
}

/**
 * Determina si el viento es favorable (offshore) o desafiante (onshore)
 * Para El Paredón (playa mirando SO ~225°):
 * - Viento desde tierra hacia mar = OFFSHORE (ideal) 🟢
 * - Viento desde mar hacia tierra = ONSHORE (picado) 🔴
 */
function determineWindType(windDir, windSpeed) {
    if (!windDir || !windSpeed) return null;

    // Simplificación: viento del norte/noroeste suele ser ONSHORE aquí
    // Viento del sur/sureste suele ser OFFSHORE
    let label, className;
    
    if (windSpeed < 10) {
        label = 'Ventolina suave';
        className = 'moderate';
    } else if (windDir >= 150 && windDir <= 270) {  // S a W
        label = 'Viento de Mar (Onshore)';
        className = 'challenging';
    } else if ((windDir >= 0 && windDir < 150) || (windDir > 270 && windDir <= 360)) {  // N, NE, E
        label = 'Viento de Tierra (Offshore)';
        className = 'favorable';
    } else {
        label = 'Viento variable';
        className = 'moderate';
    }

    return { label, class: className };
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
        item.tabIndex = 0; // Hace que sea navegable con teclado
        
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

        // Click para ver detalles (opcional expansión futura)
        item.addEventListener('click', () => {
            console.log(`Oleaje a las ${hourOnly}: ${waveHeight}m, Viento: ${windSpeed}km/h`);
        });

        container.appendChild(item);
    }
}

/**
 * Formatea hora en 24 horas (ejemplo: 14:00, no 2:00 PM)
 */
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

/**
 * NUEVO: Configurar scroll horizontal mejorado para desktop
 * Permite usar rueda del mouse y flechas del teclado
 */
function setupHorizontalScroll() {
    const list = document.querySelector('.hourly-list');
    if (!list) return;

    // Detectar inicio y fin del scroll para efectos visuales
    list.addEventListener('scroll', () => {
        list.classList.toggle('scrolling-start', list.scrollLeft > 0);
        list.classList.toggle('scrolling-end', 
            list.scrollLeft + list.clientWidth < list.scrollWidth - 5);
    });

    // Permitir scroll con Shift + Rueda vertical
    list.addEventListener('wheel', (event) => {
        if (event.shiftKey) {
            event.preventDefault();
            list.scrollBy({ left: event.deltaY, behavior: 'smooth' });
        }
    }, { passive: false });

    // Navegación con teclas izquierda/derecha en elementos focaleados
    const items = list.querySelectorAll('.hourly-item');
    items.forEach((item, index) => {
        item.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowRight' && index < items.length - 1) {
                items[index + 1].focus();
                items[index + 1].scrollIntoView({ behavior: 'smooth', inline: 'center' });
            } else if (e.key === 'ArrowLeft' && index > 0) {
                items[index - 1].focus();
                items[index - 1].scrollIntoView({ behavior: 'smooth', inline: 'center' });
            }
        });
    });
}