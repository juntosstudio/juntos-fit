# Juntos Fit — In-App PWA Refresh Prompt

This adds the update behavior we locked:

**New version available**  
Refresh Juntos Fit to get the latest version.

**Refresh Now** | **Later**

## What it does

- Adds `vite-plugin-pwa` with prompt-based update behavior.
- Creates the service worker during production builds.
- Does not replace or generate a new web app manifest yet.
- Registers the service worker from inside Juntos Fit.
- Checks for newer deployed code:
  - when the installed app returns to the foreground
  - when the page is shown again
  - once per hour while open
- If a newer build exists, Juntos Fit shows the in-app prompt.
- `Refresh Now` activates the waiting version and reloads in place.
- `Later` dismisses the prompt and allows it to remind again after one hour.
- The prompt works the same from the installed mobile PWA and normal web browser.

## Install

Extract into:

`C:\FitnessCoach\App`

Then run:

```powershell
npm install
npm run build
```

`npm install` is important on this patch because it adds `vite-plugin-pwa`
and updates your `package-lock.json`.

Then run your normal Git push/deploy flow.

## Testing note

The service worker is intentionally a production feature. `npm run dev`
will still run normally, but the real update lifecycle is meant to be
tested from a deployed build / installed PWA.

## One-time bootstrap note

The PWA already on your iPhone currently has no service worker. That means
this first updater build must reach the installed app once before it can
manage future updates. After this version is loaded and registered, future
deployments can use the in-app `Refresh Now` prompt without recreating the
Home Screen shortcut.
