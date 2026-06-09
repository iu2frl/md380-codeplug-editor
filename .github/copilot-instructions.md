# Copilot Instructions

## Product Intent
Build a static GitHub Pages web application for MD380/MD390/RT3/RT8 codeplug editing.

Primary source documents:
- ../specs.md
- ../roadmap.md

When there is a conflict, follow roadmap.md sequencing and architecture.

## Phase Priority
Implement work in this order:
1. Phase 1: Online codeplug editor + manual local Python helper for radio read/write.
2. Phase 2: Callsign database sync/build/flash workflow (separate from codeplug).
3. Phase 3: Native browser radio upload/download (WebUSB or equivalent).

Do not skip phase boundaries unless explicitly requested.

## Core Constraints
- Website must remain static and client-side first.
- Avoid introducing mandatory backend services.
- Keep UX simple and understandable for non-expert radio users.
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

## Phase-Specific Guidance

### Phase 1 Guidance
- Focus on reliable codeplug import/edit/export first.
- Required editors: Channels, Zones, Contacts, key transceiver settings (Radio ID, Radio Name/callsign-equivalent fields).
- Add strong cross-reference validation (zone-channel, channel-contact, list references).
- Manual helper commands should be simple and stable:
  - radio-read --out <file>
  - radio-write --in <file>

### Phase 2 Guidance
- Treat callsign DB as separate SPI flash data, not part of codeplug bytes.
- Support both linear and indexed output formats.
- Preserve deterministic outputs from the same source input.
- Include privacy-aware filtering options where applicable.

### Phase 3 Guidance
- Implement browser-native radio transfer only after Phase 2 is stable.
- Build transport with clear compatibility messaging (supported browsers/OS).
- Keep transitional local helper available until browser path is proven reliable.

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
