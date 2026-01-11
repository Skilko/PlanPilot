/**
 * PlanPilot - Main Application
 * Entry point and initialization
 */

// Import modules
import { initMap, getMap, changeMapStyle, toggleMapControls } from './map.js';
import { saveData, loadData, forceReset } from './storage.js';
import { 
    showConfirm, showAlert, 
    openImportModal, closeImportModal, clearImportText, clearImportFile,
    openPlanningModal, closePlanningModal,
    openInfoModal, closeInfoModal,
    closeLocationDetailsModal,
    showLoadingOverlay, hideLoadingOverlay,
    setupModalCloseHandlers,
    openNotesModal, closeNotesModal, saveNotes, deleteNotes,
    openLocationSearchModal, closeLocationSearchModal, handleSearchTypeChange,
    getCurrentSearchLocation, openSearchResultsModal, closeSearchResultsModal,
    handleResultCheckboxChange, setResultAction, getSearchResultsData
} from './modals.js';
import { 
    toggleSidebar, closeSidebar, openSidebarOnMobileIfEmpty,
    toggleEditMode, toggleDeleteMode, showLogoFallback,
    updateClearAllButton
} from './ui.js';
import { 
    addMarker, addLocation, focusLocation, deleteLocation,
    updateLocationsList, getDistance
} from './locations.js';
import { createPopupContent } from './markers.js';
import { 
    startConnectionMode, cancelConnectionMode, 
    drawConnection, clearAllConnectionLines,
    isConnectionMode
} from './connections.js';
import { 
    getVisibilityFilters, isTypeVisible, 
    toggleFilter, updateFilterCounts, applyFilters 
} from './filters.js';
import { 
    updateTripSummary, toggleTripSummary, openTripSummary, showLocationDetails, initPanelDrag, resetPanelPosition 
} from './trip-summary.js';
import { handlePlanningFormSubmit, searchLocationInfo } from './api.js';

// ============================================
// APPLICATION STATE
// ============================================
const state = {
    tripTitle: '',
    tripData: {
        arrival_location: '',
        departure_location: ''
    },
    locations: [],
    connections: [],
    markers: {},
    connectionLines: {},
    selectedCoords: null
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Save current state to localStorage
 */
function saveCurrentState() {
    const data = {
        title: state.tripTitle,
        arrival_location: state.tripData.arrival_location || '',
        departure_location: state.tripData.departure_location || '',
        locations: state.locations,
        connections: state.connections
    };
    saveData(data);
}

/**
 * Get update callbacks object
 */
function getUpdateCallbacks() {
    return {
        save: saveCurrentState,
        updateList: () => updateLocationsList(state.locations, getVisibilityFilters(), (count) => updateClearAllButton(count)),
        updateFilters: () => updateFilterCounts(state.locations),
        updateTripSummary: () => updateTripSummary(
            state.locations, 
            state.tripData, 
            (id) => handleDeleteLocation(id),
            saveCurrentState,
            () => updateLocationsList(state.locations, getVisibilityFilters(), (count) => updateClearAllButton(count)),
            state.markers
        )
    };
}

/**
 * Handle location deletion
 */
async function handleDeleteLocation(id) {
    await deleteLocation(id, state, getUpdateCallbacks());
}

/**
 * Handle view location
 */
function handleFocusLocation(id) {
    focusLocation(id, state.locations, state.markers);
}

/**
 * Update trip title display
 */
function handleUpdateTripTitle() {
    state.tripTitle = document.getElementById('tripTitle').value.trim();
    const titleDisplay = document.getElementById('tripTitleDisplay');
    
    if (titleDisplay) {
        titleDisplay.textContent = state.tripTitle ? `✈️ ${state.tripTitle}` : '🗺️ Trip Itinerary';
    }
    
    saveCurrentState();
}

/**
 * Handle add location from form
 */
function handleAddLocation() {
    addLocation(state, getUpdateCallbacks());
}

/**
 * Handle start connection mode
 */
function handleStartConnectionMode() {
    startConnectionMode(state.locations);
}

/**
 * Handle export data
 */
function handleExportData() {
    const data = {
        title: state.tripTitle,
        arrival_location: state.tripData.arrival_location || '',
        departure_location: state.tripData.departure_location || '',
        locations: state.locations,
        connections: state.connections,
        exportDate: new Date().toISOString()
    };
    
    const dataStr = JSON.stringify(data, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    const filename = state.tripTitle ? state.tripTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase() + '.trip' : 'planpilot-trip.trip';
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
    
    // Show success message
    showAlert(`Your trip has been successfully saved!\n\nFile: ${filename}\n\nCheck your Downloads folder.`, '💾 Trip Saved');
}

/**
 * Handle share trip
 */
async function handleShareTrip() {
    // Check if Web Share API is supported
    if (!navigator.share || !navigator.canShare) {
        showAlert('Sharing is not supported on this browser.\n\nPlease use the Save button and share the file manually.', 'Share Not Available');
        return;
    }
    
    // Create the trip data
    const data = {
        title: state.tripTitle,
        arrival_location: state.tripData.arrival_location || '',
        departure_location: state.tripData.departure_location || '',
        locations: state.locations,
        connections: state.connections,
        exportDate: new Date().toISOString()
    };
    
    // Check if there's data to share
    if (state.locations.length === 0) {
        showAlert('No trip data to share. Please add locations first.', 'Nothing to Share');
        return;
    }
    
    const dataStr = JSON.stringify(data, null, 2);
    const filename = state.tripTitle ? state.tripTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase() + '.trip' : 'planpilot-trip.trip';
    const blob = new Blob([dataStr], { type: 'application/json' });
    const file = new File([blob], filename, { type: 'application/json' });
    
    // Check if file sharing is supported
    if (!navigator.canShare({ files: [file] })) {
        showAlert('File sharing is not supported on this browser.\n\nPlease use the Save button and share the file manually.', 'Share Not Available');
        return;
    }
    
    try {
        await navigator.share({
            title: state.tripTitle || 'PlanPilot Trip',
            text: 'Check out my trip plan! Open this file in PlanPilot: https://www.ppilot.co.uk',
            files: [file]
        });
        
        // Success - no alert needed as user saw native share dialog
        console.log('Trip shared successfully');
    } catch (error) {
        // User cancelled or error occurred
        if (error.name !== 'AbortError') {
            console.error('Error sharing trip:', error);
            showAlert('Could not share trip. Please try using the Save button instead.', 'Share Failed');
        }
    }
}

/**
 * Handle import data button click
 */
function handleImportData() {
    openImportModal();
}

/**
 * Process import from file or text
 */
function handleProcessImport() {
    const fileInput = document.getElementById('importFile');
    const textInput = document.getElementById('importText').value.trim();
    
    // Check if a file was selected
    if (fileInput.files && fileInput.files.length > 0) {
        const file = fileInput.files[0];
        const reader = new FileReader();
        
        reader.onload = function(e) {
            try {
                const data = JSON.parse(e.target.result);
                importDataFromJSON(data);
            } catch (error) {
                showAlert('Error reading file: ' + error.message, 'File Error');
            }
        };
        
        reader.onerror = function() {
            showAlert('Error reading file. Please try again.', 'File Error');
        };
        
        reader.readAsText(file);
    } 
    // Otherwise, check if text was pasted
    else if (textInput) {
        try {
            const data = JSON.parse(textInput);
            importDataFromJSON(data);
        } catch (e) {
            showAlert('Error parsing JSON: ' + e.message, 'JSON Error');
        }
    } 
    // No input provided
    else {
        showAlert('Please select a JSON file or paste JSON data', 'No Input');
    }
}

/**
 * Import data from JSON object
 * @param {Object} data - The trip data to import
 * @param {boolean} fromAIGeneration - Whether this import is from AI trip generation
 */
function importDataFromJSON(data, fromAIGeneration = false) {
    const map = getMap();
    
    try {
        if (!data.locations || !Array.isArray(data.locations)) {
            throw new Error('Invalid data format: missing or invalid "locations" array');
        }

        // Clear existing data
        clearAllData(false);

        // Import new data
        state.tripTitle = data.title || '';
        document.getElementById('tripTitle').value = state.tripTitle;
        const titleDisplay = document.getElementById('tripTitleDisplay');
        if (titleDisplay) {
            titleDisplay.textContent = state.tripTitle ? `✈️ ${state.tripTitle}` : '🗺️ Trip Itinerary';
        }
        
        // Import trip metadata
        state.tripData.arrival_location = data.arrival_location || '';
        state.tripData.departure_location = data.departure_location || '';
        
        state.locations = data.locations;
        state.connections = data.connections || [];

        state.locations.forEach(loc => addMarker(loc, state.markers, state.locations, state.connections, state.connectionLines, saveCurrentState));
        state.connections.forEach(conn => drawConnection(conn, state.locations, state.connectionLines));
        
        updateLocationsList(state.locations, getVisibilityFilters(), (count) => updateClearAllButton(count));
        updateFilterCounts(state.locations);
        updateTripSummary(
            state.locations, 
            state.tripData, 
            (id) => handleDeleteLocation(id),
            saveCurrentState,
            () => updateLocationsList(state.locations, getVisibilityFilters(), (count) => updateClearAllButton(count)),
            state.markers
        );
        saveCurrentState();

        closeImportModal();
        
        // If from AI generation, open trip summary and pan to first location
        if (fromAIGeneration) {
            // Find first key location
            const keyLocations = state.locations.filter(loc => loc.type === 'key-location');
            
            if (keyLocations.length > 0) {
                // Open trip summary panel
                openTripSummary(
                    state.locations,
                    state.tripData,
                    (id) => handleDeleteLocation(id),
                    saveCurrentState,
                    () => updateLocationsList(state.locations, getVisibilityFilters(), (count) => updateClearAllButton(count)),
                    state.markers
                );
                
                // Pan to first location after a brief delay to allow rendering
                setTimeout(() => {
                    const firstLocation = keyLocations[0];
                    if (map && firstLocation.lat && firstLocation.lng) {
                        map.setView([firstLocation.lat, firstLocation.lng], 12, { animate: true });
                        if (state.markers[firstLocation.id]) {
                            state.markers[firstLocation.id].openPopup();
                        }
                    }
                }, 500);
            }
        }
        
        showAlert('Data loaded successfully!', '🎉 Success');
    } catch (e) {
        showAlert('Error loading data: ' + e.message, 'Load Error');
    }
}

/**
 * Handle clear all
 */
async function handleClearAll() {
    console.log('clearAll called');
    console.log('Current locations:', state.locations.length);
    
    const confirmed = await showConfirm(
        'Are you sure you want to clear all locations and connections? This cannot be undone.',
        'Clear All Data'
    );
    
    if (!confirmed) {
        console.log('User cancelled clear all');
        return;
    }
    
    console.log('User confirmed clear all');
    clearAllData(true);
}

/**
 * Clear all data
 */
function clearAllData(showConfirmation) {
    const map = getMap();
    console.log('clearAllData called, showConfirmation:', showConfirmation);
    
    try {
        // Remove all markers
        Object.values(state.markers).forEach((marker) => {
            try {
                map.removeLayer(marker);
            } catch (e) {
                console.error('Error removing marker:', e);
            }
        });
        state.markers = {};

        // Remove all connection lines
        clearAllConnectionLines(state.connectionLines);

        // Clear data
        state.tripTitle = '';
        document.getElementById('tripTitle').value = '';
        const titleDisplay = document.getElementById('tripTitleDisplay');
        if (titleDisplay) {
            titleDisplay.textContent = '🗺️ Trip Itinerary';
        }
        state.locations = [];
        state.connections = [];
        state.tripData.arrival_location = '';
        state.tripData.departure_location = '';

        updateLocationsList(state.locations, getVisibilityFilters(), (count) => updateClearAllButton(count));
        updateFilterCounts(state.locations);
        updateTripSummary(
            state.locations, 
            state.tripData, 
            (id) => handleDeleteLocation(id),
            saveCurrentState,
            () => updateLocationsList(state.locations, getVisibilityFilters(), (count) => updateClearAllButton(count)),
            state.markers
        );
        saveCurrentState();
        
        // Open sidebar on mobile after clearing all data
        openSidebarOnMobileIfEmpty(state.locations);

        if (showConfirmation) {
            showAlert('All data cleared', '✅ Success');
        }
    } catch (error) {
        console.error('Error in clearAllData:', error);
        showAlert('Error clearing data: ' + error.message, 'Error');
    }
}

/**
 * Handle apply filters
 */
function handleApplyFilters() {
    applyFilters(
        state.locations, 
        state.markers, 
        () => updateLocationsList(state.locations, getVisibilityFilters(), (count) => updateClearAllButton(count))
    );
}

/**
 * Handle toggle filter
 */
function handleToggleFilter(checkboxId) {
    toggleFilter(checkboxId);
    handleApplyFilters();
}

/**
 * Handle toggle trip summary
 */
function handleToggleTripSummary() {
    toggleTripSummary(
        state.locations, 
        state.tripData, 
        (id) => handleDeleteLocation(id),
        saveCurrentState,
        () => updateLocationsList(state.locations, getVisibilityFilters(), (count) => updateClearAllButton(count)),
        state.markers
    );
}

/**
 * Handle planning form submit
 */
function handlePlanningSubmit(event) {
    handlePlanningFormSubmit(event, importDataFromJSON);
}

/**
 * Handle change map style
 */
function handleChangeMapStyle(style) {
    changeMapStyle(style);
}

/**
 * Refresh all markers after notes update (to show updated popup content)
 */
function refreshMarkerPopup(locationId) {
    const location = state.locations.find(l => l.id === locationId);
    if (location && state.markers[locationId]) {
        const popupContent = createPopupContent(location);
        state.markers[locationId].setPopupContent(popupContent);
    }
}

/**
 * Handle open notes modal
 * @param {string} locationId - Location ID
 */
function handleOpenNotesModal(locationId) {
    openNotesModal(locationId, state.locations, () => {
        // Callback when notes are saved - refresh UI
        refreshMarkerPopup(locationId);
        updateLocationsList(state.locations, getVisibilityFilters(), (count) => updateClearAllButton(count));
        updateTripSummary(
            state.locations, 
            state.tripData, 
            (id) => handleDeleteLocation(id),
            saveCurrentState,
            () => updateLocationsList(state.locations, getVisibilityFilters(), (count) => updateClearAllButton(count)),
            state.markers
        );
    });
}

/**
 * Handle save notes
 */
function handleSaveNotes() {
    saveNotes(state.locations, saveCurrentState);
}

/**
 * Handle delete notes
 */
function handleDeleteNotes() {
    deleteNotes(state.locations, saveCurrentState);
}

/**
 * Handle close notes modal
 */
function handleCloseNotesModal() {
    closeNotesModal();
}

// ============================================
// LOCATION SEARCH HANDLERS
// ============================================

/**
 * Handle open location search modal
 * @param {string} locationId - Location ID
 * @param {string} locationName - Location name
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 */
function handleOpenLocationSearchModal(locationId, locationName, lat, lng) {
    openLocationSearchModal(locationId, locationName, lat, lng);
}

/**
 * Handle close location search modal
 */
function handleCloseLocationSearchModal() {
    closeLocationSearchModal();
}

/**
 * Handle search type change
 */
function handleSearchTypeChangeWrapper() {
    handleSearchTypeChange();
}

/**
 * Submit location search
 */
async function handleSubmitLocationSearch() {
    const searchLocation = getCurrentSearchLocation();
    if (!searchLocation) {
        showAlert('No location selected', 'Error');
        return;
    }
    
    const searchType = document.getElementById('searchType').value;
    const customQuery = document.getElementById('customQuery').value.trim();
    
    // Validate custom query if needed
    if (searchType === 'custom' && !customQuery) {
        showAlert('Please enter a search query', 'Missing Query');
        return;
    }
    
    // Close the search modal
    closeLocationSearchModal();
    
    try {
        // Call the API
        const results = await searchLocationInfo({
            locationName: searchLocation.name,
            lat: searchLocation.lat,
            lng: searchLocation.lng,
            searchType: searchType,
            customQuery: customQuery
        });
        
        // Open results modal
        openSearchResultsModal(results, searchType);
    } catch (error) {
        console.error('Location search failed:', error);
        // Error already shown by searchLocationInfo
    }
}

/**
 * Handle result checkbox change wrapper
 * @param {string} resultId - Result ID
 */
function handleResultCheckboxChangeWrapper(resultId) {
    handleResultCheckboxChange(resultId);
}

/**
 * Set result action wrapper
 * @param {string} action - 'add' or 'replace'
 */
function handleSetResultAction(action) {
    setResultAction(action);
}

/**
 * Apply search results to the trip
 */
async function handleApplySearchResults() {
    const searchType = document.getElementById('searchType')?.value;
    const resultsData = getSearchResultsData();
    
    if (!resultsData || !resultsData.data) {
        showAlert('No results to apply', 'Error');
        return;
    }
    
    // Handle tips - save as notes
    if (searchType === 'tips' && resultsData.data.tips) {
        const saveTipsCheckbox = document.getElementById('saveTipsAsNotes');
        if (saveTipsCheckbox && saveTipsCheckbox.checked) {
            // Find the location and add tips to notes
            const location = state.locations.find(l => l.id === resultsData.locationId);
            if (location) {
                const existingNotes = location.notes || '';
                const separator = existingNotes ? '\n\n---\n\n' : '';
                location.notes = existingNotes + separator + '💡 AI Tips:\n' + resultsData.data.tips;
                
                saveCurrentState();
                updateTripSummary(
                    state.locations, 
                    state.tripData, 
                    (id) => handleDeleteLocation(id),
                    saveCurrentState,
                    () => updateLocationsList(state.locations, getVisibilityFilters(), (count) => updateClearAllButton(count)),
                    state.markers
                );
                
                closeSearchResultsModal();
                showAlert('Tips saved to location notes!', '✅ Success');
                return;
            }
        }
        closeSearchResultsModal();
        return;
    }
    
    // Handle location results (accommodations, attractions, etc.)
    if (!resultsData.data.results || !Array.isArray(resultsData.data.results)) {
        showAlert('No location results to apply', 'Error');
        return;
    }
    
    if (resultsData.selectedIds.length === 0) {
        showAlert('Please select at least one result', 'No Selection');
        return;
    }
    
    if (!resultsData.action) {
        showAlert('Please choose whether to add or replace results', 'Choose Action');
        return;
    }
    
    // Get selected results
    const selectedResults = resultsData.data.results.filter(r => 
        resultsData.selectedIds.includes(r.id)
    );
    
    // Apply merge logic
    mergeLocationResults(selectedResults, resultsData.action, resultsData.locationId);
    
    closeSearchResultsModal();
    
    const actionLabel = resultsData.action === 'add' ? 'added to' : 'replaced in';
    showAlert(`${selectedResults.length} result(s) ${actionLabel} your trip!`, '✅ Success');
}

/**
 * Merge search results into trip locations
 * @param {Array} newResults - New results to add
 * @param {string} action - 'add' or 'replace'
 * @param {string} keyLocationId - ID of the key location these belong to
 */
function mergeLocationResults(newResults, action, keyLocationId) {
    const map = getMap();
    
    // Find the key location for order reference
    const keyLocation = state.locations.find(l => l.id === keyLocationId);
    const keyLocationOrder = keyLocation ? (keyLocation.order || 1) : 1;
    
    // Determine types of results being added
    const resultTypes = [...new Set(newResults.map(r => r.type))];
    
    if (action === 'replace') {
        // Remove existing items of the same types near this key location
        const locationsToRemove = state.locations.filter(loc => {
            if (!resultTypes.includes(loc.type)) return false;
            if (loc.type === 'key-location') return false;
            
            // Check if this location is associated with the key location
            // (i.e., it's the nearest key location)
            const keyLocations = state.locations.filter(l => l.type === 'key-location');
            let nearestKeyLocId = null;
            let nearestDistance = Infinity;
            
            for (const kl of keyLocations) {
                const distance = getDistance(kl.lat, kl.lng, loc.lat, loc.lng);
                if (distance < nearestDistance) {
                    nearestDistance = distance;
                    nearestKeyLocId = kl.id;
                }
            }
            
            return nearestKeyLocId === keyLocationId;
        });
        
        // Remove markers and locations
        locationsToRemove.forEach(loc => {
            if (state.markers[loc.id]) {
                map.removeLayer(state.markers[loc.id]);
                delete state.markers[loc.id];
            }
        });
        
        state.locations = state.locations.filter(loc => 
            !locationsToRemove.some(r => r.id === loc.id)
        );
    }
    
    // Find the max order among existing locations
    const maxOrder = Math.max(...state.locations.map(l => l.order || 0), 0);
    
    // Add new results
    newResults.forEach((result, index) => {
        // Generate a unique ID
        const newId = `search-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        const newLocation = {
            id: newId,
            type: result.type,
            name: result.name,
            description: result.description || '',
            price: result.price || '',
            link: result.link || '',
            lat: result.lat,
            lng: result.lng,
            order: maxOrder + index + 1,
            duration: result.duration || ''
        };
        
        // Add to locations
        state.locations.push(newLocation);
        
        // Add marker
        addMarker(newLocation, state.markers, state.locations, state.connections, state.connectionLines, saveCurrentState);
    });
    
    // Update UI
    saveCurrentState();
    updateLocationsList(state.locations, getVisibilityFilters(), (count) => updateClearAllButton(count));
    updateFilterCounts(state.locations);
    updateTripSummary(
        state.locations, 
        state.tripData, 
        (id) => handleDeleteLocation(id),
        saveCurrentState,
        () => updateLocationsList(state.locations, getVisibilityFilters(), (count) => updateClearAllButton(count)),
        state.markers
    );
}

/**
 * Handle close search results modal
 */
function handleCloseSearchResultsModal() {
    closeSearchResultsModal();
}

// ============================================
// INITIALIZATION
// ============================================

/**
 * Load saved data from localStorage
 */
function loadSavedData() {
    const map = getMap();
    const saved = loadData();
    
    if (saved) {
        // Load title
        state.tripTitle = saved.title || '';
        document.getElementById('tripTitle').value = state.tripTitle;
        const titleDisplay = document.getElementById('tripTitleDisplay');
        if (titleDisplay) {
            titleDisplay.textContent = state.tripTitle ? `✈️ ${state.tripTitle}` : '🗺️ Trip Itinerary';
        }
        
        // Load trip metadata
        state.tripData.arrival_location = saved.arrival_location || '';
        state.tripData.departure_location = saved.departure_location || '';
        
        state.locations = saved.locations || [];
        state.connections = saved.connections || [];
        
        // Add markers and connections
        state.locations.forEach(loc => {
            addMarker(loc, state.markers, state.locations, state.connections, state.connectionLines, saveCurrentState);
        });
        
        state.connections.forEach(conn => {
            drawConnection(conn, state.locations, state.connectionLines);
        });
        
        console.log('loadData completed');
    }
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
    const map = getMap();
    
    // Map click handler
    map.on('click', function(e) {
        if (isConnectionMode()) {
            return; // Don't set coordinates in connection mode
        }
        state.selectedCoords = e.latlng;
        document.getElementById('locationCoords').value = `${e.latlng.lat.toFixed(5)}, ${e.latlng.lng.toFixed(5)}`;
    });
    
    // Setup modal close handlers
    setupModalCloseHandlers();
    
    // Event delegation for locations list
    const locationsList = document.getElementById('locationsList');
    if (locationsList) {
        locationsList.addEventListener('click', function(e) {
            let target = e.target;
            
            while (target && target !== locationsList) {
                if (target.classList && target.classList.contains('view-btn')) {
                    e.preventDefault();
                    e.stopPropagation();
                    const id = target.getAttribute('data-id');
                    if (id) handleFocusLocation(id);
                    return;
                }
                
                if (target.classList && target.classList.contains('delete-btn')) {
                    e.preventDefault();
                    e.stopPropagation();
                    const id = target.getAttribute('data-id');
                    if (id) handleDeleteLocation(id);
                    return;
                }
                
                target = target.parentElement;
            }
        });
    }

    // Trip summary events are now handled within trip-summary.js via card event listeners
}

/**
 * Initialize the application
 */
function init() {
    console.log('=== APPLICATION INITIALIZING ===');
    console.log('Current timestamp:', new Date().toISOString());
    
    // Initialize map
    initMap();
    
    // Load saved data
    loadSavedData();
    
    // Setup event listeners
    setupEventListeners();
    
    // Initialize panel drag functionality
    initPanelDrag();
    
    // Update UI
    updateClearAllButton(state.locations.length);
    updateFilterCounts(state.locations);
    updateTripSummary(
        state.locations, 
        state.tripData, 
        (id) => handleDeleteLocation(id),
        saveCurrentState,
        () => updateLocationsList(state.locations, getVisibilityFilters(), (count) => updateClearAllButton(count)),
        state.markers
    );
    updateLocationsList(state.locations, getVisibilityFilters(), (count) => updateClearAllButton(count));
    
    // Open sidebar on mobile if no key locations exist (for new users)
    openSidebarOnMobileIfEmpty(state.locations);
    
    console.log('=== INITIALIZATION COMPLETE ===');
}

// ============================================
// GLOBAL EXPORTS (for HTML onclick handlers)
// ============================================
window.showLogoFallback = showLogoFallback;
window.updateTripTitle = handleUpdateTripTitle;
window.toggleEditMode = toggleEditMode;
window.toggleDeleteMode = toggleDeleteMode;
window.addLocation = handleAddLocation;
window.startConnectionMode = handleStartConnectionMode;
window.cancelConnectionMode = cancelConnectionMode;
window.focusLocation = handleFocusLocation;
window.deleteLocation = handleDeleteLocation;
window.clearAll = handleClearAll;
window.exportData = handleExportData;
window.shareTrip = handleShareTrip;
window.importData = handleImportData;
window.processImport = handleProcessImport;
window.closeImportModal = closeImportModal;
window.clearImportText = clearImportText;
window.clearImportFile = clearImportFile;
window.openPlanningModal = openPlanningModal;
window.closePlanningModal = closePlanningModal;
window.handlePlanningFormSubmit = handlePlanningSubmit;
window.openInfoModal = openInfoModal;
window.closeInfoModal = closeInfoModal;
window.closeLocationDetailsModal = closeLocationDetailsModal;
window.toggleSidebar = toggleSidebar;
window.closeSidebar = closeSidebar;
window.applyFilters = handleApplyFilters;
window.toggleFilter = handleToggleFilter;
window.toggleMapControls = toggleMapControls;
window.changeMapStyle = handleChangeMapStyle;
window.toggleTripSummary = handleToggleTripSummary;
window.showConfirm = showConfirm;
window.forceReset = forceReset;
window.openNotesModal = handleOpenNotesModal;
window.saveNotes = handleSaveNotes;
window.deleteNotes = handleDeleteNotes;
window.closeNotesModal = handleCloseNotesModal;

// Location search modal handlers
window.openLocationSearchModal = handleOpenLocationSearchModal;
window.closeLocationSearchModal = handleCloseLocationSearchModal;
window.handleSearchTypeChange = handleSearchTypeChangeWrapper;
window.submitLocationSearch = handleSubmitLocationSearch;
window.handleResultCheckboxChange = handleResultCheckboxChangeWrapper;
window.setResultAction = handleSetResultAction;
window.applySearchResults = handleApplySearchResults;
window.closeSearchResultsModal = handleCloseSearchResultsModal;

// Run initialization when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

