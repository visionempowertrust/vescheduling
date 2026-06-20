# VE Scheduler

A zero-install school timetable planner that runs in the browser.

## Start

Open `index.html` in a modern browser. The included demo data is ready to generate immediately.

## Included in this MVP

- VE staff, class, location, and weekly activity setup
- VE staff availability and maximum-period constraints
- Activity eligibility configured for each VE staff member
- Fixed weekday/period sessions scheduled before flexible sessions
- VE staff directory with state/name filters and facilitator-style registration
- Manual period-by-period work calendars for every VE staff member
- Online and offline activity scheduling
- Automatic scheduling with class, staff, and location clash prevention
- Class-wise and VE staff-wise timetable views
- Unplaced-activity warnings when constraints cannot be satisfied
- Print / save-to-PDF support
- Browser-local saving; no account or server required

## Data note

This prototype stores school data in the current browser using `localStorage`. A production version should add user authentication, a database, spreadsheet import/export, substitutions, and role-based access.
