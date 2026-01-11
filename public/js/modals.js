/**
 * PlanPilot - Modals Module
 * Modal dialogs (confirm, alert, import, info, planning)
 */

import { LOADING_CONFIG } from './config.js';

// Loading overlay state
let progressInterval = null;
let progressStartTime = null;

/**
 * Show custom confirm dialog
 * @param {string} message - The confirmation message
 * @param {string} title - Dialog title
 * @returns {Promise<boolean>} - Resolves to true if confirmed, false otherwise
 */
export function showConfirm(message, title = 'Confirm Action') {
    return new Promise((resolve) => {
        const modal = document.getElementById('confirmModal');
        const titleEl = document.getElementById('confirmTitle');
        const messageEl = document.getElementById('confirmMessage');
        const yesBtn = document.getElementById('confirmYes');
        const noBtn = document.getElementById('confirmNo');
        
        // Add emoji if not present
        if (!title.includes('⚠️')) {
            titleEl.textContent = '⚠️ ' + title;
        } else {
            titleEl.textContent = title;
        }
        messageEl.textContent = message;
        modal.classList.add('active');
        
        function cleanup() {
            modal.classList.remove('active');
            yesBtn.removeEventListener('click', onYes);
            noBtn.removeEventListener('click', onNo);
        }
        
        function onYes() {
            cleanup();
            resolve(true);
        }
        
        function onNo() {
            cleanup();
            resolve(false);
        }
        
        yesBtn.addEventListener('click', onYes);
        noBtn.addEventListener('click', onNo);
    });
}

/**
 * Show custom alert dialog
 * @param {string} message - The alert message
 * @param {string} title - Dialog title
 * @returns {Promise<boolean>} - Resolves when user clicks OK
 */
export function showAlert(message, title = 'Information') {
    return new Promise((resolve) => {
        const modal = document.getElementById('alertModal');
        const titleEl = document.getElementById('alertTitle');
        const messageEl = document.getElementById('alertMessage');
        const okBtn = document.getElementById('alertOk');
        
        // Determine emoji based on message content
        let emoji = 'ℹ️';
        if (message.includes('❌') || message.toLowerCase().includes('error') || message.toLowerCase().includes('failed')) {
            emoji = '❌';
        } else if (message.includes('🎉') || message.toLowerCase().includes('success')) {
            emoji = '🎉';
        } else if (message.includes('⚠️') || message.toLowerCase().includes('warning')) {
            emoji = '⚠️';
        }
        
        // Add emoji if not present in title
        if (!title.match(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]/u)) {
            titleEl.textContent = emoji + ' ' + title;
        } else {
            titleEl.textContent = title;
        }
        
        messageEl.textContent = message;
        modal.classList.add('active');
        
        function cleanup() {
            modal.classList.remove('active');
            okBtn.removeEventListener('click', onOk);
        }
        
        function onOk() {
            cleanup();
            resolve(true);
        }
        
        okBtn.addEventListener('click', onOk);
    });
}

/**
 * Open import modal
 */
export function openImportModal() {
    document.getElementById('importModal').classList.add('active');
}

/**
 * Close import modal
 */
export function closeImportModal() {
    document.getElementById('importModal').classList.remove('active');
    document.getElementById('importText').value = '';
    document.getElementById('importFile').value = '';
}

/**
 * Clear import text input
 */
export function clearImportText() {
    document.getElementById('importText').value = '';
}

/**
 * Clear import file input
 */
export function clearImportFile() {
    document.getElementById('importFile').value = '';
}

/**
 * Open planning modal
 */
export function openPlanningModal() {
    document.getElementById('planningModal').classList.add('active');
}

/**
 * Close planning modal
 */
export function closePlanningModal() {
    document.getElementById('planningModal').classList.remove('active');
    document.getElementById('tripPlanningForm').reset();
}

/**
 * Open info modal
 */
export function openInfoModal() {
    document.getElementById('infoModal').classList.add('active');
}

/**
 * Close info modal
 */
export function closeInfoModal() {
    document.getElementById('infoModal').classList.remove('active');
}

/**
 * Open location details modal
 */
export function openLocationDetailsModal() {
    document.getElementById('locationDetailsModal').classList.add('active');
}

/**
 * Close location details modal
 */
export function closeLocationDetailsModal() {
    document.getElementById('locationDetailsModal').classList.remove('active');
}

/**
 * Show loading overlay
 * @param {string} title - Loading title
 * @param {string} message - Loading message
 */
export function showLoadingOverlay(title = 'Processing...', message = 'Please wait') {
    const overlay = document.getElementById('loadingOverlay');
    const progressBar = document.getElementById('progressBar');
    
    document.getElementById('loadingTitle').textContent = title;
    document.getElementById('loadingMessage').textContent = message;
    
    // Reset progress bar
    progressBar.style.width = '0%';
    
    overlay.classList.add('active');
    
    // Start progress animation
    progressStartTime = Date.now();
    progressInterval = setInterval(() => {
        const elapsedSeconds = Math.floor((Date.now() - progressStartTime) / 1000);
        const progressPercentage = Math.min((elapsedSeconds / LOADING_CONFIG.MAX_TIMEOUT) * 100, 99);
        
        progressBar.style.width = `${progressPercentage}%`;
        
        // Stop at 99% to avoid reaching 100% before completion
        if (elapsedSeconds >= LOADING_CONFIG.MAX_TIMEOUT) {
            clearInterval(progressInterval);
            progressInterval = null;
        }
    }, 100); // Update every 100ms for smooth animation
}

/**
 * Hide loading overlay
 */
export function hideLoadingOverlay() {
    // Clear the progress interval
    if (progressInterval) {
        clearInterval(progressInterval);
        progressInterval = null;
    }
    
    // Complete the progress bar before hiding
    const progressBar = document.getElementById('progressBar');
    progressBar.style.width = '100%';
    
    // Hide after a brief moment to show completion
    setTimeout(() => {
        document.getElementById('loadingOverlay').classList.remove('active');
        progressBar.style.width = '0%';
    }, 300);
}


// Notes modal state
let currentNotesLocationId = null;
let notesUpdateCallback = null;

/**
 * Open notes modal for a location
 * @param {string} locationId - The location ID
 * @param {Array} locations - Array of all locations
 * @param {Function} updateCallback - Callback to update after save
 */
export function openNotesModal(locationId, locations, updateCallback) {
    const modal = document.getElementById('notesModal');
    const textarea = document.getElementById('notesTextarea');
    const titleEl = document.getElementById('notesModalTitle');
    const locationNameEl = document.getElementById('notesLocationName');
    const deleteBtn = document.getElementById('deleteNotesBtn');
    
    // Find the location
    const location = locations.find(l => l.id === locationId);
    if (!location) {
        showAlert('Location not found', 'Error');
        return;
    }
    
    currentNotesLocationId = locationId;
    notesUpdateCallback = updateCallback;
    
    // Set modal content
    titleEl.textContent = '📝 Location Notes';
    locationNameEl.textContent = location.name;
    textarea.value = location.notes || '';
    
    // Show/hide delete button based on whether notes exist
    if (location.notes && location.notes.trim() !== '') {
        deleteBtn.style.display = 'block';
    } else {
        deleteBtn.style.display = 'none';
    }
    
    modal.classList.add('active');
    
    // Focus the textarea
    setTimeout(() => textarea.focus(), 100);
}

/**
 * Close notes modal
 */
export function closeNotesModal() {
    const modal = document.getElementById('notesModal');
    const textarea = document.getElementById('notesTextarea');
    
    modal.classList.remove('active');
    textarea.value = '';
    currentNotesLocationId = null;
    notesUpdateCallback = null;
}

/**
 * Save notes for the current location
 * @param {Array} locations - Array of all locations
 * @param {Function} saveCallback - Callback to save data
 */
export function saveNotes(locations, saveCallback) {
    if (!currentNotesLocationId) {
        showAlert('No location selected', 'Error');
        return;
    }
    
    const textarea = document.getElementById('notesTextarea');
    const notes = textarea.value.trim();
    
    // Find and update the location
    const location = locations.find(l => l.id === currentNotesLocationId);
    if (!location) {
        showAlert('Location not found', 'Error');
        return;
    }
    
    location.notes = notes;
    
    // Save data
    if (saveCallback) saveCallback();
    
    // Call the update callback to refresh UI
    if (notesUpdateCallback) notesUpdateCallback();
    
    closeNotesModal();
    showAlert('Notes saved successfully!', '✅ Saved');
}

/**
 * Delete notes for the current location
 * @param {Array} locations - Array of all locations
 * @param {Function} saveCallback - Callback to save data
 */
export async function deleteNotes(locations, saveCallback) {
    if (!currentNotesLocationId) {
        showAlert('No location selected', 'Error');
        return;
    }
    
    const confirmed = await showConfirm('Are you sure you want to delete these notes?', 'Delete Notes');
    if (!confirmed) return;
    
    // Find and update the location
    const location = locations.find(l => l.id === currentNotesLocationId);
    if (!location) {
        showAlert('Location not found', 'Error');
        return;
    }
    
    location.notes = '';
    
    // Save data
    if (saveCallback) saveCallback();
    
    // Call the update callback to refresh UI
    if (notesUpdateCallback) notesUpdateCallback();
    
    closeNotesModal();
    showAlert('Notes deleted', '🗑️ Deleted');
}

/**
 * Get current notes location ID
 * @returns {string|null} - Current location ID or null
 */
export function getCurrentNotesLocationId() {
    return currentNotesLocationId;
}

// ============================================
// LOCATION SEARCH MODAL
// ============================================

// Location search modal state
let currentSearchLocationId = null;
let currentSearchLocationName = null;
let currentSearchLocationLat = null;
let currentSearchLocationLng = null;
let searchResultsData = null;
let searchResultsAction = null; // 'add' or 'replace'
let selectedSearchResults = new Set();

/**
 * Open location search modal
 * @param {string} locationId - Location ID
 * @param {string} locationName - Location name
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 */
export function openLocationSearchModal(locationId, locationName, lat, lng) {
    const modal = document.getElementById('locationSearchModal');
    const locationNameEl = document.getElementById('searchLocationName');
    const searchTypeSelect = document.getElementById('searchType');
    const customQueryGroup = document.getElementById('customQueryGroup');
    const customQueryInput = document.getElementById('customQuery');
    const searchDetailsInput = document.getElementById('searchDetails');
    
    // Store current location info
    currentSearchLocationId = locationId;
    currentSearchLocationName = locationName;
    currentSearchLocationLat = lat;
    currentSearchLocationLng = lng;
    
    // Update modal content
    locationNameEl.textContent = locationName;
    searchTypeSelect.value = 'accommodations'; // Default
    customQueryGroup.style.display = 'none';
    customQueryInput.value = '';
    if (searchDetailsInput) searchDetailsInput.value = '';
    
    modal.classList.add('active');
}

/**
 * Close location search modal
 */
export function closeLocationSearchModal() {
    const modal = document.getElementById('locationSearchModal');
    modal.classList.remove('active');
    
    // Reset state
    currentSearchLocationId = null;
    currentSearchLocationName = null;
    currentSearchLocationLat = null;
    currentSearchLocationLng = null;
}

/**
 * Handle search type change (show/hide custom query input)
 */
export function handleSearchTypeChange() {
    const searchType = document.getElementById('searchType').value;
    const customQueryGroup = document.getElementById('customQueryGroup');
    
    if (searchType === 'custom') {
        customQueryGroup.style.display = 'block';
    } else {
        customQueryGroup.style.display = 'none';
    }
}

/**
 * Get current search location info
 * @returns {Object|null} - Location info or null
 */
export function getCurrentSearchLocation() {
    if (!currentSearchLocationId) return null;
    return {
        id: currentSearchLocationId,
        name: currentSearchLocationName,
        lat: currentSearchLocationLat,
        lng: currentSearchLocationLng
    };
}

/**
 * Open search results modal
 * @param {Object} results - Search results data
 * @param {string} searchType - Type of search performed
 */
export function openSearchResultsModal(results, searchType) {
    const modal = document.getElementById('searchResultsModal');
    const titleEl = document.getElementById('searchResultsTitle');
    const locationNameEl = document.getElementById('searchResultsLocationName');
    const typeEl = document.getElementById('searchResultsType');
    const tipsContainer = document.getElementById('searchResultsTips');
    const listContainer = document.getElementById('searchResultsList');
    const actionsContainer = document.getElementById('searchResultsActions');
    const applyBtn = document.getElementById('applySearchResultsBtn');
    
    // Store results
    searchResultsData = results;
    searchResultsAction = null;
    selectedSearchResults.clear();
    
    // Map search types to display labels
    const typeLabels = {
        accommodations: '🏨 Accommodations',
        attractions: '⭐ Attractions',
        restaurants: '🍽️ Restaurants',
        transportation: '🚌 Transportation',
        tips: '💡 Tips & Advice',
        custom: '✏️ Custom Search'
    };
    
    // Update header
    titleEl.textContent = `🔍 ${typeLabels[searchType] || 'Search Results'}`;
    locationNameEl.textContent = currentSearchLocationName || results.locationName || '';
    typeEl.textContent = typeLabels[searchType] || searchType;
    
    // Reset containers
    tipsContainer.style.display = 'none';
    listContainer.innerHTML = '';
    actionsContainer.style.display = 'none';
    applyBtn.disabled = true;
    
    // Reset action buttons
    document.getElementById('btnAddResults')?.classList.remove('selected');
    document.getElementById('btnReplaceResults')?.classList.remove('selected');
    
    // Handle tips type (text response)
    if (searchType === 'tips' && results.tips) {
        tipsContainer.style.display = 'block';
        tipsContainer.innerHTML = `
            <div class="tips-content">
                <p>${results.tips.replace(/\n/g, '<br>')}</p>
            </div>
            <div class="tips-action">
                <label class="checkbox-label">
                    <input type="checkbox" id="saveTipsAsNotes" checked>
                    <span>Save these tips as notes for this location</span>
                </label>
            </div>
        `;
        // Enable apply button for tips (no selection needed)
        applyBtn.disabled = false;
    } else if (results.results && Array.isArray(results.results)) {
        // Handle location results
        if (results.results.length === 0) {
            listContainer.innerHTML = '<div class="search-results-empty">No results found. Try a different search.</div>';
        } else {
            results.results.forEach((item, index) => {
                const itemEl = createSearchResultItem(item, index);
                listContainer.appendChild(itemEl);
                // Select all by default
                selectedSearchResults.add(item.id);
            });
            
            // Show action choice for location-based results
            actionsContainer.style.display = 'block';
        }
    } else {
        listContainer.innerHTML = '<div class="search-results-empty">No results found.</div>';
    }
    
    modal.classList.add('active');
}

/**
 * Create a search result item element
 * @param {Object} item - Result item
 * @param {number} index - Item index
 * @returns {HTMLElement} - Item element
 */
function createSearchResultItem(item, index) {
    const el = document.createElement('div');
    el.className = 'search-result-item';
    el.dataset.resultId = item.id;
    
    const typeIcon = item.type === 'accommodation' ? '🏨' : '⭐';
    const typeClass = item.type === 'accommodation' ? 'accommodation' : 'attraction';
    
    el.innerHTML = `
        <label class="search-result-checkbox">
            <input type="checkbox" checked data-id="${item.id}" onchange="handleResultCheckboxChange('${item.id}')">
        </label>
        <div class="search-result-icon ${typeClass}">${typeIcon}</div>
        <div class="search-result-info">
            <div class="search-result-name">${item.name}</div>
            ${item.description ? `<div class="search-result-description">${item.description}</div>` : ''}
            <div class="search-result-meta">
                ${item.price ? `<span class="search-result-price">${item.price}</span>` : ''}
                ${item.duration ? `<span class="search-result-duration">${item.duration}</span>` : ''}
            </div>
        </div>
        ${item.link ? `<a href="${item.link}" target="_blank" class="search-result-link" onclick="event.stopPropagation()">View</a>` : ''}
    `;
    
    return el;
}

/**
 * Handle result checkbox change
 * @param {string} resultId - Result ID
 */
export function handleResultCheckboxChange(resultId) {
    const checkbox = document.querySelector(`.search-result-item[data-result-id="${resultId}"] input[type="checkbox"]`);
    
    if (checkbox && checkbox.checked) {
        selectedSearchResults.add(resultId);
    } else {
        selectedSearchResults.delete(resultId);
    }
    
    updateApplyButtonState();
}

/**
 * Set result action (add or replace)
 * @param {string} action - 'add' or 'replace'
 */
export function setResultAction(action) {
    searchResultsAction = action;
    
    // Update button styles
    const addBtn = document.getElementById('btnAddResults');
    const replaceBtn = document.getElementById('btnReplaceResults');
    
    if (addBtn && replaceBtn) {
        addBtn.classList.toggle('selected', action === 'add');
        replaceBtn.classList.toggle('selected', action === 'replace');
    }
    
    updateApplyButtonState();
}

/**
 * Update apply button state based on selections
 */
function updateApplyButtonState() {
    const applyBtn = document.getElementById('applySearchResultsBtn');
    const searchType = document.getElementById('searchType')?.value;
    
    if (searchType === 'tips') {
        // Tips always enabled (save as notes)
        applyBtn.disabled = false;
    } else {
        // Require at least one selection and an action
        const hasSelection = selectedSearchResults.size > 0;
        const hasAction = searchResultsAction !== null;
        applyBtn.disabled = !(hasSelection && hasAction);
    }
}

/**
 * Get search results data
 * @returns {Object|null} - Search results or null
 */
export function getSearchResultsData() {
    return {
        data: searchResultsData,
        action: searchResultsAction,
        selectedIds: Array.from(selectedSearchResults),
        locationId: currentSearchLocationId
    };
}

/**
 * Close search results modal
 */
export function closeSearchResultsModal() {
    const modal = document.getElementById('searchResultsModal');
    modal.classList.remove('active');
    
    // Reset state
    searchResultsData = null;
    searchResultsAction = null;
    selectedSearchResults.clear();
}

/**
 * Setup modal close on outside click
 */
export function setupModalCloseHandlers() {
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('modal')) {
            if (e.target.id === 'importModal') {
                closeImportModal();
            } else if (e.target.id === 'infoModal') {
                closeInfoModal();
            } else if (e.target.id === 'planningModal') {
                closePlanningModal();
            } else if (e.target.id === 'locationDetailsModal') {
                closeLocationDetailsModal();
            } else if (e.target.id === 'notesModal') {
                closeNotesModal();
            } else if (e.target.id === 'locationSearchModal') {
                closeLocationSearchModal();
            } else if (e.target.id === 'searchResultsModal') {
                closeSearchResultsModal();
            } else if (e.target.id === 'confirmModal') {
                // Click outside confirm modal = cancel
                document.getElementById('confirmNo').click();
            }
        }
    });
}




