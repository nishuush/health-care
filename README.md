# Health Care

A simple full-stack web application for:

- Sign up and sign in
- Generate personalized smart diet recommendations
- Get nutrients guidance by age
- Calculate BMI

## Tech Stack

- Frontend: HTML, CSS, JavaScript
- Backend: Node.js, Express
- Database: MongoDB with Mongoose

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env` and update the values:

   ```env
   PORT=5000
   MONGODB_URI=mongodb://127.0.0.1:27017/patient_health_app
   JWT_SECRET=replace-with-a-secure-secret
   ```

   If you want login/signup data to be stored online even while the app is running locally on your computer, use a MongoDB Atlas connection string in `MONGODB_URI`. The website can run on `localhost`, while the data is saved in your online Atlas database. Example:

   ```env
   MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/patient_health_app?retryWrites=true&w=majority&appName=Cluster0
   ```

   Notes:

   - Replace `<username>` and `<password>` with your Atlas database user.
   - If your password contains special characters, URL-encode it.
   - Make sure your Atlas Network Access settings allow your IP.

3. Start MongoDB locally if you are using the local connection string.

4. Run the server:

   ```bash
   npm run dev
   ```

5. Open `http://localhost:5000`

## GitHub Pages

This repository now includes an automatic GitHub Pages workflow for the static frontend in `public/`.

Important:

- GitHub Pages can host the HTML/CSS/JS frontend only.
- The Node.js backend and MongoDB APIs cannot run on GitHub Pages.
- If you deploy this repo to GitHub Pages, login, Google sign-in, smart diet generation, and MongoDB features will still need a separately hosted backend.

### GitHub Variables for Frontend Build

When deploying to GitHub Pages, the workflow can generate frontend config files from GitHub Actions repository variables or secrets.

Set these in `Settings -> Secrets and variables -> Actions`:

- `API_BASE_URL`
- `FIREBASE_API_KEY`
- `FIREBASE_AUTH_DOMAIN`
- `FIREBASE_PROJECT_ID`
- `FIREBASE_STORAGE_BUCKET`
- `FIREBASE_MESSAGING_SENDER_ID`
- `FIREBASE_APP_ID`
- `FIREBASE_MEASUREMENT_ID`

The workflow uses these values to build:

- [public/app-config.js](</C:/Users/hk450/Documents/New project/public/app-config.js>)
- [public/firebase-config.js](</C:/Users/hk450/Documents/New project/public/firebase-config.js>)

Use repository `Variables` for frontend values when possible, because these values become part of the public static site after deployment. Only keep true server-side secrets, like `MONGODB_URI` and `JWT_SECRET`, on your backend hosting platform such as Render or Railway.

## Firebase Google Sign-In

The login page now includes a `Sign in with Google` button. To enable it:

1. In Firebase Console, open `Authentication` and enable `Google` as a sign-in provider.
2. Open your web app settings in Firebase and copy the Firebase config values into [public/firebase-config.js](</C:/Users/hk450/Documents/New project/public/firebase-config.js>).
3. Fill these fields:

   ```js
   window.FIREBASE_CONFIG = {
     apiKey: "",
     authDomain: "",
     projectId: "",
     storageBucket: "",
     messagingSenderId: "",
     appId: "",
     measurementId: "",
   };
   ```

4. After that, `Sign in with Google` on the login page will sign the user in and create or reuse the matching MongoDB user record.

5. If your frontend and backend are hosted on different URLs, set the backend base URL in [public/app-config.js](</C:/Users/hk450/Documents/New project/public/app-config.js>):

   ```js
   window.APP_CONFIG = {
     apiBaseUrl: "https://your-backend-url.onrender.com",
   };
   ```

   Keep it empty only when the frontend and backend run on the same origin, such as local `http://localhost:5000`.

## Backend Environment Variables

For local backend development, copy [.env.example](</C:/Users/hk450/Documents/New project/.env.example>) to `.env`.

For hosted backend deployment, set these environment variables on the backend host:

- `PORT`
- `MONGODB_URI`
- `JWT_SECRET`
- `FRONTEND_ORIGIN`

Example:

```env
FRONTEND_ORIGIN=https://yourname.github.io
```
