/**
 * PlanPilot - Trip Summary Module
 * Trip summary panel and calculations
 */

import { showAlert } from './modals.js';
import { getDistance } from './locations.js';
import { getMap } from './map.js';

// Trip summary state
let tripSummaryVisible = false;
let tripSummaryDraggingRow = null;

/**
 * Parse duration string to hours
 * @param {string} durationStr - Duration string (e.g., "3 days", "2 nights", "4 hours")
 * @returns {number} - Duration in hours
 */
export function parseDurationToHours(durationStr) {
    if (!durationStr || typeof durationStr !== 'string') return 8; // Default to 8 hours
    
    const str = durationStr.toLowerCase().trim();
    
    // Days
    if (str.includes('day')) {
        const match = str.match(/(\d+\.?\d*)\s*day/);
        if (match) return parseFloat(match[1]) * 24;
    }
    
    // Weeks
    if (str.includes('week')) {
        const match = str.match(/(\d+\.?\d*)\s*week/);
        if (match) return parseFloat(match[1]) * 24 * 7;
    }
    
    // Nights
    if (str.includes('night')) {
        const match = str.match(/(\d+\.?\d*)\s*night/);
        if (match) return parseFloat(match[1]) * 24;
    }
    
    // Hours
    if (str.includes('hour')) {
        const match = str.match(/(\d+\.?\d*)\s*hour/);
        if (match) return parseFloat(match[1]);
    }
    
    // Minutes (convert to hours)
    if (str.includes('minute') || str.includes('min')) {
        const match = str.match(/(\d+\.?\d*)\s*(minute|min)/);
        if (match) return parseFloat(match[1]) / 60;
    }
    
    // Half day
    if (str.includes('half day')) return 4;
    
    // Full day
    if (str.includes('full day')) return 8;
    
    return 8; // Default
}

/**
 * Format duration for display
 * @param {string} durationStr - Duration string
 * @returns {string} - Formatted duration or dash if empty
 */
export function formatTripSummaryDuration(durationStr) {
    if (durationStr && durationStr.trim() !== '') {
        return durationStr;
    }
    return '—';
}

/**
 * Get associated accommodations and attractions for a key location
 * @param {Object} baseLocation - The key location
 * @param {Array} locations - All locations
 * @returns {Object} - Object with accommodations and attractions arrays
 */
export function getAssociatedItems(baseLocation, locations) {
    if (!baseLocation) {
        return { accommodations: [], attractions: [] };
    }

    const associatedItems = locations.filter(item => {
        if (item.id === baseLocation.id || item.type === 'key-location') return false;

        if (typeof baseLocation.order === 'number' && typeof item.order === 'number') {
            const orderDiff = Math.abs(item.order - baseLocation.order);
            if (orderDiff <= 10) return true;
        }

        const distance = getDistance(baseLocation.lat, baseLocation.lng, item.lat, item.lng);
        return distance < 50;
    });

    return {
        accommodations: associatedItems.filter(item => item.type === 'accommodation'),
        attractions: associatedItems.filter(item => item.type === 'attraction')
    };
}

/**
 * Update trip summary display
 * @param {Array} locations - All locations
 * @param {Object} tripData - Trip metadata (arrival_location, departure_location)
 * @param {Function} deleteCallback - Callback for delete actions
 * @param {Function} saveCallback - Callback to save changes
 * @param {Function} updateListCallback - Callback to update locations list
 */
export function updateTripSummary(locations, tripData, deleteCallback, saveCallback, updateListCallback) {
    console.log('updateTripSummary called, total locations:', locations.length);
    const container = document.getElementById('trip-summary-container');
    const durationEl = document.getElementById('trip-summary-duration');
    const travelEl = document.getElementById('trip-summary-travel');
    const locationsEl = document.getElementById('trip-summary-locations');
    
    if (!container || !durationEl || !travelEl || !locationsEl) {
        console.log('Trip summary elements not found');
        return;
    }
    
    // Only show trip summary if we have key locations with durations
    const keyLocations = locations.filter(loc => 
        loc.type === 'key-location' && 
        loc.duration && 
        loc.duration.trim() !== ''
    );
    
    console.log('Key locations with durations:', keyLocations.length);
    
    if (keyLocations.length === 0) {
        console.log('No key locations with durations found');
        durationEl.textContent = '';
        travelEl.innerHTML = '';
        travelEl.style.display = 'none';
        locationsEl.innerHTML = '<p style="text-align: center; color: #999; padding: 20px;">No trip data available</p>';
        return;
    }
    
    // Sort by order
    const sortedLocations = [...keyLocations].sort((a, b) => {
        const orderA = typeof a.order === 'number' ? a.order : 999999;
        const orderB = typeof b.order === 'number' ? b.order : 999999;
        return orderA - orderB;
    });
    
    // Calculate total duration
    let totalHours = 0;
    sortedLocations.forEach(loc => {
        totalHours += parseDurationToHours(loc.duration);
    });
    
    const totalDays = Math.ceil(totalHours / 24);
    let durationText = '';
    if (totalDays <= 1) {
        durationText = '📅 Total Duration: 1 Day';
    } else if (totalDays <= 7) {
        durationText = `📅 Total Duration: ${totalDays} Days`;
    } else {
        const weeks = Math.floor(totalDays / 7);
        const days = totalDays % 7;
        durationText = weeks === 1 
            ? `📅 Total Duration: 1 Week${days > 0 ? ' + ' + days + ' Days' : ''}` 
            : `📅 Total Duration: ${weeks} Weeks${days > 0 ? ' + ' + days + ' Days' : ''}`;
    }
    durationEl.textContent = durationText;
    
    // Show travel to/from information
    const firstLocation = sortedLocations[0];
    const lastLocation = sortedLocations[sortedLocations.length - 1];
    
    let travelHtml = '';
    if (tripData.arrival_location && tripData.arrival_location.trim() !== '') {
        travelHtml += `<p>✈️ <strong>Travel to:</strong> ${tripData.arrival_location} → ${firstLocation.name}</p>`;
    }
    if (tripData.departure_location && tripData.departure_location.trim() !== '') {
        travelHtml += `<p>✈️ <strong>Travel from:</strong> ${lastLocation.name} → ${tripData.departure_location}</p>`;
    }
    
    if (travelHtml) {
        travelEl.innerHTML = travelHtml;
        travelEl.style.display = 'block';
    } else {
        travelEl.style.display = 'none';
    }
    
    // Render key locations as draggable table rows
    locationsEl.innerHTML = '';
    
    const table = document.createElement('table');
    table.className = 'trip-summary-table';
    table.innerHTML = `
        <thead>
            <tr>
                <th>#</th>
                <th>Location</th>
                <th>Duration</th>
                <th>Nearby stays & attractions</th>
                <th></th>
            </tr>
        </thead>
        <tbody></tbody>
    `;

    const tbody = table.querySelector('tbody');

    sortedLocations.forEach((loc, index) => {
        const { accommodations, attractions } = getAssociatedItems(loc, locations);
        const notesParts = [];

        if (accommodations.length > 0) {
            notesParts.push(`🏨 ${accommodations.map(acc => acc.name).join(', ')}`);
        }

        if (attractions.length > 0) {
            notesParts.push(`⭐ ${attractions.map(attr => attr.name).join(', ')}`);
        }

        const notesHtml = notesParts.length > 0
            ? notesParts.map(text => `<span>${text}</span>`).join('')
            : `<span class="trip-summary-empty-note">No nearby stays or attractions</span>`;

        const row = document.createElement('tr');
        row.className = 'trip-summary-row';
        row.dataset.locationId = loc.id;
        row.draggable = true;
        row.innerHTML = `
            <td class="trip-summary-order">${index + 1}</td>
            <td>
                <div class="trip-summary-location-name">${loc.name}</div>
                ${loc.description ? `<div class="trip-summary-location-description">${loc.description}</div>` : ''}
            </td>
            <td class="trip-summary-duration-cell">${formatTripSummaryDuration(loc.duration)}</td>
            <td>
                <div class="trip-summary-notes">
                    ${notesHtml}
                </div>
            </td>
            <td class="trip-summary-actions">
                <button class="trip-summary-delete-btn" data-id="${loc.id}">Delete</button>
            </td>
        `;

        attachTripSummaryRowEvents(row, locations, saveCallback, updateListCallback);
        tbody.appendChild(row);
    });

    locationsEl.appendChild(table);
    
    console.log('Trip summary content updated successfully');
}

/**
 * Attach drag and drop events to a trip summary row
 * @param {HTMLElement} row - The table row element
 * @param {Array} locations - All locations
 * @param {Function} saveCallback - Callback to save changes
 * @param {Function} updateListCallback - Callback to update locations list
 */
function attachTripSummaryRowEvents(row, locations, saveCallback, updateListCallback) {
    row.addEventListener('dragstart', handleTripSummaryDragStart);
    row.addEventListener('dragover', handleTripSummaryDragOver);
    row.addEventListener('drop', handleTripSummaryDrop);
    row.addEventListener('dragend', (event) => handleTripSummaryDragEnd(event, locations, saveCallback, updateListCallback));
}

function handleTripSummaryDragStart(event) {
    tripSummaryDraggingRow = event.currentTarget;
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', event.currentTarget.dataset.locationId || '');
    event.currentTarget.classList.add('dragging');
}

function handleTripSummaryDragOver(event) {
    event.preventDefault();
    if (!tripSummaryDraggingRow) return;

    const targetRow = event.currentTarget;
    if (!targetRow || targetRow === tripSummaryDraggingRow) return;

    const tbody = targetRow.parentElement;
    if (!tbody) return;

    const bounding = targetRow.getBoundingClientRect();
    const offset = event.clientY - bounding.top;

    if (offset < bounding.height / 2) {
        tbody.insertBefore(tripSummaryDraggingRow, targetRow);
    } else {
        tbody.insertBefore(tripSummaryDraggingRow, targetRow.nextSibling);
    }
}

function handleTripSummaryDrop(event) {
    event.preventDefault();
}

function handleTripSummaryDragEnd(event, locations, saveCallback, updateListCallback) {
    event.currentTarget.classList.remove('dragging');

    const tbody = event.currentTarget.parentElement;
    if (!tbody) {
        tripSummaryDraggingRow = null;
        return;
    }

    const orderedIds = Array.from(tbody.querySelectorAll('tr')).map(row => row.dataset.locationId);
    tripSummaryDraggingRow = null;
    applyTripSummaryRowOrder(orderedIds, locations, saveCallback, updateListCallback);
}

/**
 * Apply new order to locations after drag and drop
 * @param {Array} idOrder - Array of location IDs in new order
 * @param {Array} locations - All locations
 * @param {Function} saveCallback - Callback to save changes
 * @param {Function} updateListCallback - Callback to update locations list
 */
function applyTripSummaryRowOrder(idOrder, locations, saveCallback, updateListCallback) {
    if (!Array.isArray(idOrder) || idOrder.length === 0) {
        return;
    }

    idOrder.forEach((id, index) => {
        const location = locations.find(loc => loc.id === id);
        if (location) {
            location.order = index + 1;
        }
    });

    if (updateListCallback) updateListCallback();
    if (saveCallback) saveCallback();
}

/**
 * Toggle trip summary visibility
 * @param {Array} locations - All locations
 * @param {Object} tripData - Trip metadata
 * @param {Function} deleteCallback - Callback for delete actions
 * @param {Function} saveCallback - Callback to save changes
 * @param {Function} updateListCallback - Callback to update locations list
 */
export function toggleTripSummary(locations, tripData, deleteCallback, saveCallback, updateListCallback) {
    // Only toggle if we have key locations
    const keyLocations = locations.filter(loc => 
        loc.type === 'key-location' && 
        loc.duration && 
        loc.duration.trim() !== ''
    );
    
    if (keyLocations.length === 0) {
        showAlert('No trip locations found. Add key locations with durations to see the trip summary.', 'Trip Summary');
        return;
    }
    
    tripSummaryVisible = !tripSummaryVisible;
    const container = document.getElementById('trip-summary-container');
    
    if (tripSummaryVisible) {
        // Update the summary content before showing it
        updateTripSummary(locations, tripData, deleteCallback, saveCallback, updateListCallback);
        container.classList.add('visible');
    } else {
        container.classList.remove('visible');
    }
}

/**
 * Show location details modal
 * @param {string} locationId - Location ID
 * @param {Array} locations - All locations
 * @param {Object} markers - Markers object
 */
export function showLocationDetails(locationId, locations, markers) {
    const map = getMap();
    
    // Find the location
    const location = locations.find(l => l.id === locationId);
    if (!location) return;
    
    const { accommodations, attractions } = getAssociatedItems(location, locations);
    
    // Build modal content
    const modal = document.getElementById('locationDetailsModal');
    const title = document.getElementById('locationDetailsTitle');
    const content = document.getElementById('locationDetailsContent');
    
    title.textContent = `📍 ${location.name}`;
    
    let html = '';
    
    // Accommodations section
    html += '<div class="location-details-section">';
    html += '<h3>🏨 Accommodations</h3>';
    if (accommodations.length > 0) {
        html += '<table class="location-details-table">';
        html += '<thead><tr><th>Name</th><th>Description</th><th>Duration</th><th>Price</th><th>Link</th></tr></thead>';
        html += '<tbody>';
        accommodations.forEach(acc => {
            html += '<tr>';
            html += `<td class="table-name">${acc.name}</td>`;
            html += `<td>${acc.description || '-'}</td>`;
            html += `<td>${acc.duration || '-'}</td>`;
            html += `<td>${acc.price || '-'}</td>`;
            html += `<td class="table-link">${acc.link ? `<a href="${acc.link}" target="_blank">View</a>` : '-'}</td>`;
            html += '</tr>';
        });
        html += '</tbody></table>';
    } else {
        html += '<div class="location-details-empty">No accommodations found for this location</div>';
    }
    html += '</div>';
    
    // Attractions section
    html += '<div class="location-details-section">';
    html += '<h3>⭐ Attractions</h3>';
    if (attractions.length > 0) {
        html += '<table class="location-details-table">';
        html += '<thead><tr><th>Name</th><th>Description</th><th>Duration</th><th>Price</th><th>Link</th></tr></thead>';
        html += '<tbody>';
        attractions.forEach(attr => {
            html += '<tr>';
            html += `<td class="table-name">${attr.name}</td>`;
            html += `<td>${attr.description || '-'}</td>`;
            html += `<td>${attr.duration || '-'}</td>`;
            html += `<td>${attr.price || '-'}</td>`;
            html += `<td class="table-link">${attr.link ? `<a href="${attr.link}" target="_blank">View</a>` : '-'}</td>`;
            html += '</tr>';
        });
        html += '</tbody></table>';
    } else {
        html += '<div class="location-details-empty">No attractions found for this location</div>';
    }
    html += '</div>';
    
    content.innerHTML = html;
    modal.classList.add('active');
    
    // Focus on the location on the map
    if (markers[locationId]) {
        map.setView([location.lat, location.lng], 12, {
            animate: true,
            duration: 1
        });
    }
}

