# MD380 Codeplug Editor Roadmap

## Scope
Build a static web application (GitHub Pages) across three capability areas:
- Online editor for codeplug files.
- Callsign database sync/build workflow (web download + local helper flash).
- Browser-based upload/download to physical radios.

The first iteration includes a local Python helper that the user runs manually to read/write the radio.

## Principles
- Keep the website static and client-side only.
- Separate file editing from hardware transport.
- Separate codeplug transport from callsign DB transport in helper tooling.
- Ship value early with a manual helper before full browser USB support.
- Preserve compatibility with D (no GPS) and S (GPS) radio variants.

## Codeplug Editor + Manual Python Helper

### Goal
Users can load a codeplug file, edit channels/zones/contacts/settings in-browser, and export the modified file. For physical radio I/O, users run a local Python helper manually.

### Capabilities and Acceptance Criteria

#### Project foundation
- Choose frontend stack (recommended: TypeScript + Vite).
- Define data model adapter strategy:
  - Option A: Compile Go parser/editor to WASM.
  - Option B: Port parser/editor core to TypeScript.
- Set up CI for static build and GitHub Pages deploy.

Exit criteria:
- App builds and deploys to a public GitHub Pages URL.
- Basic shell UI loads on desktop and mobile browsers.

#### File import/export pipeline
- Implement local file open (`.rdt`, `.bin`) in browser.
- Parse into internal model and validate supported radio type/range.
- Implement save/export back to file preserving binary correctness.
- Add error handling for invalid or unsupported files.

Exit criteria:
- Round-trip test: import -> edit nothing -> export, with byte-level consistency expectations where applicable.
- User can download edited file without server calls.

#### Editor modules (core requirements)
- Channels editor:
  - list/search/filter, create/edit/delete, bulk update basics.
- Zones editor:
  - create/edit/delete zones, manage channel membership/order.
- Contacts editor:
  - create/edit/delete contacts, duplicate detection.
- Transceiver settings editor:
  - radio ID, radio name/callsign-equivalent settings, and key general settings.

Exit criteria:
- User can complete a full basic programming workflow entirely in browser.
- Data validation prevents invalid values and broken references.

#### Data integrity and UX hardening
- Add cross-record validation:
  - zone references to channels,
  - contact references in channels/group lists,
  - required fields and bounds checks.
- Add undo/redo and dirty-state indicator.
- Add import/export smoke tests and fixtures for D and S variants.

Exit criteria:
- Validation errors are actionable and mapped to specific records/fields.
- No data-loss in common edit scenarios.

#### Python helper (manual local bridge)
- Create helper CLI users run locally to access the radio via USB/DFU.
- Provide two commands:
  - `read-radio` -> dumps codeplug to file.
  - `write-radio <file>` -> writes codeplug file to radio.
- Keep helper independent from web app hosting (manual workflow).
- Add clear docs for Linux/macOS/Windows prerequisites (Python, PyUSB/libusb, permissions/udev on Linux).

Suggested user flow:
1. Run helper to read radio into a local file.
2. Open that file in the web editor and modify.
3. Export modified file from browser.
4. Run helper to write modified file back to radio.

Exit criteria:
- End-to-end manual workflow documented and tested on at least one D model and one S model.
- Helper provides clear progress and error messages.

### Deliverables
- Static web app hosted on GitHub Pages.
- Editors for Channels, Zones, Contacts, and key transceiver settings.
- Local manual Python helper with read/write commands.
- User documentation and troubleshooting guide.

### Risks
- Binary layout edge cases across firmware/radio variants.
- Validation complexity for inter-record references.
- Platform-specific USB permission issues in helper usage.


## Callsign Database Sync (Web + Local Helper)

### Goal
Allow users to fetch the latest callsign database from web sources, optionally optimize/pack it, and flash it to radio SPI flash through a local helper workflow.

### What We Learned From md380tools
- Callsign source download is handled from web CSV (radioid): [examples/md380tools/db/Makefile](examples/md380tools/db/Makefile#L30).
- Database preparation pipeline creates cleaned stripped CSV: [examples/md380tools/db/Makefile](examples/md380tools/db/Makefile#L20).
- Linear format is built as size-prefixed CSV (`user.bin`): [examples/md380tools/Makefile](examples/md380tools/Makefile#L94).
- Indexed format packs data to reduce size (about half) via structural dedupe/indexing, not gzip-style compression: [examples/md380tools/lineardb_to_indexeddb.py](examples/md380tools/lineardb_to_indexeddb.py#L6).
- Flash target is SPI flash at `0x100000` through `md380-tool spiflashwrite`: [examples/md380tools/Makefile](examples/md380tools/Makefile#L101).
- This is separate from codeplug read/write handled by `md380-dfu` codeplug commands: [examples/md380tools/md380_dfu.py](examples/md380tools/md380_dfu.py#L64).

### Capabilities and Acceptance Criteria

#### Callsign source integration and normalization
- Add UI flow to fetch/import callsign CSV data from supported sources.
- Normalize encoding, remove/convert unsupported characters, and validate required columns.
- Provide filters (global/EU privacy-safe profile).

Exit criteria:
- User can generate a normalized local callsign dataset from web sources.
- Pipeline outputs deterministic CSV for the same input.

#### Database packing formats
- Implement linear format output (size + CSV payload) compatible with existing helper expectations.
- Implement indexed format output compatible with current indexed database structure.
- Add format selector: `linear` vs `indexed` with size estimate.

Exit criteria:
- Generated files can be consumed by helper flash commands.
- Indexed output demonstrates meaningful size reduction.

#### Local helper flash workflow (manual)
- Extend helper with commands:
  - `callsign-build --source <csv/url> --format linear|indexed --out <file>`
  - `callsign-flash --file <file> --address 0x100000`
- Include flash chip size checks and clear unsupported-device errors.
- Add backup/restore commands for SPI region before flashing.

Exit criteria:
- User can update callsign DB end-to-end with explicit safety checks.
- Workflow tested on a known supported radio with 16MB SPI flash.

#### Helper split and file management boundaries
- Define a dedicated callsign helper module/script (example name: `radio_callsign_helper.py`) separate from codeplug helper commands.
- Use dedicated artifact folders:
  - `artifacts/callsign/raw/` for source CSV snapshots,
  - `artifacts/callsign/build/` for `user.bin` and `indexeduser.bin`,
  - `artifacts/callsign/backup/` for SPI backup dumps.
- Keep transceiver codeplug read/write files out of callsign folders.
- Add file manifest metadata (`.json`) per build with:
  - source URL/time,
  - format (`linear|indexed`),
  - checksum,
  - target flash address.

Exit criteria:
- Callsign artifacts are reproducible and traceable from source to flashed binary.
- No mixing between codeplug binaries and callsign SPI binaries.

#### UX, safety, and diagnostics
- Provide progress + post-flash verification checksum/readback.
- Add troubleshooting page for permissions, drivers, and unsupported flash chips.
- Add clear distinction in UI/docs between "codeplug" and "callsign database".

Exit criteria:
- Common failure modes (permissions, wrong flash type, interrupted write) are documented and recoverable.

### Deliverables
- Callsign DB fetch/build/export features in web app.
- Local helper commands for callsign DB flashing and backup/restore.
- Documentation that separates codeplug vs SPI callsign DB workflows.

### Risks
- Source schema changes from upstream callsign providers.
- Flash-size/firmware compatibility differences across radios.
- Data privacy/regional constraints for user records.


## Native Browser Upload/Download (No Helper)

### Goal
Users can read/write codeplugs directly from browser to radio using WebUSB (or equivalent), while staying on a static GitHub Pages deployment.

### Capabilities and Acceptance Criteria

#### Browser transport feasibility and protocol mapping
- Map current DFU operations to WebUSB transfers.
- Verify browser/device compatibility matrix (Chromium family, USB permissions, OS differences).
- Define fallback behavior when WebUSB is unavailable.

Exit criteria:
- Technical design doc for WebUSB DFU transport.
- Prototype can enumerate and connect to target device in supported browser.

#### Browser DFU transport layer
- Build WebUSB adapter for DFU requests and state machine.
- Implement read-codeplug and write-codeplug operations.
- Add progress reporting and cancellation.

Exit criteria:
- Browser can read/write codeplug bytes reliably on supported environments.
- Transfer integrity checks pass on repeated runs.

#### Transport integration in web UI
- Add Connect/Read/Write actions to app.
- Add device status, permissions guidance, and recoverable error handling.
- Protect against unsafe writes (confirmation, model checks, file/model compatibility checks).

Exit criteria:
- User can complete radio read/edit/write fully in browser.
- UX clearly communicates unsupported browsers/devices.

#### Transitional local helper for transceiver upload/download
- Keep a separate transceiver helper script (example name: `radio_codeplug_helper.py`) while browser transport is stabilizing.
- Define command surface for codeplug only:
  - `radio-read --out <codeplug.bin|rdt>`
  - `radio-write --in <codeplug.bin|rdt>`
- Use dedicated artifact folders:
  - `artifacts/codeplug/read/` for radio dumps,
  - `artifacts/codeplug/edited/` for browser-exported files ready to flash,
  - `artifacts/codeplug/backup/` for pre-write backups.
- Add compatibility checks before write:
  - model/profile match,
  - expected file size/range,
  - checksum log.

Exit criteria:
- Codeplug transfer helper is isolated from callsign DB flashing logic.
- Users can safely run a backup-read-edit-write workflow with clear artifacts.

#### Reliability, recovery, and safety
- Add preflight checks before write.
- Add retry/reconnect flows for transient USB failures.
- Add optional backup prompt before writing.
- Add telemetry/log export (local only) for debugging support cases.

Exit criteria:
- Common failure modes are recoverable without app restart.
- Support diagnostics are sufficient to troubleshoot field issues.

### Deliverables
- Browser-native radio read/write support (no external helper needed).
- Compatibility matrix and support policy.
- Safety guardrails and recovery UX.

### Risks
- Browser API limitations and changing WebUSB behavior.
- DFU implementation quirks for specific firmware/radio revisions.
- User environment variability (USB drivers, permissions, enterprise browser policies).


## Cross-Phase Work Items
- Test fixtures library:
  - sample codeplugs for D and S variants,
  - expected parsed/edited outputs,
  - regression set for known edge cases.
- Documentation:
  - quick start,
  - supported models,
  - known limitations,
  - recovery guidance.
- Release process:
  - semantic versioning,
  - changelog,
  - migration notes for data model updates.
- Helper architecture:
  - shared low-level USB/DFU utilities package,
  - separate CLI entrypoints for `callsign` and `codeplug`,
  - common logging and checksum/report output format.

## Delivery Priorities
- Deliver core browser editing first.
- Add strong validation and integrity hardening.
- Keep helper-based transfer stable as fallback.
- Expand callsign sync/build/flash capabilities with safeguards.
- Promote browser-native transport after compatibility and safety targets are met.
