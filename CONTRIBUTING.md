# Contributing

Thank you for contributing to MD380 Codeplug Editor.

## Before You Start

Read these project documents first:

- [specs.md](specs.md)
- [ui.md](ui.md)
- [tests.md](tests.md)
- [roadmap.md](roadmap.md)

## Core Principles

- Keep the app static and client-side first.
- Keep codeplug and callsign workflows separate.
- Preserve safe defaults (backup-before-write, explicit confirmations).
- Maintain compatibility for D and S variants.

## Development Setup

### Web App

```bash
cd web
npm install
npm run dev
```

### Tests and Build

```bash
cd web
npm test
npm run build
```

## Coding Guidelines

- TypeScript-first for frontend code.
- Keep modules small and composable.
- Add tests for parser, validation, and transfer behavior.
- Keep binary transformation tests deterministic.
- Avoid unrelated refactors in feature PRs.

## Pull Request Checklist

Before opening a PR:

1. Confirm scope matches current documented priorities.
2. Run tests (`npm test`) and build (`npm run build`) in `web/`.
3. Update docs when workflows or commands changed.
4. Include clear reproduction/validation notes.
5. Keep changes focused and reviewable.

## Commit Guidelines

- Use clear, concise commit messages.
- One logical change per commit when practical.
- Reference issue numbers when relevant.

## Reporting Bugs and Requesting Features

- Use GitHub Issues.
- Include expected vs actual behavior.
- Include environment details (OS, browser, helper runtime).
- For parser issues, include a minimal fixture description and failing case.

## Security Issues

Do not report vulnerabilities in public issues.

Follow [SECURITY.md](SECURITY.md).
