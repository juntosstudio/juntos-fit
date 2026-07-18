# Fitness Coach Coding Standards

## General Principles

- Keep the code simple and readable.
- Prefer clarity over cleverness.
- Build only what is currently needed.
- Avoid duplicate logic and duplicate data.
- Use consistent naming throughout the project.
- Database changes must be documented and committed to Git.

---

## Project Structure

```text
src/
database/
docs/

## Database Standards  

Table Names

Use lowercase plural names with underscores.

Examples:

profiles
daily_checkins
weekly_measurements
progress_photos
coach_feedback
Column Names

Use lowercase snake_case.

Examples:

user_id
checkin_date
created_at
updated_at
Primary Keys

Use:

id

Primary keys should use the PostgreSQL uuid type unless there is a specific reason not to.

Foreign Keys

Name foreign keys using the referenced entity followed by _id.

Examples:

user_id
measurement_id
checkin_id

Define foreign-key constraints explicitly.

User References

Application tables that belong to a user should reference:

auth.users.id

Use:

on delete cascade

when child records should be removed with the user.

Timestamps

Use:

created_at
updated_at

Type:

timestamptz

Default:

now()
Constraints

Use database constraints whenever possible.

Examples:

not null
unique
check
foreign keys

Do not rely only on frontend validation.

Row Level Security

Enable Row Level Security on every application table exposed through Supabase.

Users should only be allowed to read or modify their own records.

Schema Changes

All permanent schema changes must be written as SQL files in the database/ folder.

Do not rely on undocumented GUI changes.

Name scripts in execution order:

001_profiles.sql
002_daily_checkins.sql
003_weekly_measurements.sql
SQL Style

Use lowercase SQL keywords.

Example:

create table public.profiles (
    id uuid primary key,
    display_name text
);

Use -- for short comments.

-- Create the profiles table

Use block comments for file headers or longer explanations.

/*
Purpose:
    Stores application profile information.
*/

Format columns one per line.

Use indentation consistently.

JavaScript and React Standards
File Names

Use:

PascalCase.jsx for React components
camelCase.js for utilities
lowercase folder names

Examples:

DailyCheckIn.jsx
HomeScreen.jsx
supabase.js
Variables and Functions

Use camelCase.

Examples:

morningWeight
handleSubmit
loadDailyCheckIn
Components

Use PascalCase.

Examples:

DailyCheckIn
WeeklySummary
HistoryView
Constants

Use uppercase snake case for true constants.

Example:

const DEV_BYPASS_LOGIN = true
React
Use functional components.
Keep components focused on one responsibility.
Move repeated logic into helper functions or hooks.
Avoid putting the entire application in App.jsx as the project grows.
Validate user input before saving.
Display clear error and success messages.
Environment Variables

Never commit secrets or local environment files.

Files such as these must remain in .gitignore:

.env
.env.local

Frontend-safe variables must use the Vite prefix:

VITE_

Never expose Supabase secret or service-role keys in frontend code.

Git Standards

Commit only working checkpoints.

Use clear commit messages.

Examples:

Add profiles table migration
Build daily check-in form
Connect check-in form to Supabase
Fix authentication redirect

Do not commit:

passwords
secret keys
temporary files
generated build folders
broken experimental code unless intentionally saved on a branch
Documentation

Update documentation when an architectural or database decision changes.

Important decisions should explain:

what was decided
why it was decided
what alternatives were rejected

Consistency is more important than perfection.