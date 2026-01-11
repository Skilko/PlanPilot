/**
 * PlanPilot - API Module
 * API calls for trip generation
 */

import { showLoadingOverlay, hideLoadingOverlay, showAlert, closePlanningModal } from './modals.js';

/**
 * Handle trip planning form submission
 * @param {Event} event - Form submit event
 * @param {Function} importCallback - Callback to import generated data
 */
export function handlePlanningFormSubmit(event, importCallback) {
    event.preventDefault();
    
    const responseMode = document.getElementById('planResponseMode').value;
    
    const formData = {
        destination: document.getElementById('planDestination').value.trim(),
        duration: document.getElementById('planDuration').value.trim(),
        budget: document.getElementById('planBudget').value,
        interests: document.getElementById('planInterests').value.trim().split(',').map(i => i.trim()).filter(i => i),
        mustVisit: document.getElementById('planMustVisit').value.trim(),
        responseMode: responseMode
    };
    
    generateTripWithWorkflow(formData, importCallback);
}

/**
 * Generate trip using the API workflow
 * @param {Object} formData - Trip planning form data
 * @param {Function} importCallback - Callback to import generated data
 */
export async function generateTripWithWorkflow(formData, importCallback) {
    const isProMode = formData.responseMode === 'pro';
    const loadingTitle = isProMode 
        ? 'Generating Detailed Trip Plan...' 
        : 'Generating Quick Trip Plan...';
    const loadingMessage = isProMode 
        ? 'Conducting thorough research for more options (15-30 seconds)' 
        : 'Researching destinations and gathering information (5-15 seconds)';
    
    showLoadingOverlay(loadingTitle, loadingMessage);
    closePlanningModal();
    
    try {
        const response = await fetch('/api/chat-workflow', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
            throw new Error(errorData.error || `Server error: ${response.status}`);
        }
        
        const tripData = await response.json();
        
        // Validate that we got valid trip data
        if (!tripData.locations || !Array.isArray(tripData.locations)) {
            throw new Error('Invalid response format from API');
        }
        
        // Auto-import the generated data with AI generation flag
        if (importCallback) {
            importCallback(tripData, true); // true indicates this is from AI generation
        }
        
        hideLoadingOverlay();
        
        showAlert(`Trip plan generated successfully!\n\n${tripData.locations.length} location(s) added to your map.`, '🎉 Success');
    } catch (error) {
        console.error('Error generating trip:', error);
        hideLoadingOverlay();
        showAlert('Error generating trip: ' + error.message + '\n\nYou can still use the Import button to manually add a JSON file.', '❌ Error');
    }
}

/**
 * Search for specific information about a location
 * @param {Object} params - Search parameters
 * @param {string} params.locationName - Name of the location
 * @param {number} params.lat - Latitude
 * @param {number} params.lng - Longitude
 * @param {string} params.searchType - Type of search (accommodations, attractions, restaurants, transportation, tips, custom)
 * @param {string} [params.customQuery] - Custom query for custom search type
 * @param {string} [params.additionalDetails] - Additional details/preferences for the search
 * @param {string} [params.budget] - Budget level (optional)
 * @returns {Promise<Object>} - Search results
 */
export async function searchLocationInfo(params) {
    const { locationName, lat, lng, searchType, customQuery, additionalDetails, budget } = params;
    
    // Map search types to display names for loading message
    const searchTypeLabels = {
        accommodations: 'accommodations',
        attractions: 'attractions',
        restaurants: 'restaurants',
        transportation: 'transportation options',
        tips: 'local tips',
        custom: 'information'
    };
    
    const loadingTitle = `Searching for ${searchTypeLabels[searchType] || 'information'}...`;
    const loadingMessage = `Finding ${searchTypeLabels[searchType] || 'results'} near ${locationName}`;
    
    showLoadingOverlay(loadingTitle, loadingMessage);
    
    try {
        const response = await fetch('/api/location-search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                locationName,
                lat,
                lng,
                searchType,
                customQuery,
                additionalDetails,
                budget
            })
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
            throw new Error(errorData.error || `Server error: ${response.status}`);
        }
        
        const searchData = await response.json();
        
        hideLoadingOverlay();
        
        return searchData;
    } catch (error) {
        console.error('Error searching location info:', error);
        hideLoadingOverlay();
        
        // Provide a more helpful error message
        let errorMessage = error.message;
        if (errorMessage.includes('Failed to get valid response')) {
            errorMessage = 'The AI had trouble generating results. Please try again or use different search terms.';
        }
        
        showAlert('Error searching: ' + errorMessage, '❌ Search Failed');
        throw error;
    }
}
