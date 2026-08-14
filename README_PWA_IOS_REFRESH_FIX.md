# Juntos Fit — iOS PWA Refresh Fix

Use this INSTEAD OF the previous `Refresh Now only` patch.

What changed:
- Keeps the immediate update check.
- Keeps foreground and hourly update checks.
- Removes the `Later` button.
- `Refresh Now` still asks the waiting service worker to activate.
- Adds an explicit `controllerchange` reload.
- Adds a 2.5-second fallback reload so iOS standalone PWAs cannot remain
  stuck on `Refreshing…` indefinitely.

Why:
The desktop browser completed the plugin-driven reload, but the iPhone
standalone PWA remained on `Refreshing…`. The waiting update was detected,
so the failure point is the final activation/reload handoff. This patch
makes that handoff explicit while preserving the normal browser path.

No SQL.
No npm install.

Extract into:
C:\FitnessCoach\App

Then build/push/deploy normally.
