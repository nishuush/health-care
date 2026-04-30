const authStatus = document.getElementById("auth-status");
const logoutButton = document.getElementById("logout-button");
const signupForm = document.getElementById("signup-form");
const signinForm = document.getElementById("signin-form");
const nutrientForm = document.getElementById("nutrient-form");
const nutrientResult = document.getElementById("nutrient-result");
const bmiForm = document.getElementById("bmi-form");
const bmiResult = document.getElementById("bmi-result");
const dietForm = document.getElementById("diet-form");
const dietPlanResult = document.getElementById("diet-plan-result");
const protectedPageRoot = document.querySelector("[data-protected-page]");
const protectedLinks = document.querySelectorAll("[data-protected-link]");
const themeToggle = document.getElementById("theme-toggle");
const authEntryLinks = document.querySelector(".auth-entry-links");
const projectCreditButtons = document.querySelectorAll("[data-project-credit]");
const appConfig = window.APP_CONFIG || {};
let projectPanelOverlay = null;
let loadingOverlay = null;
let loadingCounter = 0;
let toastHost = null;

const storageKey = "patient-health-token";
const userKey = "patient-health-user";
const themeKey = "patient-health-theme";
const dietPlanKey = "patient-health-diet-plan";
const dietDraftKey = "patient-health-diet-draft";
const signInPagePath = "signin.html";

const isSafeInternalTarget = (value) =>
  typeof value === "string" &&
  value.length > 0 &&
  !value.startsWith("http://") &&
  !value.startsWith("https://") &&
  !value.startsWith("//") &&
  !value.startsWith("javascript:");

const buildApiUrl = (path) => {
  const baseUrl = String(appConfig.apiBaseUrl || "").trim();
  if (!baseUrl) {
    return path;
  }

  return `${baseUrl.replace(/\/+$/, "")}${path}`;
};

const calculateBmi = (heightCm, weightKg) => {
  if (!heightCm || !weightKg) {
    return null;
  }

  const heightInMeters = heightCm / 100;
  return weightKg / (heightInMeters * heightInMeters);
};

const getBmiCategory = (bmi) => {
  if (bmi < 18.5) {
    return "Underweight";
  }

  if (bmi < 25) {
    return "Normal weight";
  }

  if (bmi < 30) {
    return "Overweight";
  }

  return "Obesity";
};

const buildBmiComparisonMarkup = (bmi, category) => {
  const cappedBmi = Math.max(10, Math.min(40, bmi));
  const markerPosition = ((cappedBmi - 10) / 30) * 100;

  return `
    <div class="bmi-summary">
      <p><strong>BMI:</strong> ${bmi.toFixed(2)}</p>
      <p><strong>Category:</strong> ${category}</p>
    </div>
    <div class="bmi-scale" aria-label="BMI comparison scale">
      <div class="bmi-scale-bar">
        <span class="bmi-zone bmi-zone-under"></span>
        <span class="bmi-zone bmi-zone-normal"></span>
        <span class="bmi-zone bmi-zone-over"></span>
        <span class="bmi-zone bmi-zone-obesity"></span>
        <span class="bmi-marker" style="left: ${markerPosition}%;">
          <span class="bmi-marker-dot"></span>
          <span class="bmi-marker-value">${bmi.toFixed(1)}</span>
        </span>
      </div>
      <div class="bmi-scale-labels">
        <span>Underweight</span>
        <span>Normal</span>
        <span>Overweight</span>
        <span>Obesity</span>
      </div>
      <div class="bmi-scale-values">
        <span>18.5</span>
        <span>25</span>
        <span>30</span>
      </div>
    </div>
  `;
};

const applyThemePreference = (preference) => {
  if (preference === "light" || preference === "dark") {
    document.documentElement.dataset.theme = preference;
  } else {
    delete document.documentElement.dataset.theme;
  }

  if (themeToggle) {
    const resolvedTheme =
      preference === "system"
        ? window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light"
        : preference;

    themeToggle.setAttribute("aria-pressed", String(resolvedTheme === "dark"));
    themeToggle.setAttribute(
      "aria-label",
      resolvedTheme === "dark" ? "Switch to light mode" : "Switch to dark mode"
    );
    themeToggle.dataset.mode = resolvedTheme;
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
        Health Care helps users sign in, check BMI, review age-based nutrient guidance,
        and create personalized Indian diet plans from daily health details.
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
    return "diet.html";
  }

  return next;
};

const syncAuthEntryLinks = () => {
  const params = new URLSearchParams(window.location.search);
  const next = params.get("next");

  if (!isSafeInternalTarget(next)) {
    return;
  }

  document
    .querySelectorAll('a[href="./signin.html"], a[href="./signup.html"], a[href="signin.html"], a[href="signup.html"]')
    .forEach((link) => {
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

const saveDietDraft = (payload) => {
  localStorage.setItem(dietDraftKey, JSON.stringify(payload));
};

const getSavedDietDraft = () => {
  try {
    return JSON.parse(localStorage.getItem(dietDraftKey) || "null");
  } catch (_error) {
    return null;
  }
};

const saveDietPlan = (recommendation) => {
  localStorage.setItem(dietPlanKey, JSON.stringify(recommendation));
};

const getSavedDietPlan = () => {
  try {
    return JSON.parse(localStorage.getItem(dietPlanKey) || "null");
  } catch (_error) {
    return null;
  }
};

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
  syncProtectedLinks(user);
};

const clearSession = () => {
  localStorage.removeItem(storageKey);
  localStorage.removeItem(userKey);
  renderAuthState(null);
  syncProtectedLinks(null);
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
    let data = {};
    if (responseText) {
      try {
        data = JSON.parse(responseText);
      } catch (_error) {
        if (!response.ok) {
          throw new Error(
            "The backend returned a non-JSON error. Check API_BASE_URL, Render logs, and FRONTEND_ORIGIN."
          );
        }
        throw new SyntaxError("Invalid JSON response.");
      }
    }

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

const renderDietPlan = (recommendation) => {
  if (!dietPlanResult) {
    return;
  }

  if (!recommendation) {
    dietPlanResult.innerHTML = `
      <div class="result-card">
        Generate a plan from the Smart Diet page to see your result here.
      </div>
    `;
    return;
  }

  const mealCards = [
    ["Breakfast", recommendation.mealPlan.breakfast],
    ["Lunch", recommendation.mealPlan.lunch],
    ["Evening Snack", recommendation.mealPlan.snack],
    ["Dinner", recommendation.mealPlan.dinner],
  ]
    .map(
      ([label, meal]) => `
        <article class="result-card meal-card">
          <p class="card-label">${label}</p>
          <h3>${meal.calories} kcal</h3>
          <ul>${meal.items.map((item) => `<li>${item}</li>`).join("")}</ul>
        </article>
      `
    )
    .join("");

  dietPlanResult.innerHTML = `
    <section class="result-summary-grid">
      <article class="result-card">
        <p class="card-label">Health Summary</p>
        <h3>${recommendation.inputs.gender}, ${recommendation.inputs.age} years</h3>
        <p><strong>Weight:</strong> ${recommendation.inputs.weight} kg</p>
        <p><strong>Height:</strong> ${recommendation.inputs.height} cm</p>
        <p><strong>BMI:</strong> ${recommendation.inputs.bmi} (${recommendation.bmiCategory})</p>
        <p><strong>Goal:</strong> ${recommendation.inputs.goal}</p>
        <p><strong>Activity:</strong> ${recommendation.inputs.activity}</p>
      </article>
      <article class="result-card calorie-highlight">
        <p class="card-label">Total Calories Needed</p>
        <h3>${recommendation.totalCalories} kcal/day</h3>
        <p>Calories are adjusted for your current goal and activity level.</p>
      </article>
    </section>
    <section class="meal-grid">
      ${mealCards}
    </section>
    <section class="result-card advice-card">
      <p class="card-label">Short Health Advice</p>
      <ul>${recommendation.advice.map((item) => `<li>${item}</li>`).join("")}</ul>
    </section>
  `;
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

      const data = await apiRequest(buildApiUrl("/api/auth/signup"), {
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

      const data = await apiRequest(buildApiUrl("/api/auth/signin"), {
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

if (nutrientForm) {
  nutrientForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const age = Number(document.getElementById("nutrient-age").value);

    try {
      if (Number.isNaN(age) || age < 0) {
        showToast("Please enter a valid age.", "error");
        return;
      }

      const data = await apiRequest(buildApiUrl(`/api/nutrients?age=${age}`), {
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

    const bmi = calculateBmi(heightCm, weightKg);
    const category = getBmiCategory(bmi);

    bmiResult.innerHTML = buildBmiComparisonMarkup(bmi, category);
    setTimeout(hideLoading, 250);
  });
}

if (dietForm) {
  const dietAgeInput = document.getElementById("diet-age");
  const dietGenderInput = document.getElementById("diet-gender");
  const dietWeightInput = document.getElementById("diet-weight");
  const dietHeightInput = document.getElementById("diet-height");
  const dietBmiInput = document.getElementById("diet-bmi");
  const dietGoalInput = document.getElementById("diet-goal");
  const dietActivityInput = document.getElementById("diet-activity");

  const syncDietBmi = () => {
    const height = Number(dietHeightInput.value);
    const weight = Number(dietWeightInput.value);

    if (!dietBmiInput.value) {
      const bmi = calculateBmi(height, weight);
      if (bmi) {
        dietBmiInput.placeholder = bmi.toFixed(1);
      }
    }
  };

  const syncDietDraft = () => {
    saveDietDraft({
      age: dietAgeInput.value,
      gender: dietGenderInput.value,
      weight: dietWeightInput.value,
      height: dietHeightInput.value,
      bmi: dietBmiInput.value,
      goal: dietGoalInput.value,
      activity: dietActivityInput.value,
    });
  };

  [dietAgeInput, dietGenderInput, dietWeightInput, dietHeightInput, dietBmiInput, dietGoalInput, dietActivityInput].forEach((field) => {
    field.addEventListener("input", () => {
      syncDietBmi();
      syncDietDraft();
    });
    field.addEventListener("change", syncDietDraft);
  });

  const savedDraft = getSavedDietDraft();
  if (savedDraft) {
    dietAgeInput.value = savedDraft.age || "";
    dietGenderInput.value = savedDraft.gender || "";
    dietWeightInput.value = savedDraft.weight || "";
    dietHeightInput.value = savedDraft.height || "";
    dietBmiInput.value = savedDraft.bmi || "";
    dietGoalInput.value = savedDraft.goal || "";
    dietActivityInput.value = savedDraft.activity || "";
  }

  syncDietBmi();

  dietForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!getToken()) {
      showToast("Please sign in to generate your diet plan.", "error");
      window.location.href = "signin.html";
      return;
    }

    const formData = new FormData(dietForm);
    const payload = Object.fromEntries(formData.entries());
    payload.age = Number(payload.age);
    payload.weight = Number(payload.weight);
    payload.height = Number(payload.height);
    payload.bmi = payload.bmi ? Number(payload.bmi) : calculateBmi(payload.height, payload.weight);
    payload.gender = trimValue(payload.gender);
    payload.goal = trimValue(payload.goal);
    payload.activity = trimValue(payload.activity);

    try {
      if (
        Number.isNaN(payload.age) ||
        Number.isNaN(payload.weight) ||
        Number.isNaN(payload.height) ||
        payload.age <= 0 ||
        payload.weight <= 0 ||
        payload.height <= 0 ||
        !payload.gender ||
        !payload.goal ||
        !payload.activity
      ) {
        showToast("Please complete all diet details with valid values.", "error");
        return;
      }

      const data = await apiRequest(buildApiUrl("/api/diet/recommendation"), {
        method: "POST",
        body: JSON.stringify(payload),
      });

      saveDietDraft({
        age: payload.age,
        gender: payload.gender,
        weight: payload.weight,
        height: payload.height,
        bmi: payload.bmi ? Number(payload.bmi).toFixed(1) : "",
        goal: payload.goal,
        activity: payload.activity,
      });
      saveDietPlan(data.recommendation);
      showToast(data.message, "success");
      window.location.href = "./diet-plan.html";
    } catch (error) {
      showToast(error.message, "error", error.details || []);
    }
  });
}

if (themeToggle) {
  themeToggle.addEventListener("click", () => {
    const currentTheme =
      document.documentElement.dataset.theme === "dark"
        ? "dark"
        : document.documentElement.dataset.theme === "light"
          ? "light"
          : window.matchMedia("(prefers-color-scheme: dark)").matches
            ? "dark"
            : "light";
    const nextTheme = currentTheme === "dark" ? "light" : "dark";
    localStorage.setItem(themeKey, nextTheme);
    document.documentElement.classList.add("theme-animating");
    applyThemePreference(nextTheme);
    setTimeout(() => {
      document.documentElement.classList.remove("theme-animating");
    }, 450);
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
  syncProtectedLinks(savedUser);

  if (dietPlanResult) {
    renderDietPlan(getSavedDietPlan());
  }

  if (!savedUser || !getToken()) {
    if (protectedPageRoot) {
      goToSignIn();
      return;
    }
    return;
  }

  try {
    const data = await apiRequest(buildApiUrl("/api/auth/me"));
    setSession(getToken(), data.user);
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
