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




