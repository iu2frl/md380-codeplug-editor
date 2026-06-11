# MD380 Codeplug Editor

Static browser-first editor for MD380/MD390/RT3/RT8 codeplug files.

## Status

Beta.

> [!WARNING]
> Use this software at your own risk.
> Incorrect operations can brick or damage your transceiver. The maintainer is not responsible for device damage, data loss, or other consequences.

## What This Project Includes

- Web editor for importing, editing, validating, and exporting codeplug files (`.rdt` and `.bin`).
- Browser WebUSB radio transfer flow (connect/read/write) in the UI.
- Browser callsign database update workflow.

## Supported Radios

- TYT MD380
- TYT MD390
- Retevis RT3
- Retevis RT8

Both D (no GPS) and S (GPS) family handling are part of project scope.

## Quick Start (Web App)

From repository root:

```bash
cd web
npm install
npm run dev
```

Open the local URL shown by Vite.

For production build:

```bash
npm run build
```

For tests:

```bash
npm test
```

## Recommended Operator Flow

1. Read codeplug from radio using browser WebUSB.
2. Import/read into web editor.
3. Edit fields and review validation panel.
4. Export edited file.
5. Write back with explicit confirmation and backups.

## Environment Variables

The web app supports optional SEO/runtime metadata configuration using Vite env vars:

- `VITE_GOOGLE_SITE_VERIFICATION`
	- Optional Google Search Console verification value.
	- If missing, build and deployment still succeed.
- `VITE_SITE_URL`
	- Optional canonical/OG site URL override.
	- Defaults to GitHub Pages project URL.

## Project Layout

- `web/` - Vite + TypeScript frontend.
- `artifacts/` - Generated outputs (`codeplug/*`, `callsign/*`).
- `examples/` - Reference code, fixtures, and upstream tools used by the project.
- `roadmap.md`, `specs.md`, `ui.md`, `tests.md` - Product, technical, UI, and test requirements.

## Documentation

- Product and constraints: [specs.md](specs.md)
- UI requirements: [ui.md](ui.md)
- Test guidance: [tests.md](tests.md)
- Roadmap and acceptance criteria: [roadmap.md](roadmap.md)

## Security and Contributions

- Security reporting policy: [SECURITY.md](SECURITY.md)
- Contribution guide: [CONTRIBUTING.md](CONTRIBUTING.md)

## Acknowledgements

This work was made possible thanks to two repos:

- [MD380 Tools by travisgospeed](https://github.com/travisgoodspeed/md380tools)
- [GO Codeplug by DaleFransworth](https://github.com/DaleFarnsworth/codeplug)

## License

This project is released under the GNU GPL v3 license. See [LICENSE](LICENSE).
