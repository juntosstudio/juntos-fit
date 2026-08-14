# Juntos Fit — Settings Bottom Navigation

Changes:
- Removes the top Back-to-Dashboard navigation from Check-In Settings.
- Removes the extra Back button from the Settings action row.
- Keeps one centered Save Settings button.
- Adds the standard bottom navigation:
  - Today
  - Progress
  - Plan
  - Coach (disabled)
  - Settings (active)
- Leaves Daily / Weekly / Start / Create Plan wizard navigation unchanged.

This patch uses a new Settings-only CSS file so it does NOT overwrite
the current App.css or the PWA refresh test styling.

No SQL.
No npm install.
