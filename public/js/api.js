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
        
        // Auto-import the generated data
        if (importCallback) {
            importCallback(tripData);
        }
        
        hideLoadingOverlay();
        
        showAlert(`Trip plan generated successfully!\n\n${tripData.locations.length} location(s) added to your map.`, '🎉 Success');
    } catch (error) {
        console.error('Error generating trip:', error);
        hideLoadingOverlay();
        showAlert('Error generating trip: ' + error.message + '\n\nYou can still use the Import button to manually add a JSON file.', '❌ Error');
    }
}

