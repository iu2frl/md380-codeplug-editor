# Static Assets

This directory contains static assets for the web application.

## user.csv (not tracked)

The callsign database CSV is fetched fresh from radioid.net during each GitHub Pages deployment.
It is **not** tracked in the repository (see `.gitignore`).

This approach:
- Keeps the repo clean (no large CSV files in git history)
- Ensures users always get a reasonably recent callsign database
- Avoids CORS issues by serving it from the same origin
