const authStatus = document.getElementById("auth-status");
const logoutButton = document.getElementById("logout-button");
const signupForm = document.getElementById("signup-form");
const signinForm = document.getElementById("signin-form");
const reportForm = document.getElementById("report-form");
const reportsList = document.getElementById("reports-list");
const reportsGuard = document.getElementById("reports-guard");
const nutrientForm = document.getElementById("nutrient-form");
const nutrientResult = document.getElementById("nutrient-result");
const bmiForm = document.getElementById("bmi-form");
const bmiResult = document.getElementById("bmi-result");
const refreshReportsButton = document.getElementById("refresh-reports");
const protectedPageRoot = document.querySelector("[data-protected-page]");
const protectedLinks = document.querySelectorAll("[data-protected-link]");
const themeSelect = document.getElementById("theme-select");
const authEntryLinks = document.querySelector(".auth-entry-links");
const projectCreditButtons = document.querySelectorAll("[data-project-credit]");
let projectPanelOverlay = null;
let loadingOverlay = null;
let loadingCounter = 0;
let toastHost = null;

const storageKey = "patient-health-token";
const userKey = "patient-health-user";
const themeKey = "patient-health-theme";
const signInPagePath = "signin.html";

const isSafeInternalTarget = (value) =>
  typeof value === "string" &&
  value.length > 0 &&
  !value.startsWith("http://") &&
  !value.startsWith("https://") &&
  !value.startsWith("//") &&
  !value.startsWith("javascript:");

const applyThemePreference = (preference) => {
  if (preference === "light" || preference === "dark") {
    document.documentElement.dataset.theme = preference;
  } else {
    delete document.documentElement.dataset.theme;
  }

  if (themeSelect) {
    themeSelect.value = preference;
  }
};

const ensureLoadingOverlay = () => {
  if (loadingOverlay) {
    return loadingOverlay;
  }

  loadingOverlay = document.createElement("div");
  loadingOverlay.className = "loading-overlay hidden";
  loadingOverlay.innerHTML = `
    <div class="loading-card" role="status" aria-live="polite">
      <div class="loading-spinner" aria-hidden="true"></div>
      <p>Loading, please wait...</p>
    </div>
  `;

  document.body.appendChild(loadingOverlay);
  return loadingOverlay;
};

const ensureToastHost = () => {
  if (toastHost) {
    return toastHost;
  }

  toastHost = document.createElement("div");
  toastHost.className = "toast-host";
  document.body.appendChild(toastHost);
  return toastHost;
};

const showToast = (message, type = "info", details = []) => {
  const host = ensureToastHost();
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;

  const detailItems = details.length
    ? `<ul>${details.map((detail) => `<li>${detail}</li>`).join("")}</ul>`
    : "";

  toast.innerHTML = `
    <div class="toast-copy">
      <strong>${message}</strong>
      ${detailItems}
    </div>
    <button class="toast-close" type="button" aria-label="Close message">&times;</button>
  `;

  host.appendChild(toast);

  const removeToast = () => {
    toast.classList.add("toast-out");
    setTimeout(() => toast.remove(), 220);
  };

  toast.querySelector(".toast-close").addEventListener("click", removeToast);
  setTimeout(removeToast, 4200);
};

const showLoading = () => {
  const overlay = ensureLoadingOverlay();
  loadingCounter += 1;
  overlay.classList.remove("hidden");
  document.body.classList.add("panel-open");
};

const hideLoading = () => {
  if (!loadingOverlay) {
    return;
  }

  loadingCounter = Math.max(0, loadingCounter - 1);
  if (loadingCounter > 0) {
    return;
  }

  loadingOverlay.classList.add("hidden");
  if (!projectPanelOverlay || projectPanelOverlay.classList.contains("hidden")) {
    document.body.classList.remove("panel-open");
  }
};

const closeProjectPanel = () => {
  if (!projectPanelOverlay) {
    return;
  }

  projectPanelOverlay.classList.add("hidden");
  if (!loadingOverlay || loadingOverlay.classList.contains("hidden")) {
    document.body.classList.remove("panel-open");
  }
};

const ensureProjectPanel = () => {
  if (projectPanelOverlay) {
    return projectPanelOverlay;
  }

  projectPanelOverlay = document.createElement("div");
  projectPanelOverlay.className = "info-panel-overlay hidden";
  projectPanelOverlay.setAttribute("data-project-panel-overlay", "");
  projectPanelOverlay.innerHTML = `
    <div class="info-panel" role="dialog" aria-modal="true" aria-labelledby="project-panel-title" data-project-panel>
      <button class="info-panel-close" type="button" aria-label="Close panel" data-project-panel-close>&times;</button>
      <p class="eyebrow">Project Info</p>
      <h2 id="project-panel-title">About This Website</h2>
      <p>
        This patient health website helps users create an account, log in,
        manage patient reports, check age-based nutrient guidance, and calculate BMI.
      </p>
      <div class="info-panel-meta">
        <p>Nisha</p>
        <p>MCA 4th Semester</p>
      </div>
    </div>
  `;

  document.body.appendChild(projectPanelOverlay);

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && projectPanelOverlay && !projectPanelOverlay.classList.contains("hidden")) {
      closeProjectPanel();
    }
  });

  return projectPanelOverlay;
};

const getRedirectTarget = () => {
  const params = new URLSearchParams(window.location.search);
  const next = params.get("next");

  if (!isSafeInternalTarget(next)) {
    return "reports.html";
  }

  return next;
};

const syncAuthEntryLinks = () => {
  const params = new URLSearchParams(window.location.search);
  const next = params.get("next");

  if (!isSafeInternalTarget(next)) {
    return;
  }

  document.querySelectorAll('a[href="./signin.html"], a[href="./signup.html"], a[href="signin.html"], a[href="signup.html"]').forEach((link) => {
    const url = new URL(link.href, window.location.origin);
    url.searchParams.set("next", next);
    link.href = `${url.pathname}${url.search}`;
  });
};

const goToSignIn = (nextPath) => {
  const target = nextPath || window.location.pathname;
  window.location.href = `${signInPagePath}?next=${encodeURIComponent(target)}`;
};

const getToken = () => localStorage.getItem(storageKey);
const getThemePreference = () => localStorage.getItem(themeKey) || "system";
const trimValue = (value) => String(value || "").trim();

const getStoredUser = () => {
  const rawUser = localStorage.getItem(userKey);

  if (!rawUser) {
    return null;
  }

  try {
    return JSON.parse(rawUser);
  } catch (_error) {
    return null;
  }
};

const renderAuthState = (user) => {
  if (!authStatus || !logoutButton) {
    return;
  }

  if (user) {
    authStatus.textContent = `Signed in as ${user.name} (${user.email})`;
    authStatus.classList.remove("hidden");
    logoutButton.classList.remove("hidden");
    if (authEntryLinks) {
      authEntryLinks.classList.add("hidden");
    }
  } else {
    authStatus.textContent = "";
    authStatus.classList.add("hidden");
    logoutButton.classList.add("hidden");
    if (authEntryLinks) {
      authEntryLinks.classList.remove("hidden");
    }
  }
};

const updateReportsGuard = (user) => {
  if (!reportsGuard) {
    return;
  }

  if (user) {
    reportsGuard.textContent = "You can add a new patient report and review saved records below.";
  } else {
    reportsGuard.innerHTML =
      'Sign in to save and view patient reports. <a href="signin.html">Go to sign in</a>';
  }
};

const syncProtectedLinks = (user) => {
  protectedLinks.forEach((link) => {
    if (user) {
      link.classList.remove("locked-link");
      link.removeAttribute("aria-disabled");
      return;
    }

    link.classList.add("locked-link");
    link.setAttribute("aria-disabled", "true");
  });
};

const setSession = (token, user) => {
  localStorage.setItem(storageKey, token);
  localStorage.setItem(userKey, JSON.stringify(user));
  renderAuthState(user);
  updateReportsGuard(user);
  syncProtectedLinks(user);
};

const clearSession = () => {
  localStorage.removeItem(storageKey);
  localStorage.removeItem(userKey);
  renderAuthState(null);
  updateReportsGuard(null);
  syncProtectedLinks(null);

  if (reportsList) {
    reportsList.textContent = "Sign in to view saved patient reports.";
  }
};

const apiRequest = async (url, options = {}) => {
  showLoading();

  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  const token = getToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    const responseText = await response.text();
    const data = responseText ? JSON.parse(responseText) : {};

    if (!response.ok) {
      const error = new Error(data.message || "Something went wrong.");
      error.details = data.details || [];
      throw error;
    }

    return data;
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error("The server returned an unexpected response.");
    }

    if (error instanceof TypeError) {
      const networkError = new Error(
        "Unable to reach the server. Please check your connection and try again."
      );
      networkError.details = [];
      throw networkError;
    }

    throw error;
  } finally {
    hideLoading();
  }
};

const formatDate = (value) => {
  if (!value) {
    return "Not available";
  }

  return new Date(value).toLocaleDateString();
};

const renderReports = (reports) => {
  if (!reportsList) {
    return;
  }

  if (!reports.length) {
    reportsList.textContent = "No patient reports saved yet.";
    return;
  }

  reportsList.innerHTML = reports
    .map(
      (report) => `
        <article class="report-card">
          <h3>${report.patientName} <span>(${report.patientId})</span></h3>
          <p><strong>Age:</strong> ${report.patientAge}</p>
          <p><strong>Gender:</strong> ${report.patientGender}</p>
          <p><strong>Doctor:</strong> ${report.doctorName}</p>
          <p><strong>Appointment:</strong> ${formatDate(report.appointmentDate)}</p>
          <p><strong>Last Appointment:</strong> ${formatDate(report.lastAppointment)}</p>
          <p><strong>Blood Pressure:</strong> ${report.bloodPressure}</p>
          <p><strong>Cholesterol:</strong> ${report.cholesterol}</p>
          <p><strong>Sugar:</strong> ${report.sugar}</p>
        </article>
      `
    )
    .join("");
};

const loadReports = async () => {
  if (!reportsList) {
    return;
  }

  if (!getToken()) {
    reportsList.textContent = "Sign in to view saved patient reports.";
    return;
  }

  try {
    reportsList.textContent = "Loading reports...";
    const data = await apiRequest("/api/reports");
    renderReports(data.reports);
  } catch (error) {
    reportsList.textContent = error.message;
  }
};

if (signupForm) {
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(signupForm);
    const payload = Object.fromEntries(formData.entries());
    payload.name = trimValue(payload.name);
    payload.email = trimValue(payload.email);

    try {
      if (!payload.name || !payload.email || !payload.password) {
        showToast("Please fill all sign up fields.", "error");
        return;
      }
      if (payload.password.length < 6) {
        showToast("Password must be at least 6 characters long.", "error");
        return;
      }

      const data = await apiRequest("/api/auth/signup", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      setSession(data.token, data.user);
      signupForm.reset();
      showToast(data.message, "success");
      window.location.href = getRedirectTarget();
    } catch (error) {
      showToast(error.message, "error", error.details || []);
    }
  });
}

if (signinForm) {
  signinForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(signinForm);
    const payload = Object.fromEntries(formData.entries());
    payload.email = trimValue(payload.email);

    try {
      if (!payload.email || !payload.password) {
        showToast("Email and password are required.", "error");
        return;
      }

      const data = await apiRequest("/api/auth/signin", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      setSession(data.token, data.user);
      signinForm.reset();
      showToast(data.message, "success");
      window.location.href = getRedirectTarget();
    } catch (error) {
      showToast(error.message, "error", error.details || []);
    }
  });
}

if (logoutButton) {
  logoutButton.addEventListener("click", () => {
    clearSession();
    if (protectedPageRoot) {
      goToSignIn();
    }
  });
}

if (reportForm) {
  reportForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!getToken()) {
      showToast("Please sign in before saving patient reports.", "error");
      window.location.href = "signin.html";
      return;
    }

    const formData = new FormData(reportForm);
    const payload = Object.fromEntries(formData.entries());
    payload.patientId = trimValue(payload.patientId);
    payload.patientName = trimValue(payload.patientName);
    payload.patientGender = trimValue(payload.patientGender);
    payload.doctorName = trimValue(payload.doctorName);
    payload.bloodPressure = trimValue(payload.bloodPressure);
    payload.cholesterol = trimValue(payload.cholesterol);
    payload.sugar = trimValue(payload.sugar);
    payload.patientAge = Number(payload.patientAge);

    try {
      if (
        !payload.patientId ||
        !payload.patientName ||
        !payload.patientGender ||
        !payload.doctorName ||
        !payload.bloodPressure ||
        !payload.cholesterol ||
        !payload.sugar ||
        !payload.appointmentDate ||
        Number.isNaN(payload.patientAge) ||
        payload.patientAge <= 0
      ) {
        showToast("Please complete all required patient report fields.", "error");
        return;
      }

      const data = await apiRequest("/api/reports", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      reportForm.reset();
      showToast(data.message, "success");
      await loadReports();
    } catch (error) {
      showToast(error.message, "error", error.details || []);
    }
  });
}

if (nutrientForm) {
  nutrientForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const age = Number(document.getElementById("nutrient-age").value);

    try {
      if (Number.isNaN(age) || age < 0) {
        showToast("Please enter a valid age.", "error");
        return;
      }

      const data = await apiRequest(`/api/nutrients?age=${age}`, {
        method: "GET",
        headers: {},
      });

      nutrientResult.innerHTML = `
        <p><strong>Age Group:</strong> ${data.stage}</p>
        <p><strong>Recommended Nutrients:</strong></p>
        <ul>${data.nutrients.map((item) => `<li>${item}</li>`).join("")}</ul>
        <p>${data.note}</p>
      `;
    } catch (error) {
      nutrientResult.textContent = error.message;
      showToast(error.message, "error", error.details || []);
    }
  });
}

if (bmiForm) {
  bmiForm.addEventListener("submit", (event) => {
    event.preventDefault();
    showLoading();

    const heightCm = Number(document.getElementById("bmi-height").value);
    const weightKg = Number(document.getElementById("bmi-weight").value);

    if (!heightCm || !weightKg) {
      bmiResult.textContent = "Please enter height and weight.";
      showToast("Please enter valid height and weight values.", "error");
      hideLoading();
      return;
    }

    const heightInMeters = heightCm / 100;
    const bmi = weightKg / (heightInMeters * heightInMeters);

    let category = "Normal weight";
    if (bmi < 18.5) {
      category = "Underweight";
    } else if (bmi >= 25 && bmi < 30) {
      category = "Overweight";
    } else if (bmi >= 30) {
      category = "Obesity";
    }

    bmiResult.innerHTML = `
      <p><strong>BMI:</strong> ${bmi.toFixed(2)}</p>
      <p><strong>Category:</strong> ${category}</p>
    `;
    setTimeout(hideLoading, 250);
  });
}

if (refreshReportsButton) {
  refreshReportsButton.addEventListener("click", loadReports);
}

if (themeSelect) {
  themeSelect.addEventListener("change", () => {
    localStorage.setItem(themeKey, themeSelect.value);
    applyThemePreference(themeSelect.value);
  });
}

projectCreditButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const panel = ensureProjectPanel();
    panel.classList.remove("hidden");
    document.body.classList.add("panel-open");
  });
});

document.addEventListener("click", (event) => {
  if (event.target.closest("[data-project-panel-close]")) {
    event.preventDefault();
    closeProjectPanel();
    return;
  }

  if (event.target.closest(".toast-close")) {
    event.preventDefault();
  }

  if (
    event.target instanceof HTMLElement &&
    event.target.matches("[data-project-panel-overlay]")
  ) {
    closeProjectPanel();
  }
});

protectedLinks.forEach((link) => {
  link.addEventListener("click", (event) => {
    if (getToken()) {
      return;
    }

    event.preventDefault();
    goToSignIn(link.getAttribute("href"));
  });
});

const bootstrap = async () => {
  const savedUser = getStoredUser();

  applyThemePreference(getThemePreference());
  syncAuthEntryLinks();
  renderAuthState(savedUser);
  updateReportsGuard(savedUser);
  syncProtectedLinks(savedUser);

  if (!savedUser || !getToken()) {
    if (protectedPageRoot) {
      goToSignIn();
      return;
    }

    if (reportsList) {
      reportsList.textContent = "Sign in to view saved patient reports.";
    }
    return;
  }

  try {
    const data = await apiRequest("/api/auth/me");
    setSession(getToken(), data.user);

    if (reportsList) {
      await loadReports();
    }
  } catch (_error) {
    clearSession();
  }
};

window.healthTrackUI = {
  showToast,
  showLoading,
  hideLoading,
  setSession,
  getRedirectTarget,
};

bootstrap();
