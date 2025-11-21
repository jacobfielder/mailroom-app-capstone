// Student Dashboard functionality
let userPackages = []

document.addEventListener("DOMContentLoaded", async () => {
  const token = localStorage.getItem("authToken")
  const currentUser = JSON.parse(localStorage.getItem("currentUser"))

  if (!token || !currentUser || currentUser.type !== "student") {
    window.location.href = "index.html"
    return
  }

  document.getElementById("studentName").textContent = currentUser.username

  await loadUserPackages()
})

async function loadUserPackages() {
  try {
    userPackages = await window.apiClient.getMyPackages()
    displayUserPackages(userPackages)
  } catch (error) {
    console.error("Error loading packages:", error)
    document.getElementById("noPackagesMessage").textContent = "Failed to load packages. Please try again."
    document.getElementById("noPackagesMessage").classList.add("show")
  }
}

function displayUserPackages(packagesToDisplay) {
  const container = document.getElementById("packagesContainer")
  const noPackagesMessage = document.getElementById("noPackagesMessage")

  container.innerHTML = ""

  if (packagesToDisplay.length === 0) {
    noPackagesMessage.classList.add("show")
    container.style.display = "none"
    return
  }

  noPackagesMessage.classList.remove("show")
  container.style.display = "flex"

  packagesToDisplay.forEach((pkg) => {
    const col = document.createElement("div")
    col.className = "col-12 col-md-6 col-lg-4 col-xl-3"

    col.innerHTML = `
      <div class="package-card h-100">
        <div class="package-header">
          <div class="package-icon">📦</div>
          <div class="package-info">
            <h3>Package Ready</h3>
            <div class="package-date">${formatDate(pkg.check_in_date)}</div>
          </div>
        </div>
        <div class="package-details">
          <div class="detail-row">
            <span class="detail-label">Tracking Code:</span>
            <span class="detail-value">${pkg.tracking_code}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Mailbox:</span>
            <span class="detail-value">#${pkg.mailbox}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Location:</span>
            <span class="detail-value">UNA Mailroom</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Status:</span>
            <span class="detail-value text-primary">${pkg.status}</span>
          </div>
        </div>
      </div>
    `
    container.appendChild(col)
  })
}

window.filterStudentPackages = () => {
  const searchTerm = document.getElementById("studentSearch").value.toLowerCase()
  const filtered = userPackages.filter((pkg) => pkg.tracking_code.toLowerCase().includes(searchTerm))
  displayUserPackages(filtered)
}

function formatDate(dateString) {
  const date = new Date(dateString)
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })
}

window.logout = () => {
  // Clear all auth data
  if (window.apiClient) {
    window.apiClient.clearToken()
  }
  localStorage.removeItem("authToken")
  localStorage.removeItem("currentUser")
  localStorage.removeItem("userType")

  // Redirect to login page
  window.location.href = "/index.html"
}
