# Change Log

Running record of changes made to this repo by the build agent. Newest entries at the top.
Every future change made in this project should be appended here before or right after it lands.

---

## 2026-09-17 — Quick-repeat yesterday's meal

**File:** [execution/frontend/src/components/SavedMeals.jsx](execution/frontend/src/components/SavedMeals.jsx)

- Added a fetch of yesterday's `users/{uid}/food_logs` (queried by `date`), grouped by the
  four standard meal types (Breakfast/Lunch/Dinner/Snacks), case-insensitive label match.
- Renders a "Yesterday's [Meal Type]" card (name + kcal + macros, same styling as existing
  saved-meal cards) for each meal type present in yesterday's log; skipped if absent.
- "+ Log Again" button copies that exact meal's items into today's matching-label log entry
  (merges into an existing entry for that label, or creates a new one) — mirrors the existing
  `handleLogConfirm` log logic.
- No new backend route; reuses the existing client-side Firestore read/write pattern already
  used for today's log.
- Status: implemented, `vite build` passes. Not yet committed to git.

---

## Pre-existing uncommitted changes (found at session start, not made by this agent)

As of 2026-09-15/17, the working tree already had these uncommitted, in progress:

- `execution/frontend/src/App.jsx` — wires up a new `legal` screen, imports `LegalDocs`.
- `execution/frontend/src/components/Login.jsx` — modified (not yet reviewed in detail).
- `execution/frontend/src/components/Settings.jsx` — adds an `onOpenLegal` entry point.
- `execution/frontend/src/components/LegalDocs.jsx` — new, untracked component.
- `execution/backend/backend_start.log`, `execution/frontend/vite_start.log` — untracked log
  files, likely accidental (not source, consider `.gitignore` or deletion).

---

## Prior git history (for reference)

- `56690ad` — Fix frontend API calls to use configurable backend URL, refresh copy, bump deps
- `a0440e6` — frontend updates: Khaaya onboarding, UI changes
- `73ab0fe` — security fixes: rate limiting, CORS, npm audit
- `6e5478a` — v3.0 — community cache, key rotation, saved meals, UI refactor
- `23081ad` — v2.0 — NIN RAG verification system, persistent vector cache, UX improvements
- `bc97342` — v1.1 — fix dark mode on Stats and Look pages
- `5ec675d` — docs: add version notes and tech stack
- `45f8dae` — v1.0 — LogYourMeal initial release
