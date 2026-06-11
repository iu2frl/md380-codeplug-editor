# Security Policy

## Supported Scope

Security reports are accepted for:

- The web application in `web/`
- Build and dependency configuration in this repository

## Reporting a Vulnerability

Please do not open a public issue for undisclosed vulnerabilities.

Use GitHub Security Advisories for private reporting:

1. Open the repository on GitHub.
2. Go to Security.
3. Select Report a vulnerability.
4. Include reproduction details and impact.

If private advisory reporting is unavailable, open a normal issue with minimal details and state that you need a private contact channel.

## What to Include

Please include:

- Affected component and file path
- Steps to reproduce
- Proof-of-concept details
- Potential impact
- Suggested fix (if available)
- Environment (OS, browser/runtime versions)

## Disclosure Process

- We will acknowledge reports as soon as practical.
- We will validate and triage severity.
- We will prepare and publish a fix.
- We will coordinate disclosure timing when needed.

## Out of Scope

The following are generally out of scope unless chainable to meaningful impact:

- Missing best-practice HTTP headers on local dev servers
- Self-XSS requiring full user-controlled console/script execution
- Denial of service requiring unrealistic resource abuse

## Dependency Security

- Keep `npm` dependencies updated.
- Do not commit secrets or tokens into the repository.
