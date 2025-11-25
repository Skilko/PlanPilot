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
    copyGuideToClipboard,
    setupModalCloseHandlers
} from './modals.js';
import { 
    toggleSidebar, closeSidebar, 
    toggleEditMode, showLogoFallback,
    updateClearAllButton
} from './ui.js';
import { 
    addMarker, addLocation, focusLocation, deleteLocation,
    updateLocationsList, getDistance
} from './locations.js';
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
    updateTripSummary, toggleTripSummary, showLocationDetails, initPanelDrag, resetPanelPosition 
} from './trip-summary.js';
import { handlePlanningFormSubmit } from './api.js';

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
    const filename = state.tripTitle ? state.tripTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase() + '.json' : 'planpilot-trip.json';
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
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
 */
function importDataFromJSON(data) {
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
    
    console.log('=== INITIALIZATION COMPLETE ===');
}

// ============================================
// GLOBAL EXPORTS (for HTML onclick handlers)
// ============================================
window.showLogoFallback = showLogoFallback;
window.updateTripTitle = handleUpdateTripTitle;
window.toggleEditMode = toggleEditMode;
window.addLocation = handleAddLocation;
window.startConnectionMode = handleStartConnectionMode;
window.cancelConnectionMode = cancelConnectionMode;
window.focusLocation = handleFocusLocation;
window.deleteLocation = handleDeleteLocation;
window.clearAll = handleClearAll;
window.exportData = handleExportData;
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
window.copyGuideToClipboard = copyGuideToClipboard;
window.toggleSidebar = toggleSidebar;
window.closeSidebar = closeSidebar;
window.applyFilters = handleApplyFilters;
window.toggleFilter = handleToggleFilter;
window.toggleMapControls = toggleMapControls;
window.changeMapStyle = handleChangeMapStyle;
window.toggleTripSummary = handleToggleTripSummary;
window.showConfirm = showConfirm;
window.forceReset = forceReset;

// Run initialization when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

