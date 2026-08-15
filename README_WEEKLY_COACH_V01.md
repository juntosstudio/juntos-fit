# Juntos Fit — Weekly Coach / Brain Lite v0.1

## What this patch does

This is the first production-shaped slice of THE BRAIN.

A completed Weekly Check-In can now produce one saved Juntos Coach review with:

- **How Your Week Went**
- **What I’m Seeing**
- **This Week’s Focus**
- optional **Watch Item**
- assessment: `on_track`, `watch`, or `needs_attention`
- deterministic data confidence: `high`, `medium`, or `low`
- prescription action: **HOLD only**

Brain Lite does **not** modify calories, macros, cardio, workouts, or any other prescription target.

## Architecture intentionally kept for the full Brain

```text
Completed Weekly Check-In
        ↓
CoachingDataBuilder / CoachingPacket
        ↓
HardRulesEngine
        ↓
Versioned CoachingProtocol
        ↓
MemoryProvider
        ↓
AiCoachProvider
        ↓
RecommendationValidator
        ↓
CoachReviewRepository
        ↓
Weekly Summary
```

Several layers are deliberately tiny in v0.1. They exist now so future Brain work adds capability behind stable seams instead of moving the OpenAI call into React or rewriting the whole path later.

Important v0.1 boundaries:

- Weekly Check-In saves independently of AI generation.
- AI failure cannot undo or corrupt a Weekly Check-In.
- The browser never receives the OpenAI API key.
- The model may assess; it cannot write a prescription.
- Code owns data confidence and validates the returned action.
- The Weekly Review is saved once and reused when its input hash is unchanged.
- DEV Weekly Summary Preview never calls OpenAI and never creates a fake review.
- The input snapshot, protocol version, hard-rules version, model, and token usage are stored with the review for future debugging/auditing.
- Relationship/active/recent memory arrays are empty in v0.1, but the `MemoryProvider` seam is already present.

## Files added

```text
src/services/weeklyCoachService.js
src/styles/weeklyCoachReview.css

supabase/migrations/20260815000100_weekly_coach_reviews_v01.sql

supabase/functions/_shared/brain/types.ts
supabase/functions/_shared/brain/protocol.ts
supabase/functions/_shared/brain/memoryProvider.ts
supabase/functions/_shared/brain/hardRules.ts
supabase/functions/_shared/brain/coachingPacket.ts
supabase/functions/_shared/brain/aiCoachProvider.ts
supabase/functions/_shared/brain/validateCoachResponse.ts
supabase/functions/_shared/brain/reviewRepository.ts
supabase/functions/generate-weekly-coach-review/index.ts
```

## Files replaced

```text
src/pages/WeeklySummaryPage.jsx
src/services/weeklySummaryService.js
.gitignore
```

No changes are required to Weekly Check-In submission itself.

---

# Install

Run these commands from:

```powershell
C:\FitnessCoach\App
```

## 1. Extract the patch into the project root

Use the ZIP supplied with this patch and preserve its folder paths.

Example:

```powershell
Expand-Archive -Path .\juntos-fit-weekly-coach-v01.zip -DestinationPath . -Force
```

If the ZIP is in Downloads, use its actual path instead.

## 2. Add the Edge Function configuration without replacing `config.toml`

This app uses the current Supabase publishable-key setup and the function performs its own signed-in-user authorization. Add this one function section to the existing config only when it is not already present:

```powershell
$configPath = ".\supabase\config.toml"
$config = [System.IO.File]::ReadAllText($configPath)

if ($config -notmatch '\[functions\.generate-weekly-coach-review\]') {
    $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
    $functionConfig = [Environment]::NewLine +
        "[functions.generate-weekly-coach-review]" + [Environment]::NewLine +
        "verify_jwt = false" + [Environment]::NewLine

    [System.IO.File]::AppendAllText(
        $configPath,
        $functionConfig,
        $utf8NoBom
    )
}
```

To verify:

```powershell
Get-Content .\supabase\config.toml | Select-String -Pattern "generate-weekly-coach-review|verify_jwt"
```

You should see:

```text
[functions.generate-weekly-coach-review]
verify_jwt = false
```

## 3. Store the OpenAI key as a Supabase Edge Function secret

Do **not** paste the key into source code, Vite `.env`, React, or this README.

This PowerShell sequence keeps the key out of the typed command itself and deletes the temporary file immediately after upload:

```powershell
$SecureOpenAIKey = Read-Host "Paste OpenAI API key" -AsSecureString
$OpenAIKey = [System.Net.NetworkCredential]::new("", $SecureOpenAIKey).Password
$SecretFile = Join-Path (Get-Location) "supabase\functions\.env.deploy"
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)

[System.IO.File]::WriteAllText(
    $SecretFile,
    "OPENAI_API_KEY=$OpenAIKey",
    $utf8NoBom
)

npx supabase secrets set --env-file $SecretFile

Remove-Item $SecretFile
Remove-Variable SecureOpenAIKey, OpenAIKey, SecretFile, utf8NoBom
```

Verify the secret **name** exists (the value is not printed):

```powershell
npx supabase secrets list
```

Look for:

```text
OPENAI_API_KEY
```

## 4. Push the database migration

```powershell
npx supabase db push
```

This creates `weekly_coach_reviews` with RLS. Authenticated browser users may read only their own saved reviews; browser writes are revoked. The Edge Function performs review writes after verifying ownership.

## 5. Deploy Brain Lite

```powershell
npx supabase functions deploy generate-weekly-coach-review --no-verify-jwt
```

The function itself still requires a signed-in Supabase user and verifies the requested Weekly Check-In belongs to that user before using server-side access.

## 6. Build the app

```powershell
npm run build
```

Then run/deploy Juntos the same way you normally do.

---

# Tomorrow’s real flow

```text
Submit Weekly Check-In
        ↓
Weekly saves normally
        ↓
Return to Today
        ↓
Open Previous Week Summary
        ↓
"Juntos Coach is reviewing your week…"
        ↓
Saved Coach Review appears
```

Opening the same unchanged Weekly Summary again loads the saved database review. The Edge Function also hashes the complete Brain input and will return the saved review instead of making another OpenAI call when nothing changed.

If generation fails, the Weekly Check-In and Weekly Summary remain saved. The Coach Review area shows a retry button.

# What the v0.1 Brain sees

The coaching packet currently includes:

- goal and program week
- exact saved weekly prescription snapshot when available
- current week Daily-derived adherence/weight/hunger/activity/water/alcohol context
- Weekly waist/body-fat/recovery/context/reflection
- Start Day baseline
- two earlier program weeks of Daily-derived history
- prior Weekly context when it actually exists
- current tracking settings
- age in years and sex (DOB itself is not sent to OpenAI)
- deterministic data-quality information
- empty future memory-provider slots

It intentionally excludes later/new-week data from the review.

# Cost visibility

Each saved review records OpenAI input, output, and total token counts. After the first real Weekly review, those values can be used with the configured model’s current API pricing to calculate the actual cost of that heartbeat instead of guessing.

# v0.1 model defaults

The Edge Function currently defaults to:

```text
model: gpt-5.6-terra
reasoning effort: low
```

Those are behind the `AiCoachProvider` boundary. A later model swap does not require changing the coaching packet, hard-rules engine, protocol, validator, repository, or Weekly Summary UI.
