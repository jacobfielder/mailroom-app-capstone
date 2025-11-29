// API Client for UNA Package Tracker
const API_BASE_URL = window.location.origin

class APIClient {
  constructor() {
    this.token = localStorage.getItem("authToken")
  }

  setToken(token) {
    this.token = token
    localStorage.setItem("authToken", token)
  }

  clearToken() {
    this.token = null
    localStorage.removeItem("authToken")
  }

  async request(endpoint, options = {}) {
    const headers = {
      "Content-Type": "application/json",
      ...options.headers,
    }

    if (this.token) {
      headers["Authorization"] = `Bearer ${this.token}`
    }

    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers,
      })

      if (response.status === 401) {
        // Token expired or invalid
        this.clearToken()
        window.location.href = "/"
        return
      }

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Request failed")
      }

      return data
    } catch (error) {
      console.error("API request failed:", error)
      throw error
    }
  }

  // Auth endpoints
  async login(username, password, userType) {
    const data = await this.request("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password, userType }),
    })

    if (data.token) {
      this.setToken(data.token)
    }

    return data
  }

  // Package endpoints
  async getPackages() {
    return this.request("/api/packages")
  }

  async getMyPackages() {
    return this.request("/api/packages/my-packages")
  }

  async checkInPackage(trackingCode, recipientId) {
    return this.request("/api/packages", {
      method: "POST",
      body: JSON.stringify({ trackingCode, recipientId }),
    })
  }

  async checkOutPackage(packageId) {
    return this.request(`/api/packages/${packageId}/checkout`, {
      method: "PATCH",
    })
  }

  async deletePackage(packageId) {
    return this.request(`/api/packages/${packageId}`, {
      method: "DELETE",
    })
  }

  async sendNotification(packageId) {
    return this.request(`/api/packages/${packageId}/notify`, {
      method: "POST",
    })
  }

  // Recipient endpoints
  async getRecipients() {
    return this.request("/api/recipients")
  }

  async addRecipient(recipientData) {
    return this.request("/api/recipients", {
      method: "POST",
      body: JSON.stringify(recipientData),
    })
  }

  async deleteRecipient(recipientId) {
    return this.request(`/api/recipients/${recipientId}`, {
      method: "DELETE",
    })
  }

  // USPS Tracking endpoints
  async validateUSPSTracking(trackingNumber) {
    return this.request("/api/tracking/usps/validate", {
      method: "POST",
      body: JSON.stringify({ trackingNumber }),
    })
  }

  async checkUSPSFormat(trackingNumber) {
    return this.request(`/api/tracking/usps/check-format/${encodeURIComponent(trackingNumber)}`)
  }

  async getUSPSStatus() {
    return this.request("/api/tracking/usps/status")
  }
}

// Create global API client instance
const apiClient = new APIClient()
window.apiClient = apiClient
