/**
 * PlanPilot - Map Module
 * Leaflet map setup and layer management
 */

import { MAP_CONFIG } from './config.js';

// Map instance and layers
let map = null;
let currentMapLayer = null;

// Map tile layers
const layers = {};

/**
 * Initialize the Leaflet map
 * @returns {L.Map} - The map instance
 */
export function initMap() {
    map = L.map('map', {
        center: MAP_CONFIG.CENTER,
        zoom: MAP_CONFIG.ZOOM,
        minZoom: MAP_CONFIG.MIN_ZOOM,
        maxZoom: MAP_CONFIG.MAX_ZOOM,
        worldCopyJump: true
    });
    
    // Define different map layers
    layers.street = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19,
        noWrap: false
    });

    layers.satellite = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: '© Esri',
        maxZoom: 19,
        noWrap: false
    });

    layers.topo = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenTopoMap contributors',
        maxZoom: 17,
        noWrap: false
    });

    layers.light = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '© OpenStreetMap, © CARTO',
        maxZoom: 19,
        noWrap: false
    });

    layers.dark = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '© OpenStreetMap, © CARTO',
        maxZoom: 19,
        noWrap: false
    });

    // Add default layer (Light map)
    currentMapLayer = layers.light;
    currentMapLayer.addTo(map);
    
    return map;
}

/**
 * Get the map instance
 * @returns {L.Map} - The map instance
 */
export function getMap() {
    return map;
}

/**
 * Change the map style/layer
 * @param {string} style - Map style (light, street, satellite, topo, dark)
 */
export function changeMapStyle(style) {
    if (!map) return;
    
    // Remove current layer
    if (currentMapLayer) {
        map.removeLayer(currentMapLayer);
    }
    
    // Add new layer based on selection
    switch(style) {
        case 'light':
            currentMapLayer = layers.light;
            document.getElementById('styleLight').checked = true;
            break;
        case 'street':
            currentMapLayer = layers.street;
            document.getElementById('styleStreet').checked = true;
            break;
        case 'satellite':
            currentMapLayer = layers.satellite;
            document.getElementById('styleSatellite').checked = true;
            break;
        case 'topo':
            currentMapLayer = layers.topo;
            document.getElementById('styleTopo').checked = true;
            break;
        case 'dark':
            currentMapLayer = layers.dark;
            document.getElementById('styleDark').checked = true;
            break;
    }
    
    currentMapLayer.addTo(map);
}

/**
 * Set map view to specific coordinates
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @param {number} zoom - Zoom level
 * @param {Object} options - Animation options
 */
export function setMapView(lat, lng, zoom = 12, options = {}) {
    if (map) {
        map.setView([lat, lng], zoom, options);
    }
}

// Map controls panel state
let mapControlsVisible = false;

/**
 * Toggle map controls panel visibility
 */
export function toggleMapControls() {
    mapControlsVisible = !mapControlsVisible;
    const panel = document.getElementById('map-controls-panel');
    const toggleBtn = document.getElementById('map-controls-toggle-btn');
    
    if (mapControlsVisible) {
        panel.classList.add('visible');
        if (toggleBtn) {
            toggleBtn.style.display = 'none';
        }
    } else {
        panel.classList.remove('visible');
        if (toggleBtn) {
            toggleBtn.style.display = 'block';
        }
    }
}


