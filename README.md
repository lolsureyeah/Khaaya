# Khaaya
## Nutrition Tracker Built for South Asian Food

***

## WHAT THIS IS
Khaaya is a nutrition tracker built around South Asian food and eating patterns:

* AI powered food parser (Gemini 2.5 Flash) that understands natural language meal descriptions in any language
* NIN (National Institute of Nutrition) verified food database for Indian food accuracy, with community cached AI estimates as a fallback
* Voice input for meal logging
* Quick repeat: relog yesterday's meals by type in one tap
* Saved meals you can log again in one tap
* AI goal calculator that sets daily calorie and macro targets from your stats, goal and timeline
* Weight and measurements tracker with charts
* Firebase Auth (email, Google or guest mode) with Firestore persistence
* Onboarding wizard shown only on first login

***

## PREREQUISITES
* Node.js LTS (nodejs.org)
* Git (git-scm.com)
* Firebase project (console.firebase.google.com), project ID: khaaya
* Gemini API keys (aistudio.google.com), 3 keys for rotation

***

## STEP 1: CLONE / OPEN

```bash
git clone https://github.com/lolsureyeah/Khaaya.git
cd Khaaya
```

***

## STEP 2: SET UP ENVIRONMENT VARIABLES

**Frontend** in `execution/frontend/.env`:
```
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=khaaya
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
VITE_API_URL=http://localhost:3001
```
In production, `VITE_API_URL` points to the live backend URL.

**Backend** in `execution/backend/.env`:
```
GEMINI_API_KEY_1=...
GEMINI_API_KEY_2=...
GEMINI_API_KEY_3=...
PORT=3001
```

For local development, `execution/backend/serviceAccount.json` (the Firebase Admin SDK key for the `khaaya` project) is loaded directly. For production, set `FIREBASE_SERVICE_ACCOUNT` as an environment variable containing the full JSON contents. The backend checks this variable first and falls back to the local file.

Neither `.env` nor `serviceAccount.json` should ever be committed.

***

## STEP 3: INSTALL DEPENDENCIES

```bash
cd execution/frontend
npm install

cd ../backend
npm install
```

***

## STEP 4: RUN LOCALLY

**Terminal 1 (backend):**
```bash
cd execution/backend
npm start
```
The backend runs on port 3001.

**Terminal 2 (frontend):**
```bash
cd execution/frontend
npm run dev
```
The app is served at http://localhost:5173. Open it in your browser.

***

## STEP 5: DEPLOY BACKEND (Railway or Render)

1. Create a new web service and connect `lolsureyeah/Khaaya`
2. Root Directory: `execution/backend`
3. Build Command: `npm install`
4. Start Command: `npm start`
5. Environment Variables: `GEMINI_API_KEY_1/2/3` and `FIREBASE_SERVICE_ACCOUNT` (full JSON as one value)
6. Deploy, then copy the live URL

Note: Render's free tier spins down after 15 minutes of inactivity, which causes a 30 to 50 second cold start on the next request. This is fine before launch. Upgrade before real launch traffic.

***

## STEP 6: DEPLOY FRONTEND (Firebase Hosting)

Update `execution/frontend/.env`:
```
VITE_API_URL=https://<your backend url>
```

```bash
cd execution/frontend
npm run build

cd ../..
npx firebase-tools login --no-localhost
npx firebase-tools use khaaya
npx firebase-tools deploy --only hosting
```

To deploy Firestore rules:
```bash
npx firebase-tools deploy --only firestore:rules
```

Live at: https://khaaya.web.app

After deploying, add `khaaya.web.app` to Firebase Console → Authentication → Settings → Authorized domains.

Also confirm the backend CORS list in `execution/backend/index.js` includes this exact domain.

***

## PROJECT STRUCTURE

```
Khaaya/
├── README.md
├── firebase.json, firestore.rules, .firebaserc
└── execution/
    ├── frontend/    React and Vite app
    └── backend/     Express API (Gemini parsing, goal calculator, saved meals, auth middleware)
```

***

## SECURITY CHECKLIST
* Rate limiting on `/api/parse-food` and `/api/calculate-goals`
* CORS locked to the production frontend domains
* Firestore rules restrict `users/{uid}` read and write access to that user
* `community_foods` is backend only, with no client access
* `requireAuth` (Firebase ID token verification) on all `/api/` routes
* Gemini API key sent in a request header, never in the URL
* No secrets or log files committed to git
* Run `npm audit` periodically in both `execution/frontend` and `execution/backend`

***

## TROUBLESHOOTING

| Problem | Solution |
|---------|----------|
| Food parsing empty or errors | Check the backend is running and `GEMINI_API_KEY_1/2/3` are set |
| Firebase auth fails | Check the `VITE_FIREBASE_*` values in `.env` are correct |
| Google Sign In blocked | Add the domain under Firebase Auth → Authorized Domains |
| Deploy shows a blank page | Check `firebase.json` public path is `execution/frontend/dist` |
| Backend crashes on deploy with "No Gemini API keys found" | Environment variables are not set on the hosting platform. Add them in the dashboard |
| Backend crashes because Firebase Admin init fails | Confirm `FIREBASE_SERVICE_ACCOUNT` is set with the full JSON, or that `serviceAccount.json` exists locally |
| Vite proxy ECONNRESET | Backend is not running or on a different port. Check the `vite.config.js` proxy target matches the backend `PORT` |
