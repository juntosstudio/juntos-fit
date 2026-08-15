# Juntos Fit Playwright Browser Regression

These tests use the real Vite app and a saved local Supabase browser session.

They do not submit a Daily Check-In. The Daily browser test changes form state only in the browser and returns without saving.

## 1. Install Playwright

From `C:\FitnessCoach\App`:

```powershell
npm install -D @playwright/test
npx playwright install chromium
```

## 2. Copy the files

Copy:

- `playwright.config.js` -> project root
- `e2e\save-auth.mjs` -> `e2e`
- `e2e\browser-regression.spec.js` -> `e2e`

## 3. Save your login session once

```powershell
node e2e\save-auth.mjs
```

A Chromium window opens. Sign in normally. Once the Dashboard appears, the browser closes and `.auth\user.json` is saved locally.

Do not commit `.auth\user.json`.

Add this line to `.gitignore` if it is not already there:

```text
.auth/
```

## 4. Run browser tests

```powershell
npx playwright test 2>&1 | Tee-Object -FilePath playwright-output.txt
```

Expected first run: 4 browser tests.

If the Cardio `0` test fails, keep the failure output and Playwright trace. That is useful evidence of a real Chromium behavior problem rather than a jsdom-only test issue.
