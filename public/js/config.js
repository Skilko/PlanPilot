/**
 * PlanPilot - Configuration
 * Constants, colors, icons, and settings
 */

// Marker colors by location type
export const MARKER_COLORS = {
    'key-location': '#0891D0',
    'accommodation': '#4CAF50',
    'attraction': '#FFA726'
};

// Marker icons by location type
export const MARKER_ICONS = {
    'key-location': '📍',
    'accommodation': '🏨',
    'attraction': '⭐'
};

// Type display names
export const TYPE_NAMES = {
    'key-location': 'Key Location',
    'accommodation': 'Accommodation',
    'attraction': 'Attraction'
};

// Loading overlay settings
export const LOADING_CONFIG = {
    MAX_TIMEOUT: 180 // 180 seconds maximum
};

// Map default settings
export const MAP_CONFIG = {
    CENTER: [20, 0],
    ZOOM: 2,
    MIN_ZOOM: 2,
    MAX_ZOOM: 18
};

// Connection line style
export const CONNECTION_STYLE = {
    color: '#0891D0',
    weight: 3,
    opacity: 0.7,
    dashArray: '10, 10'
};

