Juntos Fit — Check-In Settings test fix

This is a TEST-ONLY fix.

The failing test asked saveCheckInSettings() to save
track_menstrual_cycle_context: true, but its mocked Supabase
returned row omitted that field.

The real service correctly normalizes the returned row, so the
missing mocked value normalized to false and caused the assertion
failure.

The mock now returns the same menstrual tracking value that the
upsert saved.

Run:
    npm run test:run

No DB push.
No frontend deploy required for behavior.
