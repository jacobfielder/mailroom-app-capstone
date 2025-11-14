// Login functionality
document.addEventListener("DOMContentLoaded", () => {
	const token = localStorage.getItem("authToken")
	const userType = localStorage.getItem("userType")
	if (token && userType) {
		redirectToDashboard(userType)
		return
	}

	// Tabs: use data attributes + listeners, no globals
	const tabButtons = document.querySelectorAll(".tab-btn")
	const setActiveTab = (tabName) => {
		document.querySelectorAll(".tab-btn").forEach((btn) => btn.classList.remove("active"))
		document.querySelectorAll(".login-form").forEach((form) => form.classList.remove("active"))
		const btn = document.querySelector(`.tab-btn[data-tab="${tabName}"]`)
		const formId = tabName === "student" ? "studentLoginForm" : "workerLoginForm"
		if (btn) btn.classList.add("active")
		document.getElementById(formId)?.classList.add("active")
		document.getElementById("errorMessage")?.classList.remove("show")
	}
	tabButtons.forEach((btn) => {
		btn.addEventListener("click", () => setActiveTab(btn.dataset.tab))
	})

	// Consolidated form handling for student and worker
	const loginConfig = {
		student: {
			form: "#studentLoginForm",
			userField: "#studentId",
			passField: "#studentPassword",
		},
		worker: {
			form: "#workerLoginForm",
			userField: "#workerEmail",
			passField: "#workerPassword",
		},
	}

// Allow any credentials to log in (dev bypass)
Object.entries(loginConfig).forEach(([type, cfg]) => {
	const form = document.querySelector(cfg.form)
	if (!form) return
	form.addEventListener("submit", async (e) => {
		e.preventDefault()
		const username = document.querySelector(cfg.userField)?.value?.trim() || ""
		const password = document.querySelector(cfg.passField)?.value || ""
		// Bypass authentication: accept any credentials
		localStorage.setItem("authToken", "dev-allow-all")
		localStorage.setItem("userType", type)
		localStorage.setItem(
			"currentUser",
			JSON.stringify({ type, username, email: username, devBypass: true })
		)
		redirectToDashboard(type)
	})
})

	function redirectToDashboard(userType) {
		window.location.href = userType === "worker" ? "worker-dashboard.html" : "student-dashboard.html"
	}

	function showError(message) {
		const el = document.getElementById("errorMessage")
		if (!el) return
		el.textContent = message
		el.classList.add("show")
		setTimeout(() => el.classList.remove("show"), 4000)
	}
})
