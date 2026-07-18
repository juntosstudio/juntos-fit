# Fitness Coach Database

## Purpose

This folder contains the database schema for the Fitness Coach application.

The schema is managed through SQL migration scripts that are stored in Git alongside the application code. The SQL files are considered the source of truth for the database structure.

---

## Philosophy

- Design first.
- Write SQL.
- Commit to Git.
- Execute in Supabase.
- Build the application against the schema.

Avoid making permanent schema changes directly in the Supabase GUI whenever possible.

---

## Migration Order

Run the SQL files in numeric order.

001_profiles.sql

002_daily_checkins.sql

003_weekly_measurements.sql

004_progress_photos.sql

005_coach_feedback.sql

Future migrations should continue the numbering.

Example:

006_workouts.sql

007_exercise_log.sql

---

## Database Design Goals

- PostgreSQL relational database
- Proper normalization
- Foreign keys whenever appropriate
- One responsibility per table
- Avoid duplicated data
- Keep tables focused and easy to understand

---

## Authentication

Authentication is handled by Supabase Auth.

The application does **not** store passwords.

The `profiles` table extends `auth.users` using the same UUID as its primary key.

---

## Row Level Security (RLS)

Every table exposed to the client should have Row Level Security enabled.

Policies should ensure users can only view and modify their own records.

---

## Notes

The goal of this project is not simply to store fitness data.

It is to build a long-term coaching platform that can grow to include:

- Daily check-ins
- Weekly measurements
- Progress photos
- Coach feedback
- Workout tracking
- Goal management
- Historical trends
- AI-assisted coaching

The database should remain clean, maintainable, and easy to extend as the application evolves.