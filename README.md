# Health Care

A simple full-stack web application for:

- Sign up and sign in
- Save patient reports in MongoDB
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

   If you want login/signup data and reports to be stored online even while the app is running locally on your computer, use a MongoDB Atlas connection string in `MONGODB_URI`. The website can run on `localhost`, while the data is saved in your online Atlas database. Example:

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
- If you deploy this repo to GitHub Pages, login, Google sign-in, reports, and MongoDB features will still need a separately hosted backend.

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
