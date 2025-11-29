/**
 * PlanPilot - Storage Module
 * LocalStorage save/load operations
 */

const STORAGE_KEY = 'planPilotData';

/**
 * Save trip data to localStorage
 * @param {Object} data - The trip data to save
 */
export function saveData(data) {
    console.log('saveData called. Saving:', data);
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        console.log('Data saved to localStorage successfully');
        
        // Verify it was saved
        const verify = localStorage.getItem(STORAGE_KEY);
        console.log('Verification - data in localStorage:', verify ? JSON.parse(verify) : 'null');
    } catch (e) {
        console.error('Error saving data to localStorage:', e);
    }
}

/**
 * Load trip data from localStorage
 * @returns {Object|null} The saved trip data or null if none exists
 */
export function loadData() {
    console.log('loadData called');
    const saved = localStorage.getItem(STORAGE_KEY);
    console.log('Data from localStorage:', saved);
    
    if (saved) {
        try {
            const data = JSON.parse(saved);
            console.log('Parsed data:', data);
            return data;
        } catch (e) {
            console.error('Error loading data:', e);
            return null;
        }
    }
    
    console.log('No saved data found in localStorage');
    return null;
}

/**
 * Clear all data from localStorage
 */
export function clearStorage() {
    console.log('Clearing localStorage...');
    localStorage.removeItem(STORAGE_KEY);
}

/**
 * Force reset - clear storage and reload page
 */
export function forceReset() {
    console.log('=== FORCE RESET CALLED ===');
    clearStorage();
    console.log('Reloading page...');
    location.reload();
}




