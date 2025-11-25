/**
 * PlanPilot - UI Module
 * Sidebar toggle, mobile menu, edit mode, utilities
 */

// Edit mode state
let editModeActive = false;

/**
 * Toggle sidebar on mobile
 */
export function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const backdrop = document.getElementById('sidebarBackdrop');
    const hamburger = document.getElementById('hamburgerBtn');
    
    sidebar.classList.toggle('active');
    backdrop.classList.toggle('active');
    hamburger.classList.toggle('active');
}

/**
 * Close sidebar
 */
export function closeSidebar() {
    const sidebar = document.getElementById('sidebar');
    const backdrop = document.getElementById('sidebarBackdrop');
    const hamburger = document.getElementById('hamburgerBtn');
    
    sidebar.classList.remove('active');
    backdrop.classList.remove('active');
    hamburger.classList.remove('active');
}

/**
 * Close sidebar on mobile only
 */
export function closeSidebarOnMobile() {
    if (window.innerWidth < 768) {
        closeSidebar();
    }
}

/**
 * Toggle edit mode
 */
export function toggleEditMode() {
    editModeActive = !editModeActive;
    const container = document.getElementById('editTripContainer');
    const icon = document.getElementById('editModeIcon');
    const button = document.getElementById('trip-summary-edit-btn');
    
    if (editModeActive) {
        container.style.display = 'block';
        icon.textContent = '✖️';
        if (button) {
            button.classList.add('active');
            button.title = 'Hide Editor';
        }
    } else {
        container.style.display = 'none';
        icon.textContent = '✏️';
        if (button) {
            button.classList.remove('active');
            button.title = 'Edit Trip';
        }
    }
}

/**
 * Get edit mode state
 * @returns {boolean}
 */
export function isEditModeActive() {
    return editModeActive;
}

/**
 * Reset edit mode to inactive state
 */
export function resetEditMode() {
    editModeActive = false;
    const container = document.getElementById('editTripContainer');
    const icon = document.getElementById('editModeIcon');
    const button = document.getElementById('trip-summary-edit-btn');
    
    if (container) {
        container.style.display = 'none';
    }
    if (icon) {
        icon.textContent = '✏️';
    }
    if (button) {
        button.classList.remove('active');
        button.title = 'Edit Trip';
    }
}

/**
 * Show logo fallback if image doesn't load
 */
export function showLogoFallback() {
    const logoContainer = document.getElementById('logoContainer');
    const logoImage = document.getElementById('logoImage');
    
    // Hide the broken image
    if (logoImage) {
        logoImage.style.display = 'none';
    }
    
    // Create fallback orange circle
    const fallback = document.createElement('div');
    fallback.className = 'logo-fallback';
    logoContainer.appendChild(fallback);
    
    console.log('Logo image not found, using orange circle fallback');
}

/**
 * Update clear all button state
 * @param {number} locationCount - Number of locations
 */
export function updateClearAllButton(locationCount) {
    const clearAllBtn = document.getElementById('clearAllBtn');
    if (clearAllBtn) {
        if (locationCount === 0) {
            clearAllBtn.disabled = true;
        } else {
            clearAllBtn.disabled = false;
        }
    }
}

