import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js";

const googleButtons = document.querySelectorAll("[data-google-signin]");
const firebaseConfig = window.FIREBASE_CONFIG || {};
const ui = window.healthTrackUI;
const appConfig = window.APP_CONFIG || {};

const buildApiUrl = (path) => {
  const baseUrl = String(appConfig.apiBaseUrl || "").trim();
  if (!baseUrl) {
    return path;
  }

  return `${baseUrl.replace(/\/+$/, "")}${path}`;
};

const hasFirebaseConfig =
  firebaseConfig.apiKey &&
  firebaseConfig.authDomain &&
  firebaseConfig.projectId &&
  firebaseConfig.appId;

if (googleButtons.length && !hasFirebaseConfig) {
  googleButtons.forEach((button) => {
    button.disabled = true;
    button.title = "Add your Firebase config in public/firebase-config.js to enable Google sign-in.";
  });
}

if (googleButtons.length && hasFirebaseConfig) {
  const firebaseApp = initializeApp(firebaseConfig);
  const auth = getAuth(firebaseApp);
  const provider = new GoogleAuthProvider();
  auth.useDeviceLanguage();

  googleButtons.forEach((button) => {
    button.addEventListener("click", async () => {
      try {
        ui?.showLoading?.();

        const result = await signInWithPopup(auth, provider);
        const payload = {
          name: result.user.displayName || "Google User",
          email: result.user.email || "",
          googleId: result.user.uid,
        };

        const response = await fetch(buildApiUrl("/api/auth/firebase-google"), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });

        const text = await response.text();
        const data = text ? JSON.parse(text) : {};

        if (!response.ok) {
          throw new Error(data.message || "Unable to sign in with Google.");
        }

        ui?.setSession?.(data.token, data.user);
        ui?.showToast?.(data.message, "success");
        window.location.href = ui?.getRedirectTarget?.() || "./diet.html";
      } catch (error) {
        const message =
          error instanceof TypeError
            ? "Google account opened, but the backend could not be reached. Check APP_CONFIG apiBaseUrl and backend hosting."
            : error.message || "Unable to sign in with Google.";
        ui?.showToast?.(message, "error");
      } finally {
        ui?.hideLoading?.();
      }
    });
  });
}
