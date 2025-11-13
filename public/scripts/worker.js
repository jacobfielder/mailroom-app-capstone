// Worker Dashboard functionality
let packages = []
let recipients = []

document.addEventListener("DOMContentLoaded", async () => {
  const token = localStorage.getItem("authToken")
  const currentUser = JSON.parse(localStorage.getItem("currentUser"))

  if (!token || !currentUser || currentUser.type !== "worker") {
    window.location.href = "index.html"
    return
  }

  document.getElementById("workerName").textContent = currentUser.username

  await window.loadPackages()
  await window.loadRecipients()
  populateRecipientSelect()
})

window.loadPackages = async () => {
  try {
    packages = await window.apiClient.getPackages()
    displayPackages(packages)
  } catch (error) {
    console.error("Error loading packages:", error)
    showScanMessage("Failed to load packages", "error")
  }
}

window.loadRecipients = async () => {
  try {
    recipients = await window.apiClient.getRecipients()
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

window.filterPackages = () => {
  const searchTerm = document.getElementById("packageSearch").value.toLowerCase()
  const filtered = packages.filter(
    (pkg) =>
      pkg.recipient_name.toLowerCase().includes(searchTerm) ||
      pkg.l_number.toLowerCase().includes(searchTerm) ||
      pkg.tracking_code.toLowerCase().includes(searchTerm),
  )
  displayPackages(filtered)
}

window.filterRecipients = () => {
  const searchTerm = document.getElementById("recipientSearch").value.toLowerCase()
  const filtered = recipients.filter(
    (recipient) =>
      recipient.name.toLowerCase().includes(searchTerm) ||
      recipient.l_number.toLowerCase().includes(searchTerm) ||
      recipient.email.toLowerCase().includes(searchTerm),
  )
  displayRecipients(filtered)
}

window.showSection = (sectionName) => {
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

  // Add active class to the correct button based on section name
  const buttons = document.querySelectorAll(".nav-btn")
  buttons.forEach((btn) => {
    const buttonText = btn.textContent.trim().toLowerCase()
    if (
      (sectionName === "packages" && buttonText.includes("packages")) ||
      (sectionName === "recipients" && buttonText.includes("recipients")) ||
      (sectionName === "scan" && buttonText.includes("scan"))
    ) {
      btn.classList.add("active")
    }
  })
}

window.scanPackage = async (event) => {
  event.preventDefault()

  const trackingCode = document.getElementById("trackingCode").value
  const recipientSelect = document.getElementById("recipientSelect")
  const recipientId = recipientSelect.value

  if (!recipientId) {
    showScanMessage("Please select a recipient", "error")
    return
  }

  try {
    const newPackage = await window.apiClient.checkInPackage(trackingCode, recipientId)
    const recipient = recipients.find((r) => r.id == recipientId)

    showScanMessage(`Package checked in for ${recipient.name}!`, "success")

    document.getElementById("trackingCode").value = ""
    recipientSelect.value = ""

    await window.loadPackages()

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

window.checkoutPackage = async (packageId) => {
  try {
    await window.apiClient.checkOutPackage(packageId)
    await window.loadPackages()
  } catch (error) {
    showScanMessage(error.message || "Failed to check out package", "error")
  }
}

window.deletePackage = async (packageId) => {
  if (confirm("Are you sure you want to delete this package?")) {
    try {
      await window.apiClient.deletePackage(packageId)
      await window.loadPackages()
    } catch (error) {
      showScanMessage(error.message || "Failed to delete package", "error")
    }
  }
}

window.printSlip = (packageId) => {
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

window.emailRecipient = async (packageId) => {
  try {
    await window.apiClient.sendNotification(packageId)
    const pkg = packages.find((p) => p.id === packageId)
    showScanMessage(`Email notification sent to ${pkg.recipient_name}`, "success")
  } catch (error) {
    showScanMessage(error.message || "Failed to send email", "error")
  }
}

window.showAddRecipientModal = () => {
  document.getElementById("addRecipientModal").classList.add("show")
}

window.closeAddRecipientModal = () => {
  document.getElementById("addRecipientModal").classList.remove("show")
  document.getElementById("addRecipientForm").reset()
}

window.addRecipient = async (event) => {
  event.preventDefault()

  const newRecipient = {
    name: document.getElementById("recipientName").value,
    lNumber: document.getElementById("recipientLNumber").value,
    type: document.getElementById("recipientType").value,
    mailbox: document.getElementById("recipientMailbox").value,
    email: document.getElementById("recipientEmail").value,
  }

  try {
    await window.apiClient.addRecipient(newRecipient)
    await window.loadRecipients()
    populateRecipientSelect()
    window.closeAddRecipientModal()
    showScanMessage("Recipient added successfully", "success")
  } catch (error) {
    showScanMessage(error.message || "Failed to add recipient", "error")
  }
}

window.deleteRecipient = async (recipientId) => {
  if (confirm("Are you sure you want to remove this recipient?")) {
    try {
      await window.apiClient.deleteRecipient(recipientId)
      await window.loadRecipients()
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

window.logout = () => {
  window.apiClient.clearToken()
  localStorage.removeItem("currentUser")
  localStorage.removeItem("userType")
  window.location.href = "index.html"
}

document.addEventListener("click", (event) => {
  const modal = document.getElementById("addRecipientModal")
  if (event.target === modal) {
    window.closeAddRecipientModal()
  }
})
