/**
 * USPS API Service
 * Handles authentication and tracking API calls to USPS REST API
 * Uses native fetch (Node 18+)
 */

class USPSAPIService {
  constructor() {
    this.baseURL = 'https://api.usps.com';
    // USPS calls these "Consumer Key" and "Consumer Secret" in their developer portal
    this.consumerKey = process.env.USPS_CONSUMER_KEY;
    this.consumerSecret = process.env.USPS_CONSUMER_SECRET;
    this.accessToken = null;
    this.tokenExpiry = null;
  }

  /**
   * Get OAuth access token from USPS
   * @returns {Promise<string>} Access token
   */
  async getAccessToken() {
    // Return cached token if still valid
    if (this.accessToken && this.tokenExpiry && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    try {
      const response = await fetch(`${this.baseURL}/oauth2/v3/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          grant_type: 'client_credentials',
          client_id: this.consumerKey,
          client_secret: this.consumerSecret,
          scope: 'tracking'
        })
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`USPS OAuth failed: ${error}`);
      }

      const data = await response.json();
      this.accessToken = data.access_token;
      // Set expiry to 5 minutes before actual expiry for safety
      this.tokenExpiry = Date.now() + ((data.expires_in - 300) * 1000);

      return this.accessToken;
    } catch (error) {
      console.error('Error getting USPS access token:', error);
      throw error;
    }
  }

  /**
   * Track a package using USPS Tracking API
   * @param {string} trackingNumber - The tracking number to look up
   * @returns {Promise<Object>} Tracking information
   */
  async trackPackage(trackingNumber) {
    try {
      // Validate tracking number format
      if (!trackingNumber || typeof trackingNumber !== 'string') {
        throw new Error('Invalid tracking number');
      }

      const cleanedTracking = trackingNumber.replace(/\s+/g, '').toUpperCase();

      // Get access token
      const token = await this.getAccessToken();

      // Call USPS Tracking API
      const response = await fetch(
        `${this.baseURL}/tracking/v3/tracking/${cleanedTracking}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        if (response.status === 404) {
          return {
            success: false,
            error: 'Tracking number not found',
            trackingNumber: cleanedTracking
          };
        }
        const error = await response.text();
        throw new Error(`USPS Tracking API error: ${error}`);
      }

      const data = await response.json();

      // Parse and return relevant tracking information
      return {
        success: true,
        trackingNumber: cleanedTracking,
        carrier: 'USPS',
        status: data.status || 'Unknown',
        deliveryDate: data.expectedDeliveryDate || null,
        service: data.mailClass || 'Unknown',
        events: data.trackingEvents || [],
        lastUpdate: data.trackingEvents?.[0]?.eventTimestamp || null,
        lastLocation: data.trackingEvents?.[0]?.eventLocation || null,
        rawData: data
      };

    } catch (error) {
      console.error('Error tracking USPS package:', error);
      return {
        success: false,
        error: error.message,
        trackingNumber: trackingNumber
      };
    }
  }

  /**
   * Validate if a tracking number is a USPS tracking number
   * @param {string} trackingNumber - The tracking number to validate
   * @returns {boolean} True if it matches USPS patterns
   */
  isUSPSTrackingNumber(trackingNumber) {
    if (!trackingNumber) return false;

    const cleaned = trackingNumber.replace(/\s+/g, '').toUpperCase();

    // USPS tracking number patterns
    const uspsPatterns = [
      /^\d{20}$/,                    // 20 digits
      /^(94|93|92|95)\d{20}$/,       // 22 digits starting with 94, 93, 92, or 95
      /^(9407|9303|9270)\d{17}$/,    // Priority Mail Express
      /^(EA|EC|CP|RA|RS)\d{9}US$/,   // International formats
    ];

    return uspsPatterns.some(pattern => pattern.test(cleaned));
  }

  /**
   * Check if USPS API credentials are configured
   * @returns {boolean} True if credentials are set
   */
  isConfigured() {
    return !!(this.consumerKey && this.consumerSecret);
  }
}

// Export singleton instance
export default new USPSAPIService();
