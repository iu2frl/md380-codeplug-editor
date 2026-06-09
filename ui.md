# MD380 Codeplug Editor UI Requirements

## Purpose
Define product and interface requirements for the web UI so implementation and testing are aligned.

## Scope
- In scope: browser UI for codeplug import, editing, validation feedback, and export.
- In scope: desktop and mobile web layouts for the same workflow.
- In scope: radio transfer capability detection and compatibility messaging.
- Out of scope: browser-native radio transfer execution and callsign DB workflows.

## Target Users
- Radio hobbyists and operators with low to moderate technical experience.
- Users who need a safe read-edit-write workflow without command-line expertise.

## Core UX Principles
- Keep flows explicit and reversible (backup-first, confirm before destructive actions).
- Use plain language with field-level guidance.
- Prevent invalid data early with actionable messages.
- Preserve separation of domains: codeplug editing vs callsign database operations.

## Navigation and Information Architecture
- Single-page app with clear panels/sections:
  - File actions
  - Global settings
  - Channels
  - Zones
  - Contacts
  - Validation results
- No hidden critical actions behind complex menus.

## Functional Requirements

### 1) File Workflow
- User can open `.rdt` and `.bin` files from local disk.
- UI displays import success/failure state immediately.
- On unsupported or invalid input, UI shows specific reason and recommended action.
- User can export edited data back to file without server calls.

Acceptance criteria:
- Import -> no edit -> export supports byte-identical output where applicable.
- Failure messages identify format/model/range errors distinctly.

### 2) Channels Editor
- List channels with key summary fields visible.
- Search by channel name.
- Filter by mode (`Analog`, `Digital`, or all).
- Create/edit/delete channels.
- Bulk update basics for filtered records (minimum: mode and power).
- Edit RF and mode-related fields with bounds checks.

Acceptance criteria:
- Search/filter updates result list immediately.
- Bulk update only changes selected/filtered records.
- Invalid RF values are blocked with clear field-level errors.

### 3) Zones Editor
- Create/edit/delete zones.
- Manage channel membership and order in each zone.
- Prevent references to non-existent channels.

Acceptance criteria:
- Zone order is preserved after save/export/import.
- Broken channel references are surfaced in validation.

### 4) Contacts Editor
- Create/edit/delete contacts.
- Detect duplicate contact entries based on configured uniqueness rules.
- Validate ID ranges and required fields.

Acceptance criteria:
- Duplicate detection appears before export.
- Invalid IDs cannot be saved silently.

### 5) Transceiver Settings Editor
- Edit radio ID.
- Edit radio name/callsign-equivalent field.
- Edit key general settings required for basic programming.

Acceptance criteria:
- Out-of-range values show immediate validation messages.
- Export writes updated settings correctly.

### 6) Validation and Error UX
- Validation view summarizes all errors and warnings.
- Each error maps to record type and field context.
- Messages prioritize fixes that block export or create broken references.

Acceptance criteria:
- User can identify what to fix, where to fix it, and why.
- Cross-record issues (zone-channel, channel-contact) are explicitly named.

## Non-Functional UI Requirements

### User Flow

- Homepage has two tiles:
  - Create new codeplug (currently unavailable)
  - Open existing codeplug
    - Instruct how to use the local Python helper
    - Upload helper output (`.rdt`/`.bin`) to enable editing
- After a file is loaded/created, the app shows tabs:
  - Basic: model, maker, firmware, CPS version, MCU version, unique device ID, frequency range
  - General: radio name, DMR ID, VOX sensitivity, TX preamble duration, RX low battery interval, backlight timeout, keypad auto lock, boot message, alert tones, time zone
  - Menus: enabled/disabled menu options
  - Buttons: physical key mappings
  - Digital text message: preconfigured messages
  - Encryption: basic and enhanced keys
  - Digital contacts: private calls and talkgroups
  - Zones: zone list and up to 16 channel assignments
  - Scan lists
  - Channels: list/edit/reorder/duplicate/delete operations

### Responsive Behavior
- Desktop: multi-panel layout with efficient scan/edit flow.
- Mobile: stacked layout with controls remaining usable without horizontal scrolling for core actions.

### Accessibility
- Keyboard-accessible controls for form actions.
- Sufficient color contrast for status/error states.
- Labels for all interactive inputs.

### Performance
- Typical editing interactions should feel immediate for up to 1000 channels and contacts.
- UI should avoid full-page reloads for normal actions.

## Safety and Confirmation Requirements
- Destructive actions (delete/bulk operations where relevant) require explicit user intent.
- Export is blocked or clearly warned when blocking validation errors exist.
- UI copy must reinforce backup-before-write expectations for radio operations.

## Definition of Done for UI Requirements Coverage
- Core editor requirements are represented in UI behavior and tests.
- Validation/error patterns are documented and tested.
- Mobile and desktop layouts are manually verified.
- User-facing docs reference this file as the UI contract baseline.

## Traceability to Roadmap
- File open/parse/export and import error handling.
- Channels/zones/contacts/settings editors and validation.
- Strong validation UX, dirty-state, and undo/redo readiness.