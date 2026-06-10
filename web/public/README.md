# Static Assets

This directory contains assets bundled with the web application.

## user.csv

The callsign database CSV is fetched during CI/CD deployment and placed here.
It is served as a same-origin resource, avoiding CORS issues.
