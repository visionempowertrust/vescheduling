# ShalaSchedule

A zero-install school timetable planner that runs in the browser.

## Start

Open `index.html` in a modern browser. The included demo data is ready to generate immediately.

## Included in this MVP

- Teacher, class, room, and weekly lesson setup
- Teacher availability and maximum-period constraints
- Automatic scheduling with class, teacher, and room clash prevention
- Class-wise and teacher-wise timetable views
- Unplaced-lesson warnings when constraints cannot be satisfied
- Print / save-to-PDF support
- Browser-local saving; no account or server required

## Data note

This prototype stores school data in the current browser using `localStorage`. A production version should add user authentication, a database, spreadsheet import/export, substitutions, and role-based access.
