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

/**
 * Copy guide to clipboard
 */
export async function copyGuideToClipboard(event) {
    const guideText = `# PlanPilot JSON Format Guide

## Required JSON Structure
The JSON file must contain a "locations" array and optionally a "title" and "connections" fields:

{
  "title": "Your Trip Name",
  "locations": [ ... ],
  "connections": [ ... ]
}

## Title Field (Optional)
- "title" (string, optional): The name of your trip or holiday
- This will be displayed prominently at the top center of the map
- Example: "Sri Lanka Honeymoon", "European Adventure 2025"

## Location Object Format
Each location in the "locations" array must have the following properties:

- "id" (string, required): Unique identifier for the location
- "type" (string, required): Must be one of:
  - "key-location" - Major destinations (purple markers with 📍)
  - "accommodation" - Hotels, rentals (green markers with 🏨)
  - "attraction" - Places to visit (red markers with ⭐)
- "name" (string, required): Display name of the location
- "description" (string, optional): Additional notes or details
- "price" (string, optional): Cost information (e.g., "$150/night", "€25 entry")
- "link" (string, optional): URL for booking, website, or reference
- "lat" (number, required): Latitude coordinate (-90 to 90)
- "lng" (number, required): Longitude coordinate (-180 to 180)
- "order" (number, required): Visit sequence number (1, 2, 3, etc.)
- "duration" (string, required): Stay length (e.g., "3 days", "2 nights", "2 hours")

## Connection Object Format
Each connection in the "connections" array connects two Key Locations:

- "id" (string, required): Unique identifier (typically "fromId-toId")
- "from" (string, required): ID of the first Key Location
- "to" (string, required): ID of the second Key Location

⚠️ Note: Connections only work between locations with type "key-location". Make sure both "from" and "to" reference valid Key Location IDs.

## Complete Example

{
  "title": "Paris & Rome Adventure",
  "locations": [
    {
      "id": "1",
      "type": "key-location",
      "name": "Paris",
      "description": "City of Light, arrival point",
      "price": "",
      "link": "",
      "lat": 48.8566,
      "lng": 2.3522,
      "order": 1,
      "duration": "3 days"
    },
    {
      "id": "2",
      "type": "accommodation",
      "name": "Hotel de Paris",
      "description": "5-star hotel near Eiffel Tower",
      "price": "$250/night",
      "link": "https://booking.com/hotel-de-paris",
      "lat": 48.8584,
      "lng": 2.2945,
      "order": 2,
      "duration": "3 nights"
    },
    {
      "id": "3",
      "type": "attraction",
      "name": "Louvre Museum",
      "description": "World's largest art museum",
      "price": "€17 entry",
      "link": "https://louvre.fr",
      "lat": 48.8606,
      "lng": 2.3376,
      "order": 3,
      "duration": "3 hours"
    },
    {
      "id": "4",
      "type": "key-location",
      "name": "Rome",
      "description": "Next destination",
      "price": "",
      "link": "",
      "lat": 41.9028,
      "lng": 12.4964,
      "order": 4,
      "duration": "4 days"
    }
  ],
  "connections": [
    {
      "id": "1-4",
      "from": "1",
      "to": "4"
    }
  ]
}

## AI Agent Instructions
When creating a JSON file for this PlanPilot:

1. Add a descriptive "title" field that summarizes the trip (e.g., "Sri Lanka Honeymoon", "Summer Europe Tour 2025")
2. Ensure all required fields are present for each location
3. Add "order" field (number) to sequence locations chronologically (1, 2, 3, etc.)
4. Add "duration" field (string) for stay length: "3 days" for cities, "2 nights" for hotels, "2 hours" for attractions
5. Use consistent ID formats (strings, unique)
6. Verify coordinates are valid (use geocoding if needed)
7. Only create connections between "key-location" types
8. Include helpful descriptions to provide context
9. Add price and link information where relevant for accommodation and attractions
10. Validate JSON syntax before importing
`;

    try {
        await navigator.clipboard.writeText(guideText);
        
        // Visual feedback
        const button = event.target;
        const originalText = button.textContent;
        button.textContent = '✅ Copied!';
        button.style.background = '#2ecc71';
        
        setTimeout(() => {
            button.textContent = originalText;
            button.style.background = '';
        }, 2000);
        
        console.log('Guide copied to clipboard');
    } catch (err) {
        console.error('Failed to copy:', err);
        showAlert('Failed to copy to clipboard. Please try again.', 'Copy Failed');
    }
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
            } else if (e.target.id === 'confirmModal') {
                // Click outside confirm modal = cancel
                document.getElementById('confirmNo').click();
            }
        }
    });
}




