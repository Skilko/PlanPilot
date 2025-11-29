/**
 * PlanPilot - Markers Module
 * Marker creation and popup content
 */

import { MARKER_COLORS, MARKER_ICONS } from './config.js';

/**
 * Create a custom Leaflet div icon
 * @param {string} type - Location type (key-location, accommodation, attraction)
 * @returns {L.DivIcon} - Leaflet div icon
 */
export function createCustomIcon(type) {
    const color = MARKER_COLORS[type];
    const icon = MARKER_ICONS[type];
    
    return L.divIcon({
        className: 'custom-marker',
        html: `<div style="
            width: 36px;
            height: 36px;
            background-color: ${color};
            border: 3px solid white;
            border-radius: 50%;
            box-shadow: 0 3px 10px rgba(0,0,0,0.3);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 18px;
        ">${icon}</div>`,
        iconSize: [36, 36],
        iconAnchor: [18, 18],
        popupAnchor: [0, -18]
    });
}

/**
 * Create popup content for a location
 * @param {Object} location - Location object
 * @returns {string} - HTML content for popup
 */
export function createPopupContent(location) {
    const typeIcon = MARKER_ICONS[location.type];
    const typeName = location.type.replace('-', ' ').toUpperCase();
    
    let popupContent = `
        <div>
            <div class="popup-header ${location.type}">
                <div class="popup-header-title">${typeIcon} ${location.name}</div>
                <div class="popup-header-type">${typeName}</div>
            </div>
            <div class="popup-body">
                ${location.description ? `
                    <div class="popup-section">
                        <p class="popup-description">${location.description}</p>
                    </div>
                ` : ''}
                ${location.price ? `
                    <div class="popup-section">
                        <div class="popup-info-row">
                            <div class="popup-info-label">💰 Price:</div>
                            <div class="popup-info-value">${location.price}</div>
                        </div>
                    </div>
                ` : ''}
                ${location.link ? `
                    <div class="popup-section">
                        <a href="${location.link}" target="_blank" rel="noopener noreferrer" 
                           style="display: block;
                                  text-align: center;
                                  background: linear-gradient(135deg, #FFA726 0%, #FF9800 100%);
                                  color: white;
                                  padding: 12px 20px;
                                  border-radius: 8px;
                                  text-decoration: none;
                                  font-size: 14px;
                                  font-weight: 600;
                                  transition: all 0.3s;
                                  box-shadow: 0 2px 8px rgba(255, 167, 38, 0.3);"
                           onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 12px rgba(255, 167, 38, 0.5)';"
                           onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 2px 8px rgba(255, 167, 38, 0.3)';">
                            🔗 Visit Website
                        </a>
                    </div>
                ` : ''}
            </div>
        </div>
    `;
    
    return popupContent;
}




