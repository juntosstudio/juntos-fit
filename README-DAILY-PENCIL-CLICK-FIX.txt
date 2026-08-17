Juntos Fit — Daily pencil click hotfix

Cause:
CurrentWeekPage passed onEditDay into DayRow, and the pencil called it,
but DayRow forgot to receive/destructure the onEditDay prop. Because the
click used optional chaining, it silently did nothing.

Fix:
Add onEditDay to DayRow's props.

No DB push.
No Edge Function deploy.
Frontend build/deploy only.
