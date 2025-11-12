// Student Dashboard functionality
let userPackages = []
let apiClient // Declare apiClient variable

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
    userPackages = await apiClient.getMyPackages()
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
  container.style.display = "grid"

  packagesToDisplay.forEach((pkg) => {
    const card = document.createElement("div")
    card.className = "package-card"
    card.innerHTML = `
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
                    <span class="detail-value" style="color: #00A3E0;">${pkg.status}</span>
                </div>
            </div>
        `
    container.appendChild(card)
  })
}

function filterStudentPackages() {
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

function logout() {
  apiClient.clearToken()
  localStorage.removeItem("currentUser")
  localStorage.removeItem("userType")
  window.location.href = "index.html"
}
