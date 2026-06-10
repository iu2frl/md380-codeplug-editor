# Copilot Instructions

## Product Intent

Build a static GitHub Pages web application for MD380/MD390/RT3/RT8 codeplug editing.

When there is a conflict, follow roadmap.md sequencing and architecture.

## Requirements

- Roadmap with milestones and achievements: [roadmap.md](../roadmap.md)
- Full specifications: [specs.md](../specs.md)
- UI requirements: [ui.md](../ui.md)
- Parser tests: [tests.md](../tests.md)

## Core Constraints

- Website must remain static and client-side first.
- Avoid introducing mandatory backend services.
- Keep UX simple and understandable for non-expert radio users.
- Keep files small and readable, split into modules as needed.
- Preserve compatibility with D (no GPS) and S (GPS) variants.

## Architecture Rules

### 1) Keep these domains separate

- Codeplug domain:
  - Import/edit/export .rdt/.bin codeplug files.
  - Radio read/write of codeplug content.
- Callsign database domain:
  - Download/import source CSV.
  - Build linear/indexed callsign binaries.
  - Flash callsign DB into SPI flash at the dedicated address.

Never mix codeplug and callsign build artifacts, commands, or storage paths.

### 2) Helper split (required)

Use separate Python entrypoints:
- radio_codeplug_helper.py for codeplug transfer tasks.
- radio_callsign_helper.py for callsign DB build/flash tasks.

Shared USB/DFU low-level logic can live in a common module.

### 3) Artifact folders (required)

Use reproducible artifact paths:
- artifacts/codeplug/read
- artifacts/codeplug/edited
- artifacts/codeplug/backup
- artifacts/callsign/raw
- artifacts/callsign/build
- artifacts/callsign/backup

Each generated artifact should include or be paired with a JSON manifest containing:
- creation timestamp
- source info (file or URL)
- format
- checksum
- target address (if flashable)
- tool version

## Safety Rules

- Default to backup-before-write for any radio flash/write operation.
- Validate model/profile compatibility before writing codeplug data.
- Validate flash-size expectations before writing callsign DB data.
- Show explicit confirmation prompts before destructive actions.
- Provide clear rollback/recovery instructions on failure.

## Implementation Preferences

- TypeScript-first for frontend code.
- Strong typing for data models and validation errors.
- Small, composable modules over monolithic files.
- Add tests for parsers, validators, and round-trip invariants.
- Prefer deterministic, fixture-based tests for binary transformations.

## Definition of Done Checklist

Before marking any feature complete, ensure:
- It matches current phase scope.
- It preserves domain separation (codeplug vs callsign DB).
- It includes safety checks and user-facing error messages.
- It includes tests and sample fixtures.
- It updates user docs when workflows or commands change.

## Non-Goals (unless explicitly requested)

- No mandatory cloud backend.
- No silent auto-flashing without user confirmation.
- No mixing of callsign DB binaries into codeplug export flows.
- No broad firmware patching scope in this project.

## UI requirements

- Never use `alert()` for user notifications. Use a custom modal.
- If an operation does not require user attention, do not show a notification at all. Maybe just a progress bar or a label for short operations.
- If a workflow requires a series of steps, the user should be guided trough by only enabling the next step when the previous one is completed. For example, the "Flash callsign DB" button should only be enabled after a callsign DB binary has been built and validated.

## Tests

- All frontend and backend capabilities must be covered by tests.
- Tests should be deterministic and reproducible.
- Tests for the parser are described in [tests.md](../tests.md).
