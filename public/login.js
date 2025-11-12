// Login functionality
document.addEventListener("DOMContentLoaded", () => {
  const loginForm = document.getElementById("loginForm")
  const errorMessage = document.getElementById("errorMessage")

  const token = localStorage.getItem("authToken")
  const userType = localStorage.getItem("userType")
  if (token && userType) {
    redirectToDashboard(userType)
  }

  const apiClient = {
    // Declare the apiClient variable here
    login: async (credentials, password, userType) => {
      // Mock implementation for demonstration purposes
      return new Promise((resolve, reject) => {
        if (credentials === "valid" && password === "valid") {
          resolve({ user: { id: credentials, type: userType } })
        } else {
          reject(new Error("Invalid credentials"))
        }
      })
    },
  }

  function switchTab(tabName) {
    // Remove active class from all tabs and forms
    document.querySelectorAll(".tab-btn").forEach((btn) => btn.classList.remove("active"))
    document.querySelectorAll(".login-form").forEach((form) => form.classList.remove("active"))

    // Add active class to selected tab
    event.target.classList.add("active")

    // Show corresponding form
    if (tabName === "student") {
      document.getElementById("studentLoginForm").classList.add("active")
    } else {
      document.getElementById("workerLoginForm").classList.add("active")
    }

    // Clear error message
    document.getElementById("errorMessage").classList.remove("show")
  }

  const studentForm = document.getElementById("studentLoginForm")
  studentForm.addEventListener("submit", async (e) => {
    e.preventDefault()

    const studentId = document.getElementById("studentId").value
    const password = document.getElementById("studentPassword").value

    if (!studentId || !password) {
      showError("Please fill in all fields")
      return
    }

    try {
      const data = await apiClient.login(studentId, password, "student")
      localStorage.setItem("userType", "student")
      localStorage.setItem("currentUser", JSON.stringify(data.user))
      redirectToDashboard("student")
    } catch (error) {
      showError(error.message || "Invalid credentials")
    }
  })

  const workerForm = document.getElementById("workerLoginForm")
  workerForm.addEventListener("submit", async (e) => {
    e.preventDefault()

    const email = document.getElementById("workerEmail").value
    const password = document.getElementById("workerPassword").value

    if (!email || !password) {
      showError("Please fill in all fields")
      return
    }

    try {
      const data = await apiClient.login(email, password, "worker")
      localStorage.setItem("userType", "worker")
      localStorage.setItem("currentUser", JSON.stringify(data.user))
      redirectToDashboard("worker")
    } catch (error) {
      showError(error.message || "Invalid credentials")
    }
  })

  function redirectToDashboard(userType) {
    if (userType === "worker") {
      window.location.href = "worker-dashboard.html"
    } else {
      window.location.href = "student-dashboard.html"
    }
  }

  function showError(message) {
    errorMessage.textContent = message
    errorMessage.classList.add("show")

    setTimeout(() => {
      errorMessage.classList.remove("show")
    }, 4000)
  }
})
