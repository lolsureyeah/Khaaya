# Khaaya — Handoff Doc

## Project
- App name: **Khaaya** (renamed from LogYourMeal)
- Local path: `C:\Khaaya`
- GitHub: https://github.com/lolsureyeah/LogYourMeal
- Frontend: `execution/frontend/` (React + Vite)
- Backend: `execution/backend/` (Node.js + Express)
- Database: Firebase Firestore (project: khaaya, region: asia-south1)
- Auth: Firebase Authentication (email + Google)
- AI Parser: Gemini 2.0 Flash Lite
- AI Embeddings: Gemini Embedding 001
- Key rotation: `geminiKeyRotator.js` (3 keys: GEMINI_API_KEY_1/2/3)

## Important rules
- Never touch `HumanCharacter.jsx` unless critical bug
- Never regenerate `nin_vectors.json`
- Never touch `ninMatcher.js` unless task requires it
- All API calls must include Firebase auth token header
- Surgical changes only — no unrelated refactors

## Deployment plan
- Backend → Railway (persistent Node.js, keeps `nin_vectors.json` in memory)
- Frontend → Firebase Hosting (khaaya.web.app)

## Deployment status so far
- Security audit done: rate limiting added to `/api/parse-food`, `/api/coach`, `/api/calculate-goals`; CORS origin fixed to `https://khaaya.web.app`; Firestore rules published (`allow read, write: if request.auth != null && request.auth.uid == userId`); npm audit fixed (3 high severity path-to-regexp issues resolved, 8 low severity remain in firebase-admin chain — left alone, force-fix would be a breaking change)
- Pushed to GitHub, Railway deploy attempted
- Railway root directory set to `execution/backend`
- Railway deployment **crashed** — error: `No Gemini API keys found. Set GEMINI_API_KEY_1/2/3 in .env` — environment variables were never added in Railway's Variables tab
- Not yet resolved: Railway env vars still need to be added (GEMINI_API_KEY_1/2/3, FIREBASE_SERVICE_ACCOUNT as JSON string, any other `.env` values)
- Frontend not yet deployed to Firebase Hosting

## Current blocker — local testing
Testing locally before going back to Railway:
- Backend running locally (`node index.js` or `npm run dev` in `execution/backend/`) — terminal shows it as still running, but exact port/output not yet confirmed
- Frontend running locally via `npm run dev` in `execution/frontend/` — Vite on `http://localhost:5173`
- Frontend logging a meal ("2 eggs") produces **"Error parsing food"** in UI
- Vite terminal shows:
  ```
  4:39:33 pm [vite] http proxy error: /api/calculate-goals
  Error: read ECONNRESET
  4:39:50 pm [vite] http proxy error: /api/parse-food
  Error: read ECONNRESET
  ```
- This means Vite's dev proxy cannot reach the backend — likely a port mismatch between backend's actual listening port and `vite.config.js` proxy target, or backend isn't fully healthy despite terminal showing it as "running"

## Next steps
1. Confirm exact port backend is listening on (check backend terminal startup log for `Server running on port X`)
2. Open `execution/frontend/vite.config.js`, check `server.proxy['/api'].target` — must match backend's actual port (likely should be `http://localhost:3001`)
3. If mismatched, fix vite.config.js or backend PORT env var, restart both, retest meal logging locally
4. Once local test passes end-to-end (login, log meal, AI Coach, weight tracking) — go back to Railway, add missing env vars, redeploy
5. After Railway backend is live and healthy, update frontend `.env` with `VITE_API_URL` pointing to Railway URL
6. Deploy frontend to Firebase Hosting (`firebase deploy`)
7. Final end-to-end test on live URLs

## User preferences
- Wants terminal commands and exact steps, not long explanations
- One step at a time, confirm before moving to next
- Direct, concise, no hedging
