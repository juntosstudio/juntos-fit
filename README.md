# Fitness Coach

A private Progressive Web Application (PWA) for structured fitness coaching, progress tracking, and long-term health analytics.

---

## Project Goals

Fitness Coach is designed to replace spreadsheets, email check-ins, and scattered notes with a single coaching platform.

The application provides:

- Daily fitness check-ins
- Weekly body measurements
- Progress photo tracking
- Coach feedback and recommendations
- Historical progress analysis
- Long-term coaching plans
- AI-assisted coaching (future)

The goal is to create a coaching experience that requires less than one minute per day while maintaining a complete history of progress.

---

## Technology Stack

Frontend

- React
- Vite

Backend

- Supabase
- PostgreSQL
- Supabase Authentication
- Supabase Storage

Hosting

- Vercel

Version Control

- Git
- GitHub

---

## Project Structure

```text
src/
database/
docs/
```

- `src/` contains the React application.
- `database/` contains SQL migration scripts.
- `docs/` contains project documentation and architecture.

---

## Development Workflow

1. Design the feature.
2. Update documentation if necessary.
3. Create or modify SQL migration scripts.
4. Implement the feature locally.
5. Test on localhost.
6. Commit working code to Git.
7. Push to GitHub.
8. Deploy automatically through Vercel.

---

## Current Development Status

Version 1 focuses on the core coaching workflow.

- User authentication
- Home screen
- Daily check-ins
- Weekly measurements
- Progress photos
- Coach feedback

Additional features will be added incrementally after the core workflow is complete.

---

## Design Philosophy

This project follows several guiding principles:

- Database-first design
- Relational database architecture
- One responsibility per table
- Simple, maintainable code
- Version-controlled database schema
- Documentation maintained alongside the codebase

The objective is to build software that remains understandable and maintainable as it grows.

---

## Development Team

### Project Owner & Lead Developer
**Deborah Reyna**

- Product vision
- Database design
- Application development
- User experience
- Testing
- Project management

### Architecture & Development Assistant
**ChatGPT (OpenAI)**

- Software architecture
- Technical design
- Pair programming
- Code generation
- Documentation
- Development guidance

---

## Project Philosophy

This application is being built incrementally using a database-first design approach. Each feature should be fully designed, documented, implemented, and tested before moving to the next.

The objective is to build maintainable software, not simply to make it work.