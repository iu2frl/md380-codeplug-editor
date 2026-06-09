# MD380 Codeplug Editor UI Requirements

## Purpose
Define product and interface requirements for the Phase 1 web UI so implementation and testing are aligned.

## Scope
- In scope: browser UI for codeplug import, editing, validation feedback, and export.
- In scope: desktop and mobile web layouts for the same workflow.
- In scope: Phase 3 preparation UI (capability detection and compatibility messaging only).
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
- On unsupported or invalid input, UI shows specific reason and recommended next step.
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

### User workflow

1. Homepage has two tiles:
   - Create new codeplug (not available in phase 1)
   - Open existing codeplug
     - This should instruct the user on how to get and use the Python script
     - The output of the Python script shall be uploaded to the page to enable the web app
2. After a file is loaded/created the user is prompt with a set of tabs:
   - Basic: basic information on the transceiver
     - Model
     - Maker
     - Firmware version
     - CPS version
     - MCU version
     - Unique device ID
     - Frequency range
   - General: general transceiver settings
     - Radio name
     - DMR ID
     - VOX sensitivity
     - TX preamble duration
     - RX low battery alarm interval
     - backlight timeout
     - keypad auto lock
     - boot up message (two lines)
     - alert tones
     - time zone
   - Menus: which menu options are enabled
   - Buttons: physical keys mapping
   - Digital text message: preconfigured SMSs
   - Digital voice encryption with basic and anhanced encryption keys
   - Digital contacts: list of private calls and talkgoups
   - Zones: list of zones configured in the transceiver. Maximum 16 channels per zone using checkboxes
   - Scan lists
   - Channels: main core of the app
     - List of current channels with all their features
     - Can move up and down single channels or multiple channels
     - Can duplicate channels
     - Can delete channels

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
- Phase 1 M3 requirements are represented in UI behavior and tests.
- Validation/error patterns are documented and tested.
- Mobile and desktop layouts are manually verified.
- User-facing docs reference this file as the UI contract baseline.

## Traceability to Roadmap
- Phase 1 M2: file open/parse/export and import error handling.
- Phase 1 M3: channels/zones/contacts/settings editors and validation.
- Phase 1 M4 (partial prep): stronger validation UX, dirty-state/undo readiness.