# Khaaya
## Nutrition Tracker built for South Asian Food

---

## WHAT THIS IS
Khaaya is a nutrition tracker built around South Asian food and eating patterns:
- AI-powered food parser (Gemini 2.5 Flash) — understands natural language meal descriptions in any language
- NIN (National Institute of Nutrition) verified food database for Indian food accuracy, with community-cached AI estimates as fallback
- Voice input for meal logging
- Quick-repeat: re-log yesterday's meals by type in one tap
- Saved meals you can re-log in one tap
- AI goal calculator — daily calorie and macro targets from your stats, goal and timeline
- Weight + measurements tracker with charts
- Firebase Auth (email, Google, or guest mode) + Firestore persistence
- Onboarding wizard shown only on first login

---

## PREREQUISITES
- Node.js LTS (nodejs.org)
- Git (git-scm.com)
- Firebase project (console.firebase.google.com) — project ID: khaaya
- Gemini API keys (aistudio.google.com) — 3 keys for rotation

---

## STEP 1 — CLONE / OPEN

```bash
git clone https://github.com/lolsureyeah/Khaaya.git
cd Khaaya
```

---

## STEP 2 — SET UP ENVIRONMENT VARIABLES

**Frontend** — `execution/frontend/.env`:
```
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=khaaya
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
VITE_API_URL=http://localhost:3001   # points to live backend URL in production
```

**Backend** — `execution/backend/.env`:
```
GEMINI_API_KEY_1=...
GEMINI_API_KEY_2=...
GEMINI_API_KEY_3=...
PORT=3001
```

For local dev, `execution/backend/serviceAccount.json` (Firebase Admin SDK key for the `khaaya` project) is loaded directly.
For production, set `FIREBASE_SERVICE_ACCOUNT` as an environment variable containing the full JSON contents — the backend checks this env var first and falls back to the local file.

Neither `.env` nor `serviceAccount.json` should ever be committed.

---

## STEP 3 — INSTALL DEPENDENCIES

```bash
cd execution/frontend
npm install

cd ../backend
npm install
```

---

## STEP 4 — RUN LOCALLY

**Terminal 1 (backend):**
```bash
cd execution/backend
npm start
# → LogYourMeal backend running on port 3001
```

**Terminal 2 (frontend):**
```bash
cd execution/frontend
npm run dev
# → Local: http://localhost:5173
```

Open http://localhost:5173 in your browser.

---

## STEP 5 — DEPLOY BACKEND (Railway or Render)

1. Create a new web service and connect `lolsureyeah/Khaaya`
2. Root Directory: `execution/backend`
3. Build Command: `npm install`
4. Start Command: `npm start`
5. Environment Variables: `GEMINI_API_KEY_1/2/3`, `FIREBASE_SERVICE_ACCOUNT` (full JSON as one value)
6. Deploy — copy the live URL (e.g. `khaaya-backend.up.railway.app`)

Note: Render's free tier spins down after 15 min of inactivity (~30-50s cold start on the next request). Fine for pre-launch, upgrade before real launch traffic.

---

## STEP 6 — DEPLOY FRONTEND (Firebase Hosting)

Update `execution/frontend/.env`:
```
VITE_API_URL=https://<your-backend-url>
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

After deploy, add `khaaya.web.app` to:
Firebase Console → Authentication → Settings → Authorized domains

Also confirm backend CORS in `execution/backend/index.js` includes this exact domain.

---

## PROJECT STRUCTURE

```
Khaaya/
├── README.md
├── firebase.json / firestore.rules / .firebaserc
├── execution/
│   ├── frontend/          ← React + Vite app
│   └── backend/           ← Express API (Gemini parsing, goal calculator, saved meals, auth middleware)
```

---

## SECURITY CHECKLIST
- Rate limiting on `/api/parse-food` and `/api/calculate-goals`
- CORS locked to production frontend domains
- Firestore rules restrict `users/{uid}` read/write to that user; `community_foods` is backend-only (no client access)
- `requireAuth` (Firebase ID token verification) on all `/api/` routes
- Gemini API key sent in the `x-goog-api-key` header, not the URL
- No secrets or log files committed to git
- Run `npm audit` periodically in both `execution/frontend` and `execution/backend`

---

## TROUBLESHOOTING

| Problem | Solution |
|---------|----------|
| Food parsing empty / errors | Check backend is running + `GEMINI_API_KEY_1/2/3` are set |
| Firebase auth fails | Check `.env` `VITE_FIREBASE_*` values are correct |
| Google Sign-In blocked | Add domain to Firebase Auth → Authorized Domains |
| Deploy blank page | Check `firebase.json` public path = `execution/frontend/dist` |
| Backend crashes on deploy — "No Gemini API keys found" | Env vars not set on hosting platform (Railway/Render) — add them in dashboard |
| Backend crashes — Firebase Admin init fails | Confirm `FIREBASE_SERVICE_ACCOUNT` env var is set with full JSON, or `serviceAccount.json` exists locally |
| Vite proxy ECONNRESET | Backend not running or wrong port — check `vite.config.js` proxy target matches backend `PORT` |
