Fitness Coach

                auth.users
                     │
                     ▼
                 profiles
                     │
     ┌───────────────┼────────────────┐
     ▼               ▼                ▼
daily_checkins weekly_measurements coach_feedback
                     │
                     ▼
             progress_photos

Home
   │
   ├── Daily Check-In
   ├── History
   ├── Weekly Summary
   └── Settings

   ## Application Flow

The Fitness Coach application is designed around a simple daily coaching workflow. Authentication is handled by Supabase Auth (`auth.users`), while the application stores user-specific information in the `profiles` table. Every authenticated user has one profile, which serves as the parent record for all personal fitness data.

The primary interaction is the Daily Check-In. Each user may submit one check-in per day, recording information such as morning weight, meal plan adherence, hunger, workout status, alcohol consumption, training issues, and notes for the coach. These records become the foundation for historical trends and future coaching feedback.

Once each week, the user records body measurements and progress photos. Weekly measurements are stored separately from daily check-ins because they represent long-term progress rather than daily habits. Progress photos are linked to their corresponding weekly measurement record, allowing each weekly check-in to include a complete visual progress set.

Coach feedback is also stored independently. Rather than embedding coaching comments directly within check-ins, feedback is maintained as its own entity, allowing multiple coaching entries to reference the same user over time while preserving a complete coaching history.

The application is intentionally designed using a normalized relational database. Each table has a single responsibility, minimizing duplicate data and making the system easier to maintain and extend. Future modules—including workout tracking, exercise history, meal plans, goal management, analytics, and AI-generated coaching—will build upon this foundation without requiring significant changes to the existing database structure.

The development philosophy for this project is to design the database first, implement the application against a stable schema, and treat both the application code and database migrations as version-controlled source code. The database schema, application code, and documentation evolve together to create a maintainable system that can continue to grow over time.