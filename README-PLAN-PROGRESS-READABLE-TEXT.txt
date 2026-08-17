Juntos Fit — Plan Progress readability polish

For people without eagle eyes. :)

Changes:
- Plan subtitle: 0.88rem -> 0.92rem
- Status pills (No Weekly Check-In / Current / Upcoming): 0.72rem -> 0.78rem
  with a tiny padding increase
- Detail text (Daily Check-Ins / Avg Weight): 0.84rem -> 0.86rem
- Secondary row text (No check-in data recorded / In progress): 0.78rem -> 0.86rem

Week titles remain unchanged so the hierarchy stays intact.

This App.css is based on the immediately prior Plan Progress patch and
preserves the Daily quick-save polish.

No DB push.
CSS-only frontend build/deploy.
