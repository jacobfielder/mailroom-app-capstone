// Worker Dashboard functionality
let packages = []
let recipients = []

const apiClient = {
  getPackages: async () => {
    // Mock implementation for demonstration purposes
    return [
      {
        id: 1,
        check_in_date: "2023-10-01",
        recipient_name: "John Doe",
        l_number: "L12345",
        tracking_code: "TC12345",
        mailbox: "MB1",
        status: "Checked In",
      },
      {
        id: 2,
        check_in_date: "2023-10-02",
        recipient_name: "Jane Smith",
        l_number: "L67890",
        tracking_code: "TC67890",
        mailbox: "MB2",
        status: "Picked Up",
      },
    ]
  },
  getRecipients: async () => {
    // Mock implementation for demonstration purposes
    return [
      { id: 1, name: "John Doe", l_number: "L12345", type: "Student", mailbox: "MB1", email: "john.doe@example.com" },
      {
        id: 2,
        name: "Jane Smith",
        l_number: "L67890",
        type: "Faculty",
        mailbox: "MB2",
        email: "jane.smith@example.com",
      },
    ]
  },
  checkInPackage: async (trackingCode, recipientId) => {
    // Mock implementation for demonstration purposes
    return {
      id: 3,
      check_in_date: new Date().toISOString(),
      recipient_name: "New Recipient",
      l_number: "L54321",
      tracking_code: trackingCode,
      mailbox: "MB3",
      status: "Checked In",
    }
  },
  checkOutPackage: async (packageId) => {
    // Mock implementation for demonstration purposes
    packages = packages.map((pkg) => (pkg.id === packageId ? { ...pkg, status: "Picked Up" } : pkg))
  },
  deletePackage: async (packageId) => {
    // Mock implementation for demonstration purposes
    packages = packages.filter((pkg) => pkg.id !== packageId)
  },
  addRecipient: async (newRecipient) => {
    // Mock implementation for demonstration purposes
    recipients.push({ id: recipients.length + 1, ...newRecipient })
  },
  deleteRecipient: async (recipientId) => {
    // Mock implementation for demonstration purposes
    recipients = recipients.filter((recipient) => recipient.id !== recipientId)
  },
  clearToken: () => {
    // Mock implementation for demonstration purposes
  },
}

document.addEventListener("DOMContentLoaded", async () => {
  const token = localStorage.getItem("authToken")
  const currentUser = JSON.parse(localStorage.getItem("currentUser"))

  if (!token || !currentUser || currentUser.type !== "worker") {
    window.location.href = "index.html"
    return
  }

  document.getElementById("workerName").textContent = currentUser.username

  await loadPackages()
  await loadRecipients()
  populateRecipientSelect()
})

async function loadPackages() {
  try {
    packages = await apiClient.getPackages()
    displayPackages(packages)
  } catch (error) {
    console.error("Error loading packages:", error)
    showScanMessage("Failed to load packages", "error")
  }
}

async function loadRecipients() {
  try {
    recipients = await apiClient.getRecipients()
    displayRecipients(recipients)
  } catch (error) {
    console.error("Error loading recipients:", error)
  }
}

function displayPackages(packagesToDisplay) {
  const tbody = document.getElementById("packagesTableBody")
  tbody.innerHTML = ""

  if (packagesToDisplay.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 40px;">No packages found</td></tr>'
    return
  }

  packagesToDisplay.forEach((pkg) => {
    const row = document.createElement("tr")
    row.innerHTML = `
            <td>${formatDate(pkg.check_in_date)}</td>
            <td>${pkg.recipient_name}</td>
            <td>${pkg.l_number}</td>
            <td>${pkg.tracking_code}</td>
            <td>${pkg.mailbox}</td>
            <td><span class="status-badge status-${pkg.status.toLowerCase().replace(" ", "-")}">${pkg.status}</span></td>
            <td>
                <div class="action-buttons">
                    ${
                      pkg.status === "Checked In"
                        ? `
                        <button class="btn btn-success" onclick="checkoutPackage(${pkg.id})">Check Out</button>
                        <button class="btn btn-warning" onclick="printSlip(${pkg.id})">Print Slip</button>
                        <button class="btn btn-primary" onclick="emailRecipient(${pkg.id})">Email</button>
                    `
                        : `
                        <span style="color: #28a745;">Picked Up</span>
                    `
                    }
                    <button class="btn btn-danger" onclick="deletePackage(${pkg.id})">Delete</button>
                </div>
            </td>
        `
    tbody.appendChild(row)
  })
}

function displayRecipients(recipientsToDisplay) {
  const tbody = document.getElementById("recipientsTableBody")
  tbody.innerHTML = ""

  if (recipientsToDisplay.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 40px;">No recipients found</td></tr>'
    return
  }

  recipientsToDisplay.forEach((recipient) => {
    const row = document.createElement("tr")
    row.innerHTML = `
            <td>${recipient.name}</td>
            <td>${recipient.l_number}</td>
            <td>${recipient.type}</td>
            <td>${recipient.mailbox}</td>
            <td>${recipient.email}</td>
            <td>
                <button class="btn btn-danger" onclick="deleteRecipient(${recipient.id})">Remove</button>
            </td>
        `
    tbody.appendChild(row)
  })
}

function filterPackages() {
  const searchTerm = document.getElementById("packageSearch").value.toLowerCase()
  const filtered = packages.filter(
    (pkg) =>
      pkg.recipient_name.toLowerCase().includes(searchTerm) ||
      pkg.l_number.toLowerCase().includes(searchTerm) ||
      pkg.tracking_code.toLowerCase().includes(searchTerm),
  )
  displayPackages(filtered)
}

function filterRecipients() {
  const searchTerm = document.getElementById("recipientSearch").value.toLowerCase()
  const filtered = recipients.filter(
    (recipient) =>
      recipient.name.toLowerCase().includes(searchTerm) ||
      recipient.l_number.toLowerCase().includes(searchTerm) ||
      recipient.email.toLowerCase().includes(searchTerm),
  )
  displayRecipients(filtered)
}

function showSection(sectionName) {
  // Hide all sections
  document.querySelectorAll(".content-section").forEach((section) => {
    section.classList.remove("active")
  })

  // Remove active class from all nav buttons
  document.querySelectorAll(".nav-btn").forEach((btn) => {
    btn.classList.remove("active")
  })

  // Show selected section
  document.getElementById(sectionName + "Section").classList.add("active")

  // Add active class to clicked button
  event.target.closest(".nav-btn").classList.add("active")
}

async function scanPackage(event) {
  event.preventDefault()

  const trackingCode = document.getElementById("trackingCode").value
  const recipientSelect = document.getElementById("recipientSelect")
  const recipientId = recipientSelect.value

  if (!recipientId) {
    showScanMessage("Please select a recipient", "error")
    return
  }

  try {
    const newPackage = await apiClient.checkInPackage(trackingCode, recipientId)
    const recipient = recipients.find((r) => r.id == recipientId)

    showScanMessage(`Package checked in for ${recipient.name}!`, "success")

    document.getElementById("trackingCode").value = ""
    recipientSelect.value = ""

    await loadPackages()

    document.getElementById("trackingCode").focus()
  } catch (error) {
    showScanMessage(error.message || "Failed to check in package", "error")
  }
}

function showScanMessage(message, type) {
  const messageDiv = document.getElementById("scanMessage")
  messageDiv.textContent = message
  messageDiv.className = `scan-message ${type}`

  setTimeout(() => {
    messageDiv.className = "scan-message"
  }, 3000)
}

async function checkoutPackage(packageId) {
  try {
    await apiClient.checkOutPackage(packageId)
    await loadPackages()
  } catch (error) {
    showScanMessage(error.message || "Failed to check out package", "error")
  }
}

async function deletePackage(packageId) {
  if (confirm("Are you sure you want to delete this package?")) {
    try {
      await apiClient.deletePackage(packageId)
      await loadPackages()
    } catch (error) {
      showScanMessage(error.message || "Failed to delete package", "error")
    }
  }
}

function printSlip(packageId) {
  const pkg = packages.find((p) => p.id === packageId)
  if (!pkg) return

  const printWindow = window.open("", "_blank")
  printWindow.document.write(`
        <html>
        <head>
            <title>Package Slip - ${pkg.tracking_code}</title>
            <style>
                body { font-family: Arial, sans-serif; padding: 20px; }
                .slip { border: 2px solid #000; padding: 20px; max-width: 400px; }
                h2 { text-align: center; margin-bottom: 20px; }
                .info { margin: 10px 0; }
                .label { font-weight: bold; }
            </style>
        </head>
        <body>
            <div class="slip">
                <h2>UNA Package Slip</h2>
                <div class="info"><span class="label">Date:</span> ${formatDate(pkg.check_in_date)}</div>
                <div class="info"><span class="label">Recipient:</span> ${pkg.recipient_name}</div>
                <div class="info"><span class="label">L Number:</span> ${pkg.l_number}</div>
                <div class="info"><span class="label">Mailbox:</span> ${pkg.mailbox}</div>
                <div class="info"><span class="label">Tracking:</span> ${pkg.tracking_code}</div>
                <div class="info" style="margin-top: 30px; border-top: 2px solid #000; padding-top: 10px;">
                    <p>Please bring your student ID to pick up your package.</p>
                </div>
            </div>
        </body>
        </html>
    `)
  printWindow.document.close()
  printWindow.print()
}

async function emailRecipient(packageId) {
  try {
    await apiClient.sendNotification(packageId)
    const pkg = packages.find((p) => p.id === packageId)
    showScanMessage(`Email notification sent to ${pkg.email}`, "success")
  } catch (error) {
    showScanMessage(error.message || "Failed to send email", "error")
  }
}

function showAddRecipientModal() {
  document.getElementById("addRecipientModal").classList.add("show")
}

function closeAddRecipientModal() {
  document.getElementById("addRecipientModal").classList.remove("show")
  document.getElementById("addRecipientForm").reset()
}

async function addRecipient(event) {
  event.preventDefault()

  const newRecipient = {
    name: document.getElementById("recipientName").value,
    lNumber: document.getElementById("recipientLNumber").value,
    type: document.getElementById("recipientType").value,
    mailbox: document.getElementById("recipientMailbox").value,
    email: document.getElementById("recipientEmail").value,
  }

  try {
    await apiClient.addRecipient(newRecipient)
    await loadRecipients()
    populateRecipientSelect()
    closeAddRecipientModal()
    showScanMessage("Recipient added successfully", "success")
  } catch (error) {
    showScanMessage(error.message || "Failed to add recipient", "error")
  }
}

async function deleteRecipient(recipientId) {
  if (confirm("Are you sure you want to remove this recipient?")) {
    try {
      await apiClient.deleteRecipient(recipientId)
      await loadRecipients()
      populateRecipientSelect()
      showScanMessage("Recipient removed successfully", "success")
    } catch (error) {
      showScanMessage(error.message || "Failed to remove recipient", "error")
    }
  }
}

function populateRecipientSelect() {
  const select = document.getElementById("recipientSelect")
  select.innerHTML = '<option value="">Select recipient</option>'

  recipients.forEach((recipient) => {
    const option = document.createElement("option")
    option.value = recipient.id
    option.textContent = `${recipient.name} (${recipient.l_number}) - Mailbox ${recipient.mailbox}`
    select.appendChild(option)
  })
}

function formatDate(dateString) {
  const date = new Date(dateString)
  return date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })
}

function logout() {
  apiClient.clearToken()
  localStorage.removeItem("currentUser")
  localStorage.removeItem("userType")
  window.location.href = "index.html"
}

document.addEventListener("click", (event) => {
  const modal = document.getElementById("addRecipientModal")
  if (event.target === modal) {
    closeAddRecipientModal()
  }
})
