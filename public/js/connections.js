/**
 * PlanPilot - Connections Module
 * Connection management between key locations
 */

import { CONNECTION_STYLE } from './config.js';
import { getMap } from './map.js';
import { showAlert } from './modals.js';

// Connection mode state
let connectionMode = false;
let firstConnectionPoint = null;

/**
 * Start connection mode
 * @param {Array} locations - Array of all locations
 * @param {Function} saveCallback - Callback to save data after connection
 */
export function startConnectionMode(locations) {
    const keyLocations = locations.filter(loc => loc.type === 'key-location');
    if (keyLocations.length < 2) {
        showAlert('You need at least 2 Key Locations to create connections', 'Not Enough Locations');
        return;
    }
    connectionMode = true;
    firstConnectionPoint = null;
    document.getElementById('connectionMode').style.display = 'block';
    getMap().getContainer().style.cursor = 'crosshair';
}

/**
 * Cancel connection mode
 */
export function cancelConnectionMode() {
    connectionMode = false;
    firstConnectionPoint = null;
    document.getElementById('connectionMode').style.display = 'none';
    getMap().getContainer().style.cursor = '';
}

/**
 * Check if connection mode is active
 * @returns {boolean}
 */
export function isConnectionMode() {
    return connectionMode;
}

/**
 * Handle click on a location during connection mode
 * @param {Object} location - The clicked location
 * @param {Object} markers - Object mapping location IDs to markers
 * @param {Array} connections - Array of existing connections
 * @param {Object} connectionLines - Object mapping connection IDs to polylines
 * @param {Array} locations - Array of all locations
 * @param {Function} saveCallback - Callback to save data after connection
 */
export function handleConnectionClick(location, markers, connections, connectionLines, locations, saveCallback) {
    if (!firstConnectionPoint) {
        firstConnectionPoint = location;
        markers[location.id].setZIndexOffset(1000);
        showAlert(`Selected: ${location.name}\n\nNow click on another Key Location to connect them.`, 'Location Selected');
    } else {
        if (firstConnectionPoint.id === location.id) {
            showAlert('Please select a different location', 'Same Location');
            return;
        }
        
        createConnection(firstConnectionPoint, location, connections, connectionLines, locations, saveCallback);
        markers[firstConnectionPoint.id].setZIndexOffset(0);
        cancelConnectionMode();
    }
}

/**
 * Create a connection between two locations
 * @param {Object} loc1 - First location
 * @param {Object} loc2 - Second location
 * @param {Array} connections - Array of existing connections
 * @param {Object} connectionLines - Object mapping connection IDs to polylines
 * @param {Array} locations - Array of all locations
 * @param {Function} saveCallback - Callback to save data after connection
 */
export function createConnection(loc1, loc2, connections, connectionLines, locations, saveCallback) {
    const connectionId = `${loc1.id}-${loc2.id}`;
    const reverseConnectionId = `${loc2.id}-${loc1.id}`;
    
    // Check if connection already exists
    if (connections.find(c => c.id === connectionId || c.id === reverseConnectionId)) {
        showAlert('Connection already exists between these locations', 'Duplicate Connection');
        return;
    }

    const connection = {
        id: connectionId,
        from: loc1.id,
        to: loc2.id
    };

    connections.push(connection);
    drawConnection(connection, locations, connectionLines);
    
    if (saveCallback) {
        saveCallback();
    }
}

/**
 * Draw a connection line on the map
 * @param {Object} connection - Connection object
 * @param {Array} locations - Array of all locations
 * @param {Object} connectionLines - Object mapping connection IDs to polylines
 */
export function drawConnection(connection, locations, connectionLines) {
    const map = getMap();
    const fromLoc = locations.find(l => l.id === connection.from);
    const toLoc = locations.find(l => l.id === connection.to);

    if (!fromLoc || !toLoc) return;

    const line = L.polyline(
        [[fromLoc.lat, fromLoc.lng], [toLoc.lat, toLoc.lng]],
        CONNECTION_STYLE
    ).addTo(map);

    connectionLines[connection.id] = line;
}

/**
 * Remove a connection line from the map
 * @param {string} connectionId - The connection ID
 * @param {Object} connectionLines - Object mapping connection IDs to polylines
 */
export function removeConnectionLine(connectionId, connectionLines) {
    const map = getMap();
    if (connectionLines[connectionId]) {
        map.removeLayer(connectionLines[connectionId]);
        delete connectionLines[connectionId];
    }
}

/**
 * Clear all connection lines from the map
 * @param {Object} connectionLines - Object mapping connection IDs to polylines
 */
export function clearAllConnectionLines(connectionLines) {
    const map = getMap();
    Object.values(connectionLines).forEach(line => {
        try {
            map.removeLayer(line);
        } catch (e) {
            console.error('Error removing line:', e);
        }
    });
    // Clear the object
    Object.keys(connectionLines).forEach(key => delete connectionLines[key]);
}

