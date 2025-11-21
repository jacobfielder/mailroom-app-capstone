// Carrier Detection Utility
// Detects shipping carrier based on tracking number patterns

/**
 * Detect carrier from tracking number
 * @param {string} trackingNumber - The tracking number to analyze
 * @returns {Object} - Carrier information { name, code, color, trackUrl }
 */
function detectCarrier(trackingNumber) {
    if (!trackingNumber) {
        return {
            name: 'Unknown',
            code: 'unknown',
            color: '#6b7280',
            trackUrl: null
        };
    }

    // Remove spaces and convert to uppercase for matching
    const cleaned = trackingNumber.replace(/\s+/g, '').toUpperCase();

    // UPS - Starts with "1Z" and is 18 characters
    if (/^1Z[A-Z0-9]{16}$/i.test(cleaned)) {
        return {
            name: 'UPS',
            code: 'ups',
            color: '#351c15',
            trackUrl: `https://www.ups.com/track?tracknum=${cleaned}`,
            logoUrl: 'https://logo.clearbit.com/ups.com'
        };
    }

    // FedEx patterns
    // 12 digits
    if (/^\d{12}$/.test(cleaned)) {
        return {
            name: 'FedEx',
            code: 'fedex',
            color: '#4d148c',
            trackUrl: `https://www.fedex.com/fedextrack/?trknbr=${cleaned}`,
            logoUrl: 'https://logo.clearbit.com/fedex.com'
        };
    }
    // 15 digits
    if (/^\d{15}$/.test(cleaned)) {
        return {
            name: 'FedEx',
            code: 'fedex',
            color: '#4d148c',
            trackUrl: `https://www.fedex.com/fedextrack/?trknbr=${cleaned}`,
            logoUrl: 'https://logo.clearbit.com/fedex.com'
        };
    }
    // SmartPost - starts with 92 or 94
    if (/^(92|94)\d{20}$/.test(cleaned)) {
        return {
            name: 'FedEx',
            code: 'fedex',
            color: '#4d148c',
            trackUrl: `https://www.fedex.com/fedextrack/?trknbr=${cleaned}`,
            logoUrl: 'https://logo.clearbit.com/fedex.com'
        };
    }

    // USPS patterns
    // 20 digits
    if (/^\d{20}$/.test(cleaned)) {
        return {
            name: 'USPS',
            code: 'usps',
            color: '#333366',
            trackUrl: `https://tools.usps.com/go/TrackConfirmAction?tLabels=${cleaned}`,
            logoUrl: 'https://logo.clearbit.com/usps.com'
        };
    }
    // 22 digits starting with 94 or 93 or 92 or 95
    if (/^(94|93|92|95)\d{20}$/.test(cleaned)) {
        return {
            name: 'USPS',
            code: 'usps',
            color: '#333366',
            trackUrl: `https://tools.usps.com/go/TrackConfirmAction?tLabels=${cleaned}`,
            logoUrl: 'https://logo.clearbit.com/usps.com'
        };
    }
    // Priority Mail Express - starts with 9407, 9303, 9270
    if (/^(9407|9303|9270)\d{17}$/.test(cleaned)) {
        return {
            name: 'USPS',
            code: 'usps',
            color: '#333366',
            trackUrl: `https://tools.usps.com/go/TrackConfirmAction?tLabels=${cleaned}`,
            logoUrl: 'https://logo.clearbit.com/usps.com'
        };
    }
    // Certified Mail - starts with 9407
    if (/^9407\d{16}$/.test(cleaned)) {
        return {
            name: 'USPS',
            code: 'usps',
            color: '#333366',
            trackUrl: `https://tools.usps.com/go/TrackConfirmAction?tLabels=${cleaned}`,
            logoUrl: 'https://logo.clearbit.com/usps.com'
        };
    }

    // DHL - 10 or 11 digits
    if (/^\d{10,11}$/.test(cleaned)) {
        return {
            name: 'DHL',
            code: 'dhl',
            color: '#ffcc00',
            trackUrl: `https://www.dhl.com/en/express/tracking.html?AWB=${cleaned}`,
            logoUrl: 'https://logo.clearbit.com/dhl.com'
        };
    }

    // Amazon Logistics - starts with TBA
    if (/^TBA\d{12}$/i.test(cleaned)) {
        return {
            name: 'Amazon Logistics',
            code: 'amazon',
            color: '#ff9900',
            trackUrl: `https://track.amazon.com/tracking/${cleaned}`,
            logoUrl: 'https://logo.clearbit.com/amazon.com'
        };
    }

    // OnTrac - starts with C followed by 14 digits
    if (/^C\d{14}$/i.test(cleaned)) {
        return {
            name: 'OnTrac',
            code: 'ontrac',
            color: '#00447c',
            trackUrl: `https://www.ontrac.com/tracking/?number=${cleaned}`,
            logoUrl: 'https://logo.clearbit.com/ontrac.com'
        };
    }

    // LaserShip - starts with L followed by 9 digits
    if (/^L[A-Z]\d{8}$/i.test(cleaned)) {
        return {
            name: 'LaserShip',
            code: 'lasership',
            color: '#d71920',
            trackUrl: `https://www.lasership.com/track/${cleaned}`,
            logoUrl: 'https://logo.clearbit.com/lasership.com'
        };
    }

    // Unknown carrier
    return {
        name: 'Unknown',
        code: 'unknown',
        color: '#6b7280',
        trackUrl: null,
        logoUrl: null
    };
}

/**
 * Get carrier badge HTML with logo
 * @param {string} carrierName - Name of the carrier
 * @param {string} carrierColor - Hex color code for the carrier
 * @param {string} logoUrl - URL to carrier logo (optional)
 * @returns {string} - HTML string for carrier badge
 */
function getCarrierBadgeHTML(carrierName, carrierColor, logoUrl = null) {
    const logoHTML = logoUrl
        ? `<img src="${logoUrl}" alt="${carrierName}" class="carrier-logo" onerror="this.style.display='none'">`
        : '';

    return `<span class="carrier-badge" style="background-color: ${carrierColor}20; color: ${carrierColor}; border: 1px solid ${carrierColor}40;">
        ${logoHTML}
        ${carrierName}
    </span>`;
}

/**
 * Get carrier icon emoji
 * @param {string} carrierCode - Carrier code
 * @returns {string} - Emoji representing the carrier
 */
function getCarrierIcon(carrierCode) {
    const icons = {
        'ups': '📦',
        'fedex': '🚚',
        'usps': '✉️',
        'dhl': '✈️',
        'amazon': '📦',
        'ontrac': '🚛',
        'lasership': '🚛',
        'unknown': '❓'
    };
    return icons[carrierCode] || '📦';
}
