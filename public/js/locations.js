/**
 * PlanPilot - Locations Module
 * Location CRUD operations
 */

import { getMap } from './map.js';
import { createCustomIcon, createPopupContent } from './markers.js';
import { isTypeVisible } from './filters.js';
import { isConnectionMode, handleConnectionClick } from './connections.js';
import { showAlert, showConfirm } from './modals.js';
import { closeSidebar } from './ui.js';

/**
 * Add a marker to the map for a location
 * @param {Object} location - Location object
 * @param {Object} markers - Object to store marker references
 * @param {Array} locations - Array of all locations (for connection handling)
 * @param {Array} connections - Array of connections
 * @param {Object} connectionLines - Object mapping connection IDs to polylines
 * @param {Function} saveCallback - Callback to save data
 */
export function addMarker(location, markers, locations, connections, connectionLines, saveCallback) {
    const map = getMap();
    
    const marker = L.marker([location.lat, location.lng], {
        icon: createCustomIcon(location.type)
    });

    // Only add to map if filter allows it
    if (isTypeVisible(location.type)) {
        marker.addTo(map);
    }

    const popupContent = createPopupContent(location);
    
    marker.bindPopup(popupContent, {
        maxWidth: 350,
        className: 'custom-popup'
    });
    
    // Handle connection mode clicks
    marker.on('click', function() {
        if (isConnectionMode() && location.type === 'key-location') {
            handleConnectionClick(location, markers, connections, connectionLines, locations, saveCallback);
        }
    });

    markers[location.id] = marker;
}

/**
 * Add a new location from form inputs
 * @param {Object} state - Application state object
 * @param {Function} updateCallbacks - Object with update callbacks
 */
export function addLocation(state, updateCallbacks) {
    const type = document.getElementById('locationType').value;
    const name = document.getElementById('locationName').value.trim();
    const description = document.getElementById('locationDescription').value.trim();
    const price = document.getElementById('locationPrice').value.trim();
    const link = document.getElementById('locationLink').value.trim();
    
    if (!name) {
        showAlert('Please enter a location name', 'Missing Information');
        return;
    }
    
    if (!state.selectedCoords) {
        showAlert('Please click on the map to set coordinates', 'Missing Coordinates');
        return;
    }

    const location = {
        id: Date.now().toString(),
        type: type,
        name: name,
        description: description,
        price: price,
        link: link,
        lat: state.selectedCoords.lat,
        lng: state.selectedCoords.lng
    };

    state.locations.push(location);
    addMarker(location, state.markers, state.locations, state.connections, state.connectionLines, updateCallbacks.save);
    
    if (updateCallbacks.updateList) updateCallbacks.updateList();
    if (updateCallbacks.updateFilters) updateCallbacks.updateFilters();
    if (updateCallbacks.updateTripSummary) updateCallbacks.updateTripSummary();
    if (updateCallbacks.save) updateCallbacks.save();
    
    // Clear form
    document.getElementById('locationName').value = '';
    document.getElementById('locationDescription').value = '';
    document.getElementById('locationPrice').value = '';
    document.getElementById('locationLink').value = '';
    document.getElementById('locationCoords').value = '';
    state.selectedCoords = null;
}

/**
 * Focus on a location (pan map and open popup)
 * @param {string} id - Location ID
 * @param {Array} locations - Array of locations
 * @param {Object} markers - Object mapping location IDs to markers
 */
export function focusLocation(id, locations, markers) {
    const map = getMap();
    const location = locations.find(l => l.id === id);
    
    if (location) {
        map.setView([location.lat, location.lng], 12);
        markers[id].openPopup();
        
        // Close sidebar on mobile after viewing location
        if (window.innerWidth < 768) {
            setTimeout(closeSidebar, 300);
        }
    }
}

/**
 * Delete a location
 * @param {string} id - Location ID
 * @param {Object} state - Application state object
 * @param {Function} updateCallbacks - Object with update callbacks
 */
export async function deleteLocation(id, state, updateCallbacks) {
    const map = getMap();
    console.log('deleteLocation called with ID:', id);
    console.log('Current locations:', state.locations);
    
    const confirmed = await showConfirm('Are you sure you want to delete this location?', 'Delete Location');
    
    if (!confirmed) {
        console.log('User cancelled deletion');
        return;
    }

    console.log('User confirmed deletion');

    // Remove connections
    state.connections = state.connections.filter(conn => {
        if (conn.from === id || conn.to === id) {
            if (state.connectionLines[conn.id]) {
                map.removeLayer(state.connectionLines[conn.id]);
                delete state.connectionLines[conn.id];
            }
            return false;
        }
        return true;
    });

    // Remove marker
    if (state.markers[id]) {
        console.log('Removing marker for ID:', id);
        map.removeLayer(state.markers[id]);
        delete state.markers[id];
    }

    // Remove location
    const beforeCount = state.locations.length;
    state.locations = state.locations.filter(l => l.id !== id);
    console.log('Locations count before:', beforeCount, 'after:', state.locations.length);
    
    if (updateCallbacks.updateList) updateCallbacks.updateList();
    if (updateCallbacks.updateFilters) updateCallbacks.updateFilters();
    if (updateCallbacks.updateTripSummary) updateCallbacks.updateTripSummary();
    if (updateCallbacks.save) updateCallbacks.save();
    console.log('Delete completed');
}

/**
 * Update the locations list in the sidebar
 * @param {Array} locations - Array of locations
 * @param {Object} visibilityFilters - Current visibility filter states
 * @param {Function} updateClearButton - Callback to update clear button state
 */
export function updateLocationsList(locations, visibilityFilters, updateClearButton) {
    console.log('updateLocationsList called, locations count:', locations.length);
    const list = document.getElementById('locationsList');
    
    if (!list) {
        console.error('locationsList element not found!');
        return;
    }
    
    if (locations.length === 0) {
        console.log('No locations, showing empty message');
        list.innerHTML = '<p style="color: #999; font-size: 13px;">No locations added yet</p>';
        if (updateClearButton) updateClearButton(0);
        return;
    }

    // Filter locations based on visibility filters
    let filteredLocations = locations.filter(loc => visibilityFilters[loc.type]);
    
    if (filteredLocations.length === 0) {
        list.innerHTML = '<p style="color: #999; font-size: 13px;">No locations match current filters</p>';
        if (updateClearButton) updateClearButton(locations.length);
        return;
    }

    // Sort by order if available, otherwise maintain original order
    filteredLocations = filteredLocations.sort((a, b) => {
        const orderA = typeof a.order === 'number' ? a.order : 999999;
        const orderB = typeof b.order === 'number' ? b.order : 999999;
        return orderA - orderB;
    });

    console.log('Generating HTML for', filteredLocations.length, 'filtered locations');
    const html = filteredLocations.map(loc => `
        <div class="item ${loc.type}" data-location-id="${loc.id}">
            <div class="item-header">
                <span class="item-name">${typeof loc.order === 'number' ? `${loc.order}. ` : ''}${loc.name}</span>
                <span class="item-type">${loc.type.replace('-', ' ')}</span>
            </div>
            ${loc.description ? `<div class="item-description">${loc.description}</div>` : ''}
            ${loc.duration ? `<div class="item-description" style="margin-top: 6px;"><strong>⏱️</strong> ${loc.duration}</div>` : ''}
            ${loc.price ? `<div class="item-description" style="margin-top: 6px;"><strong>💰</strong> ${loc.price}</div>` : ''}
            ${loc.link ? `<div class="item-description" style="margin-top: 6px;"><a href="${loc.link}" target="_blank" rel="noopener noreferrer" style="color: #0891D0; text-decoration: none; font-size: 12px;">🔗 View Link</a></div>` : ''}
            <div class="item-actions">
                <button class="item-btn view-btn" data-id="${loc.id}">View</button>
                <button class="item-btn delete delete-btn" data-id="${loc.id}">Delete</button>
            </div>
        </div>
    `).join('');
    
    list.innerHTML = html;
    console.log('List innerHTML updated with', filteredLocations.length, 'location items');
    if (updateClearButton) updateClearButton(locations.length);
}

/**
 * Calculate distance between two points in km
 * @param {number} lat1 - Latitude of first point
 * @param {number} lng1 - Longitude of first point
 * @param {number} lat2 - Latitude of second point
 * @param {number} lng2 - Longitude of second point
 * @returns {number} - Distance in kilometers
 */
export function getDistance(lat1, lng1, lat2, lng2) {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}


