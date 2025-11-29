/**
 * PlanPilot - Filters Module
 * Visibility filters and counts for location types
 */

import { getMap } from './map.js';

// Filter visibility state
const visibilityFilters = {
    'key-location': true,
    'accommodation': true,
    'attraction': true
};

/**
 * Get current visibility filters
 * @returns {Object} - Current filter states
 */
export function getVisibilityFilters() {
    return { ...visibilityFilters };
}

/**
 * Check if a location type is visible
 * @param {string} type - Location type
 * @returns {boolean}
 */
export function isTypeVisible(type) {
    return visibilityFilters[type] ?? true;
}

/**
 * Toggle filter checkbox when clicking on row
 * @param {string} checkboxId - The checkbox element ID
 */
export function toggleFilter(checkboxId) {
    const checkbox = document.getElementById(checkboxId);
    checkbox.checked = !checkbox.checked;
}

/**
 * Update filter counts based on locations
 * @param {Array} locations - Array of location objects
 */
export function updateFilterCounts(locations) {
    const counts = {
        'key-location': 0,
        'accommodation': 0,
        'attraction': 0
    };

    locations.forEach(loc => {
        counts[loc.type]++;
    });

    document.getElementById('countKeyLocation').textContent = counts['key-location'];
    document.getElementById('countAccommodation').textContent = counts['accommodation'];
    document.getElementById('countAttraction').textContent = counts['attraction'];
}

/**
 * Apply filters to markers
 * @param {Array} locations - Array of location objects
 * @param {Object} markers - Object mapping location IDs to markers
 * @param {Function} updateListCallback - Callback to update the locations list
 */
export function applyFilters(locations, markers, updateListCallback) {
    const map = getMap();
    
    // Update filter state from checkboxes
    visibilityFilters['key-location'] = document.getElementById('filterKeyLocation').checked;
    visibilityFilters['accommodation'] = document.getElementById('filterAccommodation').checked;
    visibilityFilters['attraction'] = document.getElementById('filterAttraction').checked;

    console.log('Applying filters:', visibilityFilters);

    // Update map markers visibility
    locations.forEach(loc => {
        const marker = markers[loc.id];
        if (marker) {
            if (visibilityFilters[loc.type]) {
                marker.addTo(map);
            } else {
                map.removeLayer(marker);
            }
        }
    });

    // Update sidebar list
    if (updateListCallback) {
        updateListCallback();
    }
    
    // Update counts
    updateFilterCounts(locations);
}




