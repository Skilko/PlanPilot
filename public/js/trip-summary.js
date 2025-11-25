/**
 * PlanPilot - Trip Summary Module
 * Trip summary panel and calculations - Redesigned with card-based timeline
 */

import { showAlert } from './modals.js';
import { getDistance } from './locations.js';
import { getMap } from './map.js';

// Trip summary state
let tripSummaryVisible = false;
let tripSummaryDraggingCard = null;

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
 * Format days for stats display
 * @param {number} totalDays - Total days
 * @returns {string} - Formatted string
 */
function formatDaysForStats(totalDays) {
    if (totalDays <= 7) {
        return `${totalDays}`;
    } else {
        const weeks = Math.floor(totalDays / 7);
        const days = totalDays % 7;
        if (days === 0) {
            return `${weeks}w`;
        }
        return `${weeks}w ${days}d`;
    }
}

/**
 * Create a nearby item element
 * @param {Object} item - The item (accommodation or attraction)
 * @param {string} type - 'accommodation' or 'attraction'
 * @returns {HTMLElement} - The item element
 */
function createNearbyItemElement(item, type) {
    const itemEl = document.createElement('div');
    itemEl.className = 'trip-summary-nearby-item';
    
    const icon = type === 'accommodation' ? '🏨' : '⭐';
    const iconClass = type === 'accommodation' ? 'accommodation' : 'attraction';
    
    let detailsHtml = '';
    if (item.duration) {
        detailsHtml += `<span>${item.duration}</span>`;
    }
    if (item.price) {
        detailsHtml += `<span class="trip-summary-nearby-price">${item.price}</span>`;
    }
    
    itemEl.innerHTML = `
        <div class="trip-summary-nearby-icon ${iconClass}">${icon}</div>
        <div class="trip-summary-nearby-info">
            <div class="trip-summary-nearby-name">${item.name}</div>
            ${detailsHtml ? `<div class="trip-summary-nearby-detail">${detailsHtml}</div>` : ''}
        </div>
        ${item.link ? `<a href="${item.link}" target="_blank" class="trip-summary-nearby-link">View</a>` : ''}
    `;
    
    return itemEl;
}

/**
 * Create a location card element
 * @param {Object} loc - Location data
 * @param {number} index - Index in the list
 * @param {Array} locations - All locations
 * @param {Object} markers - Map markers
 * @param {Function} deleteCallback - Delete callback
 * @param {Function} saveCallback - Save callback
 * @param {Function} updateListCallback - Update list callback
 * @returns {HTMLElement} - Card element
 */
function createLocationCard(loc, index, locations, markers, deleteCallback, saveCallback, updateListCallback) {
    const { accommodations, attractions } = getAssociatedItems(loc, locations);
    const hasNearbyItems = accommodations.length > 0 || attractions.length > 0;
    
    const card = document.createElement('div');
    card.className = 'trip-summary-card';
    card.dataset.locationId = loc.id;
    card.draggable = true;
    
    // Card Header
    const header = document.createElement('div');
    header.className = 'trip-summary-card-header';
    header.innerHTML = `
        <div class="trip-summary-card-number">${index + 1}</div>
        <div class="trip-summary-card-main">
            <h4 class="trip-summary-card-title">${loc.name}</h4>
            ${loc.description ? `<p class="trip-summary-card-description">${loc.description}</p>` : ''}
        </div>
        <div class="trip-summary-card-meta">
            ${loc.duration ? `<span class="trip-summary-card-duration">${loc.duration}</span>` : ''}
            <div class="trip-summary-card-actions">
                <button class="trip-summary-card-btn zoom" title="Zoom to location" data-id="${loc.id}">🔍</button>
                <button class="trip-summary-card-btn delete" title="Delete location" data-id="${loc.id}">🗑️</button>
            </div>
        </div>
    `;
    card.appendChild(header);
    
    // Details section (expandable)
    if (hasNearbyItems) {
        const details = document.createElement('div');
        details.className = 'trip-summary-card-details';
        
        // Accommodations
        if (accommodations.length > 0) {
            const accSection = document.createElement('div');
            accSection.className = 'trip-summary-nearby-section';
            accSection.innerHTML = `<div class="trip-summary-nearby-title">🏨 Accommodations</div>`;
            accommodations.forEach(acc => {
                accSection.appendChild(createNearbyItemElement(acc, 'accommodation'));
            });
            details.appendChild(accSection);
        }
        
        // Attractions
        if (attractions.length > 0) {
            const attrSection = document.createElement('div');
            attrSection.className = 'trip-summary-nearby-section';
            attrSection.innerHTML = `<div class="trip-summary-nearby-title">⭐ Attractions</div>`;
            attractions.forEach(attr => {
                attrSection.appendChild(createNearbyItemElement(attr, 'attraction'));
            });
            details.appendChild(attrSection);
        }
        
        card.appendChild(details);
        
        // Toggle button
        const toggle = document.createElement('div');
        toggle.className = 'trip-summary-card-toggle';
        toggle.innerHTML = `
            <span>View ${accommodations.length + attractions.length} nearby place${accommodations.length + attractions.length > 1 ? 's' : ''}</span>
            <span class="trip-summary-card-toggle-icon">▼</span>
        `;
        toggle.addEventListener('click', (e) => {
            e.stopPropagation();
            card.classList.toggle('expanded');
            const isExpanded = card.classList.contains('expanded');
            toggle.querySelector('span:first-child').textContent = isExpanded 
                ? 'Hide details' 
                : `View ${accommodations.length + attractions.length} nearby place${accommodations.length + attractions.length > 1 ? 's' : ''}`;
        });
        card.appendChild(toggle);
    }
    
    // Attach events
    attachCardEvents(card, loc, locations, markers, deleteCallback, saveCallback, updateListCallback);
    
    return card;
}

/**
 * Attach events to a location card
 */
function attachCardEvents(card, loc, locations, markers, deleteCallback, saveCallback, updateListCallback) {
    const map = getMap();
    
    // Zoom button
    const zoomBtn = card.querySelector('.trip-summary-card-btn.zoom');
    if (zoomBtn) {
        zoomBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (map && loc.lat && loc.lng) {
                map.setView([loc.lat, loc.lng], 12, { animate: true });
                if (markers && markers[loc.id]) {
                    markers[loc.id].openPopup();
                }
            }
        });
    }
    
    // Delete button
    const deleteBtn = card.querySelector('.trip-summary-card-btn.delete');
    if (deleteBtn) {
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (deleteCallback) {
                deleteCallback(loc.id);
            }
        });
    }
    
    // Drag events
    card.addEventListener('dragstart', handleCardDragStart);
    card.addEventListener('dragover', handleCardDragOver);
    card.addEventListener('drop', handleCardDrop);
    card.addEventListener('dragend', (event) => handleCardDragEnd(event, locations, saveCallback, updateListCallback));
}

function handleCardDragStart(event) {
    tripSummaryDraggingCard = event.currentTarget;
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', event.currentTarget.dataset.locationId || '');
    event.currentTarget.classList.add('dragging');
}

function handleCardDragOver(event) {
    event.preventDefault();
    if (!tripSummaryDraggingCard) return;

    const targetCard = event.currentTarget;
    if (!targetCard || targetCard === tripSummaryDraggingCard) return;

    const container = targetCard.parentElement;
    if (!container) return;

    const bounding = targetCard.getBoundingClientRect();
    const offset = event.clientY - bounding.top;

    if (offset < bounding.height / 2) {
        container.insertBefore(tripSummaryDraggingCard, targetCard);
    } else {
        container.insertBefore(tripSummaryDraggingCard, targetCard.nextSibling);
    }
}

function handleCardDrop(event) {
    event.preventDefault();
}

function handleCardDragEnd(event, locations, saveCallback, updateListCallback) {
    event.currentTarget.classList.remove('dragging');

    const container = event.currentTarget.parentElement;
    if (!container) {
        tripSummaryDraggingCard = null;
        return;
    }

    const orderedIds = Array.from(container.querySelectorAll('.trip-summary-card')).map(card => card.dataset.locationId);
    tripSummaryDraggingCard = null;
    
    // Update order numbers visually
    const cards = container.querySelectorAll('.trip-summary-card');
    cards.forEach((card, idx) => {
        const numberEl = card.querySelector('.trip-summary-card-number');
        if (numberEl) {
            numberEl.textContent = idx + 1;
        }
    });
    
    applyCardOrder(orderedIds, locations, saveCallback, updateListCallback);
}

/**
 * Apply new order to locations after drag and drop
 */
function applyCardOrder(idOrder, locations, saveCallback, updateListCallback) {
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
 * Update trip summary display - Redesigned version
 * @param {Array} locations - All locations
 * @param {Object} tripData - Trip metadata (arrival_location, departure_location)
 * @param {Function} deleteCallback - Callback for delete actions
 * @param {Function} saveCallback - Callback to save changes
 * @param {Function} updateListCallback - Callback to update locations list
 * @param {Object} markers - Map markers object
 */
export function updateTripSummary(locations, tripData, deleteCallback, saveCallback, updateListCallback, markers = {}) {
    console.log('updateTripSummary called, total locations:', locations.length);
    const container = document.getElementById('trip-summary-container');
    const body = document.querySelector('.trip-summary-body');
    
    if (!container || !body) {
        console.log('Trip summary elements not found');
        return;
    }
    
    // Get all key locations (not just those with durations for better UX)
    const keyLocations = locations.filter(loc => loc.type === 'key-location');
    const keyLocationsWithDurations = keyLocations.filter(loc => loc.duration && loc.duration.trim() !== '');
    const accommodations = locations.filter(loc => loc.type === 'accommodation');
    const attractions = locations.filter(loc => loc.type === 'attraction');
    
    console.log('Key locations:', keyLocations.length);
    
    if (keyLocations.length === 0) {
        console.log('No key locations found');
        body.innerHTML = `
            <div class="trip-summary-empty">
                <div class="trip-summary-empty-icon">🗺️</div>
                <p class="trip-summary-empty-text">No trip locations yet.<br>Add key locations to see your trip summary.</p>
            </div>
        `;
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
    keyLocationsWithDurations.forEach(loc => {
        totalHours += parseDurationToHours(loc.duration);
    });
    const totalDays = Math.ceil(totalHours / 24);
    
    // Build the new layout
    let html = '';
    
    // Stats Dashboard
    html += `
        <div class="trip-summary-stats">
            <div class="trip-summary-stat">
                <div class="trip-summary-stat-value">${sortedLocations.length}</div>
                <div class="trip-summary-stat-label">Stops</div>
            </div>
            <div class="trip-summary-stat">
                <div class="trip-summary-stat-value">${totalDays > 0 ? formatDaysForStats(totalDays) : '—'}</div>
                <div class="trip-summary-stat-label">Days</div>
            </div>
            <div class="trip-summary-stat">
                <div class="trip-summary-stat-value">${accommodations.length}</div>
                <div class="trip-summary-stat-label">Stays</div>
            </div>
            <div class="trip-summary-stat">
                <div class="trip-summary-stat-value">${attractions.length}</div>
                <div class="trip-summary-stat-label">Sights</div>
            </div>
        </div>
    `;
    
    // Travel info (if available)
    const firstLocation = sortedLocations[0];
    const lastLocation = sortedLocations[sortedLocations.length - 1];
    
    if ((tripData.arrival_location && tripData.arrival_location.trim() !== '') || 
        (tripData.departure_location && tripData.departure_location.trim() !== '')) {
        html += `<div class="trip-summary-travel">`;
        html += `<div class="trip-summary-travel-icon">✈️</div>`;
        html += `<div class="trip-summary-travel-content">`;
        
        if (tripData.arrival_location && tripData.arrival_location.trim() !== '') {
            html += `
                <div class="trip-summary-travel-route">
                    <span>${tripData.arrival_location}</span>
                    <span class="trip-summary-travel-arrow">→</span>
                    <span><strong>${firstLocation.name}</strong></span>
                </div>
            `;
        }
        if (tripData.departure_location && tripData.departure_location.trim() !== '' && sortedLocations.length > 1) {
            html += `
                <div class="trip-summary-travel-route">
                    <span><strong>${lastLocation.name}</strong></span>
                    <span class="trip-summary-travel-arrow">→</span>
                    <span>${tripData.departure_location}</span>
                </div>
            `;
        }
        
        html += `</div></div>`;
    }
    
    // Timeline container placeholder (cards will be added via DOM)
    html += `<div class="trip-summary-timeline" id="trip-summary-timeline"></div>`;
    
    body.innerHTML = html;
    
    // Add location cards to timeline
    const timeline = document.getElementById('trip-summary-timeline');
    if (timeline) {
        sortedLocations.forEach((loc, index) => {
            const card = createLocationCard(loc, index, locations, markers, deleteCallback, saveCallback, updateListCallback);
            timeline.appendChild(card);
        });
    }
    
    console.log('Trip summary content updated successfully');
}

/**
 * Toggle trip summary visibility
 * @param {Array} locations - All locations
 * @param {Object} tripData - Trip metadata
 * @param {Function} deleteCallback - Callback for delete actions
 * @param {Function} saveCallback - Callback to save changes
 * @param {Function} updateListCallback - Callback to update locations list
 * @param {Object} markers - Map markers object
 */
export function toggleTripSummary(locations, tripData, deleteCallback, saveCallback, updateListCallback, markers = {}) {
    // Check if we have any key locations
    const keyLocations = locations.filter(loc => loc.type === 'key-location');
    
    if (keyLocations.length === 0) {
        showAlert('No trip locations found. Add key locations to see the trip summary.', 'Trip Summary');
        return;
    }
    
    tripSummaryVisible = !tripSummaryVisible;
    const container = document.getElementById('trip-summary-container');
    
    if (tripSummaryVisible) {
        // Update the summary content before showing it
        updateTripSummary(locations, tripData, deleteCallback, saveCallback, updateListCallback, markers);
        container.classList.add('visible');
    } else {
        container.classList.remove('visible');
    }
}

/**
 * Check if trip summary is currently visible
 * @returns {boolean}
 */
export function isTripSummaryVisible() {
    return tripSummaryVisible;
}

/**
 * Close trip summary panel
 */
export function closeTripSummary() {
    tripSummaryVisible = false;
    const container = document.getElementById('trip-summary-container');
    if (container) {
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

