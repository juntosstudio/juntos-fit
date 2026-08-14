# Juntos Fit — Plan Tab V1

Adds the real read-only Plan tab.

## Layout
- Dynamic title/dropdown: `Deb’s Current Plan`
- Future dropdown naming convention: `Plan Type — Dates`
- Goal, current week, dates, and check-in day at the top
- Two-column cards at normal mobile/desktop widths:
  - Daily Nutrition
  - Weekly Activity
  - Check-In Schedule
  - Tracking
- Secondary detail cards stack only at an extremely narrow effective viewport.

## Data shown
- Calories / protein / carbs / fat
- Water target when tracked
- Weekly workout and cardio targets
- Weekly check-in day
- Waist weekly
- Full measurements every 4 weeks + final
- Photos every 4 weeks + final
- Saved measurement side
- Current body-fat tracking method
- Water/alcohol on/off
- Unit system

## Navigation
- The bottom Plan tab now opens this page.
- Check-In Settings links to the existing Settings page.
- No Edit Plan yet.
- Old plan selection is not wired yet; the dropdown is deliberately ready for it.

## Install
Extract into:

C:\FitnessCoach\App

Then run:

npm run build
npm run dev

No SQL migration is required.
