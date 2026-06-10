# Copilot Instructions

## Product Intent

Static GitHub Pages web application for MD380/MD390/RT3/RT8 codeplug editing.
- Client-side only, no backend services required.
- Support D (no GPS) and S (GPS) radio variants.
- UX kept simple for non-expert radio users.

## Project Structure

```
web/                          # Vite TypeScript application (static build)
├── src/
│   ├── domain/              # Codeplug parser, serializer, validation, callsign DB
│   ├── state/               # Global store and state management
│   ├── transport/           # Browser WebUSB/DFU transport layer
│   └── ui/                  # Render, landing, editors (channels/zones/contacts/settings)
├── testdata/                # Known-good codeplug fixtures for testing
└── test-results/

tools/                        # Python helpers (manual/interactive workflows)
├── radio_codeplug_helper.py  # Read/write codeplug via USB (manual)
├── radio_callsign_helper.py  # Callsign DB build/flash
└── radio_common.py          # Shared USB/DFU logic

artifacts/                    # Generated artifacts with JSON manifests
├── codeplug/{read,edited,backup}
└── callsign/{raw,build,backup}
```

## Architecture

### Domain Separation

**Codeplug Domain** (`web/src/domain/parser.ts`, `validation.ts`):
- Parse/serialize .rdt/.bin files (262144-byte payload + RDT wrapper)
- Validate channels, zones, contacts, general settings
- Preserve binary fidelity and raw record bytes during edit

**Callsign Domain** (`web/src/domain/callsign.ts`, `tools/radio_callsign_helper.py`):
- Download/import CSV, build indexed callsign binary
- Flash to radio SPI flash at dedicated address
- Separate from codeplug artifacts and workflows

**Transport Layer** (`web/src/transport/`):
- Browser WebUSB/DFU for radio read/write
- Python helpers for manual USB workflows
- Keep low-level logic isolated from domain logic

### Artifact Paths & Manifests

All artifacts include JSON manifests with:
- `creation_timestamp`, `source`, `format`, `checksum`
- `target_address` (if flashable)
- `tool_version`

Paths:
- `artifacts/codeplug/{read,edited,backup}`
- `artifacts/callsign/{raw,build,backup}`

## Implementation Patterns

- **TypeScript**: Strong typing, small composable modules
- **Testing**: Parser/serializer round-trip tests, validation fixtures, deterministic binary transforms
- **UI**: Vite + custom DOM rendering, no frameworks
- **Events**: Use `"change"` (not `"input"`) for field bindings to avoid excessive re-renders
- **Modularization**: Separate modules for landing, codeplug editor, callsign workflow

## Safety Rules

- Backup before any radio write.
- Validate model/profile compatibility before writing codeplug.
- Validate flash-size before writing callsign DB.
- Explicit confirmation prompts for destructive actions.
- Clear rollback/recovery instructions on failure.

## UI Requirements

- Never use `alert()` — use custom modals (see `ui/dialog.ts`).
- Avoid notifications for operations needing no user attention (use progress bars/labels instead).
- Step-by-step workflows: enable next step only after previous completes.
  - Example: "Flash Callsign DB" button enabled only after binary built and validated.
- Guide modals for long procedural instructions (separate from main action tiles).

## Definition of Done

Before marking work complete:
- ✓ Preserves codeplug/callsign domain separation
- ✓ Includes validation and user-facing error messages
- ✓ Includes tests with known fixtures
- ✓ Round-trip fidelity (parse → serialize → byte-identical where applicable)
- ✓ Updates docs if workflows or UX changes

## Testing

- **Frontend**: `npm run test` (Vitest; see `web/src/**/*.test.ts`)
- **Fixtures**: Known-good codeplugs in `web/testdata/known/`
- **Strict mode**: `KNOWN_CODEPLUG_STRICT=1 npm run test:known`
- **Coverage**: All parser, serializer, validation, and UI workflows must have deterministic tests

Run all tests before committing.
