/**
 * PlanPilot - Trip Summary Module
 * Trip summary panel and calculations - Redesigned with card-based timeline
 */

import { showAlert, openNotesModal as openNotesModalFromModals } from './modals.js';
import { getDistance } from './locations.js';
import { getMap } from './map.js';
import { resetEditMode } from './ui.js';

/**
 * Truncate notes text for display
 * @param {string} text - Full notes text
 * @param {number} maxLength - Maximum length
 * @returns {string} - Truncated text
 */
function truncateNotes(text, maxLength = 60) {
    if (!text) return '';
    // Replace newlines with spaces for preview
    const singleLine = text.replace(/\n/g, ' ').trim();
    if (singleLine.length <= maxLength) return singleLine;
    return singleLine.substring(0, maxLength).trim() + '...';
}

// Trip summary state
let tripSummaryVisible = false;
let tripSummaryDraggingCard = null;

// Nearby item drag state (for accommodations/attractions within key locations)
let nearbyItemDragging = null;
let nearbyItemDragType = null; // 'accommodation' or 'attraction'
let nearbyItemKeyLocationId = null; // The key location these items belong to

// Panel drag state
let isPanelDragging = false;
let panelDragOffset = { x: 0, y: 0 };

/**
 * Smart pan to location that accounts for the Trip Itinerary panel
 * Ensures the marker is visible and not hidden under the panel
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @param {number} zoom - Zoom level
 */
function panToLocationSmart(lat, lng, zoom = 12) {
    const map = getMap();
    if (!map) return;
    
    const container = document.getElementById('trip-summary-container');
    const isVisible = container && container.classList.contains('visible');
    
    if (!isVisible) {
        // Panel not visible, just center normally
        map.setView([lat, lng], zoom, { animate: true });
        return;
    }
    
    // Get map dimensions
    const mapSize = map.getSize();
    const mapContainer = map.getContainer();
    const mapRect = mapContainer.getBoundingClientRect();
    
    // Get panel dimensions and position
    const panelRect = container.getBoundingClientRect();
    
    // Calculate the visible area of the map (area not covered by panel)
    // The panel is centered, so we need to offset to the side that has more space
    
    let offsetX = 0;
    let offsetY = 0;
    
    // Check if panel overlaps with center of map
    const mapCenterX = mapRect.left + mapRect.width / 2;
    const mapCenterY = mapRect.top + mapRect.height / 2;
    
    const panelLeft = panelRect.left;
    const panelRight = panelRect.right;
    const panelTop = panelRect.top;
    const panelBottom = panelRect.bottom;
    
    // If panel covers the center, calculate offset to move marker to visible area
    if (panelLeft < mapCenterX && panelRight > mapCenterX && 
        panelTop < mapCenterY && panelBottom > mapCenterY) {
        
        // Calculate how much space is available on each side
        const leftSpace = panelLeft - mapRect.left;
        const rightSpace = mapRect.right - panelRight;
        const topSpace = panelTop - mapRect.top;
        const bottomSpace = mapRect.bottom - panelBottom;
        
        // Offset towards the side with more space
        if (leftSpace > rightSpace) {
            // More space on left, offset marker to the left
            offsetX = -(panelRect.width / 2 + leftSpace / 2) * 0.5;
        } else {
            // More space on right, offset marker to the right
            offsetX = (panelRect.width / 2 + rightSpace / 2) * 0.5;
        }
        
        // Also check vertical offset if needed
        if (topSpace > bottomSpace && topSpace > 100) {
            offsetY = -(panelRect.height / 4);
        }
    }
    
    // Convert the target location to pixel coordinates
    const targetPoint = map.project([lat, lng], zoom);
    
    // Apply offset
    targetPoint.x += offsetX;
    targetPoint.y += offsetY;
    
    // Convert back to lat/lng
    const targetLatLng = map.unproject(targetPoint, zoom);
    
    // Pan to the offset location
    map.setView(targetLatLng, zoom, { animate: true });
}

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
 * Each accommodation/attraction is only associated with its NEAREST key location
 * @param {Object} baseLocation - The key location
 * @param {Array} locations - All locations
 * @returns {Object} - Object with accommodations and attractions arrays
 */
export function getAssociatedItems(baseLocation, locations) {
    if (!baseLocation) {
        return { accommodations: [], attractions: [] };
    }

    // Get all key locations for nearest-neighbor comparison
    const keyLocations = locations.filter(loc => loc.type === 'key-location');
    
    // Filter items that belong to this key location (it's their nearest)
    const associatedItems = locations.filter(item => {
        // Skip the base location itself and other key locations
        if (item.id === baseLocation.id || item.type === 'key-location') return false;

        // Only process accommodations and attractions
        if (item.type !== 'accommodation' && item.type !== 'attraction') return false;

        // Find the nearest key location to this item
        let nearestKeyLocation = null;
        let nearestDistance = Infinity;
        
        for (const keyLoc of keyLocations) {
            const distance = getDistance(keyLoc.lat, keyLoc.lng, item.lat, item.lng);
            if (distance < nearestDistance) {
                nearestDistance = distance;
                nearestKeyLocation = keyLoc;
            }
        }
        
        // Only associate this item with baseLocation if baseLocation is the nearest key location
        return nearestKeyLocation && nearestKeyLocation.id === baseLocation.id;
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
 * @param {Object} markers - Map markers object
 * @param {string} keyLocationId - ID of the parent key location
 * @param {Array} locations - All locations
 * @param {Function} deleteCallback - Callback to delete this item
 * @param {Function} saveCallback - Callback to save changes
 * @param {Function} updateListCallback - Callback to update locations list
 * @returns {HTMLElement} - The item element
 */
function createNearbyItemElement(item, type, markers, keyLocationId, locations, deleteCallback, saveCallback, updateListCallback) {
    const map = getMap();
    const itemEl = document.createElement('div');
    itemEl.className = 'trip-summary-nearby-item';
    itemEl.dataset.locationId = item.id;
    itemEl.dataset.itemType = type;
    itemEl.draggable = true;
    
    const icon = type === 'accommodation' ? '🏨' : '⭐';
    const iconClass = type === 'accommodation' ? 'accommodation' : 'attraction';
    const hasNotes = item.notes && item.notes.trim() !== '';
    
    let detailsHtml = '';
    if (item.duration) {
        detailsHtml += `<span>${item.duration}</span>`;
    }
    if (item.price) {
        detailsHtml += `<span class="trip-summary-nearby-price">${item.price}</span>`;
    }
    
    itemEl.innerHTML = `
        <div class="trip-summary-nearby-drag-handle">⋮⋮</div>
        <div class="trip-summary-nearby-icon ${iconClass}">${icon}</div>
        <div class="trip-summary-nearby-info">
            <div class="trip-summary-nearby-name">${item.name}</div>
            ${detailsHtml ? `<div class="trip-summary-nearby-detail">${detailsHtml}</div>` : ''}
            ${hasNotes ? `<div class="trip-summary-nearby-notes" title="${item.notes.replace(/"/g, '&quot;')}">📝 ${truncateNotes(item.notes, 40)}</div>` : ''}
        </div>
        <button class="trip-summary-nearby-notes-btn ${hasNotes ? 'has-notes' : ''}" title="${hasNotes ? 'Edit Notes' : 'Add Notes'}" data-id="${item.id}">📝</button>
        ${item.link ? `<a href="${item.link}" target="_blank" class="trip-summary-nearby-link" onclick="event.stopPropagation()">View</a>` : ''}
        <button class="trip-summary-nearby-delete" title="Delete ${type}" data-id="${item.id}">🗑️</button>
    `;
    
    // Add click handler to pan map to this location
    itemEl.addEventListener('click', (e) => {
        // Don't trigger if clicking the link, drag handle, delete button, notes button, or notes text
        if (e.target.classList.contains('trip-summary-nearby-link')) return;
        if (e.target.classList.contains('trip-summary-nearby-drag-handle')) return;
        if (e.target.classList.contains('trip-summary-nearby-delete')) return;
        if (e.target.classList.contains('trip-summary-nearby-notes-btn')) return;
        if (e.target.closest('.trip-summary-nearby-notes')) return;
        
        if (map && item.lat && item.lng) {
            panToLocationSmart(item.lat, item.lng, 14);
            if (markers && markers[item.id]) {
                markers[item.id].openPopup();
            }
        }
    });
    
    // Add notes button click handler
    const notesBtn = itemEl.querySelector('.trip-summary-nearby-notes-btn');
    if (notesBtn) {
        notesBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            openNotesFromTripSummary(item.id);
        });
    }
    
    // Add notes text click handler
    const notesText = itemEl.querySelector('.trip-summary-nearby-notes');
    if (notesText) {
        notesText.addEventListener('click', (e) => {
            e.stopPropagation();
            openNotesFromTripSummary(item.id);
        });
    }
    
    // Add delete button click handler
    const deleteBtn = itemEl.querySelector('.trip-summary-nearby-delete');
    if (deleteBtn) {
        deleteBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            if (deleteCallback) {
                await deleteCallback(item.id);
            }
        });
    }
    
    // Add drag event handlers
    itemEl.addEventListener('dragstart', (e) => handleNearbyItemDragStart(e, type, keyLocationId));
    itemEl.addEventListener('dragover', handleNearbyItemDragOver);
    itemEl.addEventListener('drop', handleNearbyItemDrop);
    itemEl.addEventListener('dragend', (e) => handleNearbyItemDragEnd(e, type, locations, saveCallback, updateListCallback));
    
    return itemEl;
}

/**
 * Handle drag start for nearby items
 */
function handleNearbyItemDragStart(event, type, keyLocationId) {
    // Prevent the card from dragging when we're dragging a nearby item
    event.stopPropagation();
    
    nearbyItemDragging = event.currentTarget;
    nearbyItemDragType = type;
    nearbyItemKeyLocationId = keyLocationId;
    
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', event.currentTarget.dataset.locationId || '');
    event.currentTarget.classList.add('dragging');
}

/**
 * Handle drag over for nearby items
 */
function handleNearbyItemDragOver(event) {
    event.preventDefault();
    event.stopPropagation();
    
    if (!nearbyItemDragging) return;
    
    const targetItem = event.currentTarget;
    if (!targetItem || targetItem === nearbyItemDragging) return;
    
    // Only allow reordering within the same type (accommodations with accommodations, attractions with attractions)
    if (targetItem.dataset.itemType !== nearbyItemDragType) return;
    
    const container = targetItem.parentElement;
    if (!container) return;
    
    const bounding = targetItem.getBoundingClientRect();
    const offset = event.clientY - bounding.top;
    
    if (offset < bounding.height / 2) {
        container.insertBefore(nearbyItemDragging, targetItem);
    } else {
        container.insertBefore(nearbyItemDragging, targetItem.nextSibling);
    }
}

/**
 * Handle drop for nearby items
 */
function handleNearbyItemDrop(event) {
    event.preventDefault();
    event.stopPropagation();
}

/**
 * Handle drag end for nearby items
 */
function handleNearbyItemDragEnd(event, type, locations, saveCallback, updateListCallback) {
    event.currentTarget.classList.remove('dragging');
    
    const container = event.currentTarget.parentElement;
    if (!container) {
        nearbyItemDragging = null;
        nearbyItemDragType = null;
        nearbyItemKeyLocationId = null;
        return;
    }
    
    // Get ordered IDs of items in this section
    const orderedIds = Array.from(container.querySelectorAll('.trip-summary-nearby-item'))
        .filter(item => item.dataset.itemType === type)
        .map(item => item.dataset.locationId);
    
    // Apply the new order to the locations
    applyNearbyItemOrder(orderedIds, type, locations, saveCallback, updateListCallback);
    
    nearbyItemDragging = null;
    nearbyItemDragType = null;
    nearbyItemKeyLocationId = null;
}

/**
 * Apply new order to nearby items (accommodations/attractions)
 */
function applyNearbyItemOrder(idOrder, type, locations, saveCallback, updateListCallback) {
    if (!Array.isArray(idOrder) || idOrder.length === 0) {
        return;
    }
    
    // Find the base order for items of this type
    // Use the lowest current order among the reordered items as the starting point
    let minOrder = Infinity;
    idOrder.forEach(id => {
        const location = locations.find(loc => loc.id === id);
        if (location && typeof location.order === 'number') {
            minOrder = Math.min(minOrder, location.order);
        }
    });
    
    // If no valid orders found, start from a reasonable default
    if (minOrder === Infinity) {
        minOrder = 100;
    }
    
    // Apply the new order
    idOrder.forEach((id, index) => {
        const location = locations.find(loc => loc.id === id);
        if (location) {
            location.order = minOrder + index;
        }
    });
    
    if (updateListCallback) updateListCallback();
    if (saveCallback) saveCallback();
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
    const hasNotes = loc.notes && loc.notes.trim() !== '';
    
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
            ${hasNotes ? `
                <div class="trip-summary-card-notes">
                    <span class="trip-summary-card-notes-icon">📝</span>
                    <span class="trip-summary-card-notes-text">${truncateNotes(loc.notes, 60)}</span>
                </div>
            ` : ''}
        </div>
        <div class="trip-summary-card-meta">
            ${loc.duration ? `<span class="trip-summary-card-duration">${loc.duration}</span>` : ''}
            <div class="trip-summary-card-actions">
                <button class="trip-summary-card-btn search" title="Search for more info" data-id="${loc.id}" data-name="${loc.name}" data-lat="${loc.lat}" data-lng="${loc.lng}">🔎</button>
                <button class="trip-summary-card-btn notes ${hasNotes ? 'has-notes' : ''}" title="${hasNotes ? 'Edit Notes' : 'Add Notes'}" data-id="${loc.id}">📝</button>
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
            accSection.dataset.sectionType = 'accommodation';
            accSection.innerHTML = `<div class="trip-summary-nearby-title">🏨 Accommodations</div>`;
            const accList = document.createElement('div');
            accList.className = 'trip-summary-nearby-list';
            // Sort accommodations by order before rendering
            const sortedAccommodations = [...accommodations].sort((a, b) => {
                const orderA = typeof a.order === 'number' ? a.order : 999999;
                const orderB = typeof b.order === 'number' ? b.order : 999999;
                return orderA - orderB;
            });
            sortedAccommodations.forEach(acc => {
                accList.appendChild(createNearbyItemElement(acc, 'accommodation', markers, loc.id, locations, deleteCallback, saveCallback, updateListCallback));
            });
            accSection.appendChild(accList);
            details.appendChild(accSection);
        }
        
        // Attractions
        if (attractions.length > 0) {
            const attrSection = document.createElement('div');
            attrSection.className = 'trip-summary-nearby-section';
            attrSection.dataset.sectionType = 'attraction';
            attrSection.innerHTML = `<div class="trip-summary-nearby-title">⭐ Attractions</div>`;
            const attrList = document.createElement('div');
            attrList.className = 'trip-summary-nearby-list';
            // Sort attractions by order before rendering
            const sortedAttractions = [...attractions].sort((a, b) => {
                const orderA = typeof a.order === 'number' ? a.order : 999999;
                const orderB = typeof b.order === 'number' ? b.order : 999999;
                return orderA - orderB;
            });
            sortedAttractions.forEach(attr => {
                attrList.appendChild(createNearbyItemElement(attr, 'attraction', markers, loc.id, locations, deleteCallback, saveCallback, updateListCallback));
            });
            attrSection.appendChild(attrList);
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

// Store references for notes modal
let notesModalLocations = null;
let notesModalSaveCallback = null;
let notesModalUpdateCallback = null;

/**
 * Set up references for notes modal (called from updateTripSummary)
 */
function setNotesModalReferences(locations, saveCallback, updateCallback) {
    notesModalLocations = locations;
    notesModalSaveCallback = saveCallback;
    notesModalUpdateCallback = updateCallback;
}

/**
 * Open notes modal from trip summary
 * @param {string} locationId - Location ID
 */
export function openNotesFromTripSummary(locationId) {
    if (notesModalLocations && notesModalSaveCallback) {
        openNotesModalFromModals(locationId, notesModalLocations, notesModalUpdateCallback);
    }
}

/**
 * Attach events to a location card
 */
function attachCardEvents(card, loc, locations, markers, deleteCallback, saveCallback, updateListCallback) {
    const map = getMap();
    
    // Click on card main area to pan map
    const cardMain = card.querySelector('.trip-summary-card-main');
    if (cardMain) {
        cardMain.style.cursor = 'pointer';
        cardMain.addEventListener('click', (e) => {
            // Don't trigger if clicking on notes preview
            if (e.target.closest('.trip-summary-card-notes')) return;
            e.stopPropagation();
            if (map && loc.lat && loc.lng) {
                panToLocationSmart(loc.lat, loc.lng, 12);
                if (markers && markers[loc.id]) {
                    markers[loc.id].openPopup();
                }
            }
        });
    }
    
    // Click on notes preview to open notes modal
    const notesPreview = card.querySelector('.trip-summary-card-notes');
    if (notesPreview) {
        notesPreview.style.cursor = 'pointer';
        notesPreview.addEventListener('click', (e) => {
            e.stopPropagation();
            openNotesFromTripSummary(loc.id);
        });
    }
    
    // Click on card number to pan map
    const cardNumber = card.querySelector('.trip-summary-card-number');
    if (cardNumber) {
        cardNumber.style.cursor = 'pointer';
        cardNumber.addEventListener('click', (e) => {
            e.stopPropagation();
            if (map && loc.lat && loc.lng) {
                panToLocationSmart(loc.lat, loc.lng, 12);
                if (markers && markers[loc.id]) {
                    markers[loc.id].openPopup();
                }
            }
        });
    }
    
    // Notes button
    const notesBtn = card.querySelector('.trip-summary-card-btn.notes');
    if (notesBtn) {
        notesBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            openNotesFromTripSummary(loc.id);
        });
    }
    
    // Search button
    const searchBtn = card.querySelector('.trip-summary-card-btn.search');
    if (searchBtn) {
        searchBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            // Call the global openLocationSearchModal function
            if (typeof window.openLocationSearchModal === 'function') {
                window.openLocationSearchModal(loc.id, loc.name, loc.lat, loc.lng);
            }
        });
    }
    
    // Zoom button
    const zoomBtn = card.querySelector('.trip-summary-card-btn.zoom');
    if (zoomBtn) {
        zoomBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (map && loc.lat && loc.lng) {
                panToLocationSmart(loc.lat, loc.lng, 12);
                if (markers && markers[loc.id]) {
                    markers[loc.id].openPopup();
                }
            }
        });
    }
    
    // Delete button
    const deleteBtn = card.querySelector('.trip-summary-card-btn.delete');
    if (deleteBtn) {
        deleteBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            if (deleteCallback) {
                await deleteCallback(loc.id);
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
    
    // Set up notes modal references
    setNotesModalReferences(locations, saveCallback, () => {
        updateTripSummary(locations, tripData, deleteCallback, saveCallback, updateListCallback, markers);
        if (updateListCallback) updateListCallback();
    });
    
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
 * Open trip summary panel (ensure it's visible)
 * @param {Array} locations - All locations
 * @param {Object} tripData - Trip metadata
 * @param {Function} deleteCallback - Callback for delete actions
 * @param {Function} saveCallback - Callback to save changes
 * @param {Function} updateListCallback - Callback to update locations list
 * @param {Object} markers - Map markers object
 */
export function openTripSummary(locations, tripData, deleteCallback, saveCallback, updateListCallback, markers = {}) {
    // Check if we have any key locations
    const keyLocations = locations.filter(loc => loc.type === 'key-location');
    
    if (keyLocations.length === 0) {
        return; // Silently return if no locations
    }
    
    const container = document.getElementById('trip-summary-container');
    
    if (!tripSummaryVisible) {
        tripSummaryVisible = true;
        // Update the summary content before showing it
        updateTripSummary(locations, tripData, deleteCallback, saveCallback, updateListCallback, markers);
        container.classList.add('visible');
    } else {
        // If already visible, just update the content
        updateTripSummary(locations, tripData, deleteCallback, saveCallback, updateListCallback, markers);
    }
}

/**
 * Close trip summary panel
 */
export function closeTripSummary() {
    tripSummaryVisible = false;
    const container = document.getElementById('trip-summary-container');
    if (container) {
        container.classList.remove('visible');
        // Reset position to center after a brief delay (after animation)
        setTimeout(() => {
            resetPanelPosition();
        }, 300);
    }
    
    // Reset edit mode when closing
    resetEditMode();
}

/**
 * Initialize panel drag functionality
 */
export function initPanelDrag() {
    const container = document.getElementById('trip-summary-container');
    const header = document.querySelector('.trip-summary-header');
    
    if (!container || !header) return;
    
    // Mouse events
    header.addEventListener('mousedown', handlePanelDragStart);
    document.addEventListener('mousemove', handlePanelDragMove);
    document.addEventListener('mouseup', handlePanelDragEnd);
    
    // Touch events for mobile
    header.addEventListener('touchstart', handlePanelTouchStart, { passive: false });
    document.addEventListener('touchmove', handlePanelTouchMove, { passive: false });
    document.addEventListener('touchend', handlePanelDragEnd);
}

/**
 * Handle panel drag start (mouse)
 */
function handlePanelDragStart(e) {
    // Don't start drag if clicking on buttons
    if (e.target.closest('button')) return;
    
    const container = document.getElementById('trip-summary-container');
    if (!container) return;
    
    isPanelDragging = true;
    container.classList.add('dragging');
    
    const rect = container.getBoundingClientRect();
    panelDragOffset.x = e.clientX - rect.left;
    panelDragOffset.y = e.clientY - rect.top;
    
    // Prevent text selection during drag
    e.preventDefault();
}

/**
 * Handle panel touch start (mobile)
 */
function handlePanelTouchStart(e) {
    // Don't start drag if touching buttons
    if (e.target.closest('button')) return;
    
    const container = document.getElementById('trip-summary-container');
    if (!container) return;
    
    const touch = e.touches[0];
    isPanelDragging = true;
    container.classList.add('dragging');
    
    const rect = container.getBoundingClientRect();
    panelDragOffset.x = touch.clientX - rect.left;
    panelDragOffset.y = touch.clientY - rect.top;
    
    e.preventDefault();
}

/**
 * Handle panel drag move (mouse)
 */
function handlePanelDragMove(e) {
    if (!isPanelDragging) return;
    
    const container = document.getElementById('trip-summary-container');
    if (!container) return;
    
    updatePanelPosition(e.clientX, e.clientY, container);
}

/**
 * Handle panel touch move (mobile)
 */
function handlePanelTouchMove(e) {
    if (!isPanelDragging) return;
    
    const container = document.getElementById('trip-summary-container');
    if (!container) return;
    
    const touch = e.touches[0];
    updatePanelPosition(touch.clientX, touch.clientY, container);
    
    e.preventDefault();
}

/**
 * Update panel position
 */
function updatePanelPosition(clientX, clientY, container) {
    let newX = clientX - panelDragOffset.x;
    let newY = clientY - panelDragOffset.y;
    
    // Get container dimensions
    const containerRect = container.getBoundingClientRect();
    const containerWidth = containerRect.width;
    const containerHeight = containerRect.height;
    
    // Get viewport dimensions
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    // Constrain to viewport with padding
    const padding = 10;
    newX = Math.max(padding, Math.min(newX, viewportWidth - containerWidth - padding));
    newY = Math.max(padding, Math.min(newY, viewportHeight - containerHeight - padding));
    
    // Apply position - switch from centered to absolute positioning
    container.style.left = `${newX}px`;
    container.style.top = `${newY}px`;
    container.style.transform = 'none';
    container.classList.add('repositioned');
}

/**
 * Handle panel drag end
 */
function handlePanelDragEnd() {
    if (!isPanelDragging) return;
    
    isPanelDragging = false;
    const container = document.getElementById('trip-summary-container');
    if (container) {
        container.classList.remove('dragging');
    }
}

/**
 * Reset panel position to center
 */
export function resetPanelPosition() {
    const container = document.getElementById('trip-summary-container');
    if (container) {
        container.style.left = '50%';
        container.style.top = '80px';
        container.style.transform = 'translateX(-50%)';
        container.classList.remove('repositioned');
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
        panToLocationSmart(location.lat, location.lng, 12);
    }
}

