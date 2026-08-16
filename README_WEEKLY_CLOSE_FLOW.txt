Juntos Fit — Weekly Closeout / Review Handoff

GOAL
Connect the real Weekly submit to the frozen Weekly Review + AI coach review,
and keep Sunday post-submit state consistent with the two-clock week model.

REPLACE / ADD
- src/App.jsx
- src/App.css
- src/hooks/useDashboard.js
- src/services/dashboardService.js
- src/pages/DashboardPage.jsx
- src/pages/ProgressPage.jsx
- src/pages/WeeklySummaryPage.jsx
- src/components/progress/PlanProgress.jsx
- src/utils/planProgress.js
- src/utils/planProgress.test.js

BEHAVIOR
Before Weekly submit on Weekly morning:
- Reporting Dashboard stays on the closing week.
- Plan Progress keeps that week Current.
- Week at a Glance links to Daily Check-Ins.

After successful final Weekly submit:
- The existing Weekly save completes first.
- Dashboard refreshes.
- The app immediately opens that exact Week's Weekly Review.
- A clear "Week X Check-In Complete" banner confirms the save.
- The existing Weekly Review AI effect automatically starts Juntos Coach review.
- AI failure remains separate from Weekly persistence and can be retried.

For the rest of the Weekly day after completion:
- Dashboard reporting remains on the just-closed week.
- Heading becomes "Week X Final Results".
- The section link becomes "See Weekly Review →".
- Main completed Weekly CTA becomes "View Week X Review ✓".
- Plan Progress marks the closed week Completed ✓.
- Plan Progress advances the prescription/program week to the next week Current.
- The new Current row is intentionally non-clickable until its first reporting
  morning, because there are no Daily Check-Ins for that new week yet.

The next morning:
- Reporting naturally advances to the new week.
- Week at a Glance becomes the new week.
- The current Plan Progress row becomes actionable to Daily Check-Ins again.

Also:
- User-facing "Weekly Summary" copy on the review page is renamed "Weekly Review".
- Completed status takes precedence in Plan Progress, including the final program week.

NO DATABASE MIGRATION.
NO Supabase push required for this ZIP.

INSTALL
1. Extract this ZIP directly into the app/project root.
2. Overwrite matching src files when prompted.
3. Run your normal tests.
4. Check DEV.
5. Build/deploy PROD.

STATIC CHECKS PERFORMED
- node --check passed for modified JS files.
- TypeScript parser syntax checks passed for modified JSX files.
- CSS brace balance passed.
- Direct date-rule assertions passed for Aug 16 closeout -> Plan Progress Week 4,
  while reporting remains Week 3 until Aug 17.
