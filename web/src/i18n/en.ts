// English is the single source of truth for all UI message keys.
//
// `MessageKey` is derived from this object, so every other locale dictionary
// (it.ts, fr.ts) is type-checked to provide exactly the same set of keys.
// When adding a new UI string:
//   1. Add the key here (English text).
//   2. Add the same key to it.ts and fr.ts (translated, or English placeholder
//      until the translation pass).
//
// Only translate UI chrome. Never add keys for codeplug data (channel/zone/
// contact names, frequencies) or device-stored radio text — those stay
// byte-faithful and untranslated.
//
// Key naming convention (enforced by review + completeness.test.ts):
//   - Lower camelCase segments joined by dots: "<area>.<thing>[.<detail>]".
//   - First segment is the area/namespace:
//       app.*        — global app shell (title, etc.)
//       common.*     — generic reusable words (cancel, apply, close…)
//       language.*   — language picker
//       tab.*        — tab button labels
//       channels.*   — channels editor
//       zones.*      — zones editor
//       scanLists.*  — scan lists editor
//       groupLists.* — group lists editor
//       contacts.*   — digital contacts editor
//       general.*    — general settings
//       radio.*      — radio transfer
//       callsign.*   — callsign workflow
//       dialog.*     — toasts / confirms / pickers
//       validation.* — validation messages (keyed by issue code)
//   - Interpolation uses {name}-style tokens; the SAME tokens must appear in
//     every locale's translation of that key.
export const en = {
  "app.title": "IU2FRL MD380 Codeplug Editor",

  "language.label": "Language",
  "language.current": "Current language: {name}",
  // Language names are shown in their own language regardless of active locale.
  "language.name.en": "English",
  "language.name.it": "Italiano",
  "language.name.fr": "Français",

  "common.cancel": "Cancel",
  "common.apply": "Apply",
  "common.close": "Close",
  "common.undo": "Undo",
  "common.redo": "Redo",
  "common.backHome": "Back To Homepage",

  // --- Editor shell (header + top actions) ---
  "shell.loaded": "Loaded: {file} ({format})",
  "shell.status.dirty": "Unsaved changes",
  "shell.status.clean": "Saved",
  "shell.undoRedo": "Undo: {undo} | Redo: {redo}",
  "shell.openAnother": "Open Another File",
  "shell.export": "Export Current File",
  "shell.tablistLabel": "Codeplug sections",
  "validation.heading": "Validation",
  "validation.none": "No validation issues.",

  // --- Tab labels ---
  "tab.basic": "Basic",
  "tab.general": "General",
  "tab.menus": "Menus",
  "tab.buttons": "Buttons",
  "tab.digitalText": "Digital Text Message",
  "tab.encryption": "Encryption",
  "tab.digitalContacts": "Digital Contacts",
  "tab.dtmf": "DTMF",
  "tab.oneTouch": "One Touch",
  "tab.zones": "Zones",
  "tab.groupLists": "Group Lists",
  "tab.scanLists": "Scan Lists",
  "tab.channels": "Channels",
  "tab.radioTransfer": "Radio Transfer",

  // --- Landing: hero + risk ---
  "landing.intro": "A simple web application to interact with your MD380 codeplug, where everything is done in the browser.",
  "landing.risk.heading": "Warning",
  "landing.risk.body": "This app is still under development.<br>Not all features were tested and using it may create an unusable codeplug that can freeze your transceiver.<br>It is very hard to brick these devices thanks to their robust design and bootloader, but no operation can be considered 100% safe.<br>By proceeding, you accept all risk and agree that the project maintainer is not responsible for any device damage or malfunctioning.<br>If your transceiver freezes during or after a read/write operation, simply unplug it from the PC and restart it using the volume knob.<br>",
  "landing.risk.noteIntro": "Please note:",
  "landing.risk.note.opengd77": "This app does not (yet) support OpenGD77 firmware.",
  "landing.risk.note.firmwares": "This app only supports original or patched (via <a href=\"https://github.com/travisgoodspeed/md380tools\" target=\"_blank\" rel=\"nofollow\">md380tools</a>) firmwares for MD380 and MD390.",
  "landing.risk.note.browser": "This app requires Chrome, Edge, or any Chromium-based browser with WebUSB support. Firefox and Safari are not supported due to lack of WebUSB API.",
  "landing.risk.ack": "I understand and accept all risk, including possible device damage or bricking.",
  "landing.radioProgress.heading": "Radio Transfer Progress",

  // --- Landing: tiles ---
  "landing.tile.setup.heading": "Setup Guide",
  "landing.tile.setup.desc": "Instructions for setting up your browser and operating system to communicate with your radio via USB.",
  "landing.tile.setup.button": "Show Setup Guide",
  "landing.tile.create.heading": "Create New Codeplug",
  "landing.tile.create.desc": "Start from a blank profile and build your codeplug from scratch.",
  "landing.tile.create.alpha": "This feature is in the alpha testing stage and might need further refinements to ensure the generated codeplugs are fully compatible with all radio models and firmware versions.",
  "landing.tile.create.md380": "Create new MD380 codeplug",
  "landing.tile.create.md390": "Create new MD390 codeplug",
  "landing.tile.open.heading": "Open Existing Codeplug",
  "landing.tile.open.desc1": "Import an existing <code>.rdt</code> or <code>.bin</code> file to edit it safely in-browser.",
  "landing.tile.open.desc2": "Preferred format is <code>.rdt</code>, which can be exported by some applications like <strong>G6AMU Codeplug Editor</strong>.<br><strong>Please note:</strong> the <code>.bin</code> format does not contain all device information (no custom headers), so some features may not be fully supported.",
  "landing.tile.open.button": "Open .rdt/.bin",
  "landing.tile.read.heading": "Read Codeplug From Radio",
  "landing.tile.read.desc": "Connect your radio and load the current codeplug directly into this browser session.",
  "landing.tile.read.button": "Read Codeplug From Radio",
  "landing.tile.callsign.heading": "Update Callsign Database",
  "landing.tile.callsign.desc": "Download the latest callsign database and write it to the transceiver.",
  "landing.tile.callsign.button": "Update Callsigns Database",
  "landing.tile.timeSync.heading": "Radio Date and Time Sync",
  "landing.tile.timeSync.desc": "Sync date, time, and timezone from this machine to the transceiver clock.",
  "landing.tile.timeSync.button": "Sync Date and Time",
  "landing.tile.screenshot.heading": "Radio Screenshot",
  "landing.tile.screenshot.desc": "Capture the current LCD display (160x128 px) from the radio and save it as a PNG. Requires patched firmware, see <a href=\"https://github.com/travisgoodspeed/md380tools\" target=\"_blank\" rel=\"noopener noreferrer\">MD380 Tools</a>.",
  "landing.tile.screenshot.button": "Capture Screenshot",
  "landing.tile.firmware.heading": "Firmware Backup",
  "landing.tile.firmware.desc": "Create a backup of your radio's firmware (848 KB). Requires entering STM32 bootloader mode manually by turning on the transceiver while pressing PTT and the button above it.",
  "landing.tile.firmware.button": "Backup Firmware",

  // --- Landing: credits ---
  "landing.credits.heading": "Credits",
  "landing.credits.body1": "Developed by <a href=\"https://github.com/iu2frl\" target=\"_blank\" rel=\"noopener noreferrer\">IU2FRL</a> on GitHub Pages and released under the <a href=\"https://www.gnu.org/licenses/gpl-3.0.html\" target=\"_blank\" rel=\"noopener noreferrer\">GNU General Public License v3</a>.",
  "landing.credits.lastUpdate": "Last update: {date}",
  "landing.credits.body2": "This project is open source on <a href=\"https://github.com/iu2frl/md380-codeplug-editor\" target=\"_blank\" rel=\"noopener noreferrer\">GitHub</a>.<br>Please report any issues on <a href=\"https://github.com/iu2frl/md380-codeplug-editor/issues\" target=\"_blank\" rel=\"noopener noreferrer\">md380-codeplug-editor/issues</a> and consider contributing if you can!",
  "landing.credits.body3": "Special thanks to <a href=\"https://github.com/travisgoodspeed/md380tools\" target=\"_blank\" rel=\"noopener noreferrer\">MD380-Tools</a> and <a href=\"https://github.com/DaleFarnsworth/codeplug\" target=\"_blank\" rel=\"noopener noreferrer\">GO Codeplug</a> as sources of inspiration.",
} as const;

export type MessageKey = keyof typeof en;

