# Juntos Fit — PWA Refresh Test V2

Tiny visible update to test the new in-app PWA refresh flow.

After deploying this build, KEEP using the Juntos Fit Home Screen app
you just installed. Do not recreate the shortcut and do not manually
refresh in Safari.

When the installed app detects this deployment, it should show:

New version available
Refresh Juntos Fit to get the latest version.

[ Refresh Now ] [ Later ]

Tap Refresh Now.

After the reload, the Dashboard should show a small green line:

PWA refresh test ✓

That confirms the newly deployed bundle loaded through the updater.

No SQL.
No npm install needed for this patch.

Install over:
C:\FitnessCoach\App

Then run your normal build/push flow.
