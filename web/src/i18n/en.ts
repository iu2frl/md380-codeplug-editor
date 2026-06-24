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

  // --- Editor: shared ---
  "common.delete": "Delete",
  "common.remove": "Remove",
  "common.none": "None",
  "common.yes": "Yes",
  "common.no": "No",
  "editor.value.unknown": "Unknown",
  "editor.value.notStored": "Not stored in codeplug",
  "editor.common.selectedChannelOrder": "Selected Channel Order",
  "editor.common.editChannels": "Edit Channels",
  "editor.common.noChannelsSelected": "No channels selected.",
  "editor.common.moveChannelUp": "Move channel up",
  "editor.common.moveChannelDown": "Move channel down",
  "editor.common.editChannelsHelp": "Use \"Edit Channels\" to add or remove, then reorder below.",

  // --- Editor: Basic ---
  "editor.basic.model": "Model",
  "editor.basic.maker": "Maker",
  "editor.basic.firmwareVersion": "Firmware Version",
  "editor.basic.cpsVersion": "CPS Version",
  "editor.basic.mcuVersion": "MCU Version",
  "editor.basic.uniqueDeviceId": "Unique Device ID",
  "editor.basic.frequencyRange": "Frequency Range",
  "editor.basic.lastProgrammed": "Last Programmed",
  "editor.basic.variant": "Variant",

  // --- Editor: General ---
  "editor.general.identity": "Identity",
  "editor.general.behavior": "Behavior",
  "editor.general.radioName": "Radio Name",
  "editor.general.radioNameHelp": "Max 16 characters.",
  "editor.general.dmrId": "DMR ID",
  "editor.general.dmrIdHelp": "Valid range: 1 to 16,777,215.",
  "editor.general.bootLine1": "Boot Up Message Line 1",
  "editor.general.bootLine2": "Boot Up Message Line 2",
  "editor.general.bootLineHelp": "Up to 10 characters.",
  "editor.general.voxSensitivity": "VOX Sensitivity",
  "editor.general.txPreamble": "TX Preamble Duration (ms)",
  "editor.general.rxLowBattery": "RX Low Battery Alarm Interval (s)",
  "editor.general.backlightTimeout": "Backlight Timeout",
  "editor.general.keypadAutoLock": "Keypad Auto Lock",
  "editor.general.alertTones": "Alert Tones",
  "editor.general.timeZone": "Time Zone",

  // --- Editor: Digital Contacts ---
  "editor.contacts.add": "Add Contact",

  // --- Editor: DTMF ---
  "editor.dtmf.desc": "Manage DTMF Number Keys (0-9).",
  "editor.dtmf.numberKeys": "Number Keys",
  "editor.dtmf.key": "Key {digit}",

  // --- Editor: One Touch ---
  "editor.oneTouch.desc": "Configure side-button One Touch call and message actions.",
  "editor.oneTouch.slot": "One Touch {slot}",
  "editor.oneTouch.noAction": "No action configured.",

  // --- Editor: Menus ---
  "editor.menus.hangTime": "Hang Time",
  "editor.menus.radioDisable": "Radio Disable",
  "editor.menus.radioEnable": "Radio Enable",
  "editor.menus.remoteMonitor": "Remote Monitor",
  "editor.menus.radioCheck": "Radio Check",
  "editor.menus.manualDial": "Manual Dial",
  "editor.menus.edit": "Edit",
  "editor.menus.callAlert": "Call Alert",
  "editor.menus.textMessage": "Text Message",
  "editor.menus.toneOrAlert": "Tone Or Alert",
  "editor.menus.talkaround": "Talkaround",
  "editor.menus.outgoingRadio": "Outgoing Radio",
  "editor.menus.answered": "Answered",
  "editor.menus.missed": "Missed",
  "editor.menus.editList": "Edit List",
  "editor.menus.scan": "Scan",
  "editor.menus.programKey": "Program Key",
  "editor.menus.vox": "VOX",
  "editor.menus.squelch": "Squelch",
  "editor.menus.ledIndicator": "LED Indicator",
  "editor.menus.keyboardLock": "Keyboard Lock",
  "editor.menus.introScreen": "Intro Screen",
  "editor.menus.backlight": "Backlight",
  "editor.menus.power": "Power",
  "editor.menus.gps": "GPS",
  "editor.menus.programRadio": "Program Radio",
  "editor.menus.displayMode": "Display Mode",
  "editor.menus.passwordAndLock": "Password And Lock",

  // --- Editor: Buttons ---
  "editor.buttons.longPress": "Long Press Duration (ms)",

  // --- Editor: Digital Text Message ---
  "editor.text.add": "Add Message",

  // --- Editor: Encryption ---
  "editor.encryption.desc": "Privacy keys from the codeplug library layout.",
  "editor.encryption.enhancedHeading": "Enhanced Keys (32 hex chars each)",
  "editor.encryption.basicHeading": "Basic Keys (4 hex chars each)",
  "editor.encryption.enhanced": "Enhanced {index}",
  "editor.encryption.basic": "Basic {index}",

  // --- Editor: Radio Transfer ---
  "editor.radio.desc": "Browser-native radio read/write using WebUSB.",
  "editor.radio.envCompat": "Environment Compatibility",
  "editor.radio.secureContext": "Secure Context",
  "editor.radio.webusbApi": "WebUSB API",
  "editor.radio.browser": "Browser",
  "editor.radio.available": "Available",
  "editor.radio.unavailable": "Unavailable",
  "editor.radio.compatible": "This browser environment appears compatible with the upcoming WebUSB flow.",
  "editor.radio.openSetupGuide": "Open Full Setup Guide",
  "editor.radio.workflow": "Browser Workflow",
  "editor.radio.step1": "Connect radio over USB and grant browser permission.",
  "editor.radio.step2": "Read codeplug directly into the editor.",
  "editor.radio.step3": "Edit and validate in-browser.",
  "editor.radio.step4": "Write codeplug back with explicit confirmation and backup options.",
  "editor.radio.status": "Status: {message}",
  "editor.radio.connect": "Connect Device",
  "editor.radio.disconnect": "Disconnect Device",
  "editor.radio.read": "Read From Radio",
  "editor.radio.write": "Write To Radio",

  // --- Editor: Zones ---
  "editor.zones.add": "Add Zone",
  "editor.zones.name": "Zone Name",
  "editor.zones.channelsSelected": "{count}/16 channels selected",
  "editor.zones.channelsMeta": "{count} channels",
  "editor.zones.delete": "Delete Zone",
  "editor.zones.selectToEdit": "Select a zone to edit",

  // --- Editor: Scan Lists ---
  "editor.scan.add": "Add Scan List",
  "editor.scan.empty": "No scan lists found in this codeplug.",
  "editor.scan.name": "Scan List Name",
  "editor.scan.channelsMeta": "{count} channels",
  "editor.scan.behavior": "Scan Behavior",
  "editor.scan.signallingHold": "Signalling Hold Time (ms)",
  "editor.scan.prioritySample": "Priority Sample Time (ms)",
  "editor.scan.priorityCh1": "Priority Channel 1",
  "editor.scan.priorityCh2": "Priority Channel 2",
  "editor.scan.txDesignated": "Tx Designated Channel",
  "editor.scan.designatedChannel": "Designated Channel",
  "editor.scan.channelsSelected": "{count}/31 channels selected",
  "editor.scan.delete": "Delete Scan List",
  "editor.scan.selectToEdit": "Select a scan list to edit",

  // --- Editor: Group Lists ---
  "editor.groups.add": "Add Group List",
  "editor.groups.empty": "No group lists found in this codeplug.",
  "editor.groups.name": "Group List Name",
  "editor.groups.contactsSelected": "{count}/32 contacts selected",
  "editor.groups.contactsMeta": "{count} contacts",
  "editor.groups.editContactsHelp": "Use \"Edit Contacts\" to add or remove, then reorder below.",
  "editor.groups.selectedContactOrder": "Selected Contact Order",
  "editor.groups.editContacts": "Edit Contacts",
  "editor.groups.noContactsSelected": "No contacts selected.",
  "editor.groups.moveContactUp": "Move contact up",
  "editor.groups.moveContactDown": "Move contact down",
  "editor.groups.delete": "Delete Group List",
  "editor.groups.selectToEdit": "Select a group list to edit",

  // --- Editor: Channels ---
  "editor.channels.add": "Add Channel",
  "editor.channels.search": "Search",
  "editor.channels.allModes": "All Modes",
  "editor.channels.bulkSelectTitle": "Select for bulk updates",
  "editor.channels.sectionIdentity": "Identity &amp; RF",
  "editor.channels.sectionContacts": "Contacts &amp; Lists",
  "editor.channels.sectionPrivacy": "Privacy &amp; Timers",
  "editor.channels.sectionReference": "Reference &amp; Signalling",
  "editor.channels.sectionTones": "Tones (CTCSS/DCS)",
  "editor.channels.sectionAdvanced": "Advanced Options",
  "editor.channels.name": "Channel Name",
  "editor.channels.rxFrequency": "RX Frequency (MHz)",
  "editor.channels.txFrequency": "TX Frequency (MHz)",
  "editor.channels.txFrequencyHelp": "Calculated from RX Frequency + TX Offset.",
  "editor.channels.txOffset": "TX Offset (MHz)",
  "editor.channels.mode": "Mode",
  "editor.channels.colorCode": "Color Code",
  "editor.channels.timeSlot": "Time Slot",
  "editor.channels.bandwidth": "Bandwidth (kHz)",
  "editor.channels.power": "Power",
  "editor.channels.contact": "Contact",
  "editor.channels.noContact": "No Contact",
  "editor.channels.scanList": "Scan List",
  "editor.channels.rxGroupList": "RX Group List",
  "editor.channels.admitCriteria": "Admit Criteria",
  "editor.channels.inCallCriteria": "In-Call Criteria",
  "editor.channels.privacy": "Privacy",
  "editor.channels.privacyNumber": "Privacy Number",
  "editor.channels.tot": "TOT (s)",
  "editor.channels.totRekey": "TOT Rekey Delay (s)",
  "editor.channels.emergencySystem": "Emergency System",
  "editor.channels.rxRefFrequency": "RX Ref Frequency",
  "editor.channels.txRefFrequency": "TX Ref Frequency",
  "editor.channels.rxSignalling": "RX Signalling",
  "editor.channels.txSignalling": "TX Signalling",
  "editor.channels.ctcssDecode": "CTCSS/DCS Decode",
  "editor.channels.ctcssEncode": "CTCSS/DCS Encode",
  "editor.channels.ctcssPlaceholder": "None / 67.0 / D023N",
  "editor.channels.qtReverse": "QT Reverse",
  "editor.channels.dqtTurnoff": "Non-QT/DQT Turn-off Freq",
  "editor.channels.rxOnly": "RX Only",
  "editor.channels.autoscan": "Autoscan",
  "editor.channels.loneWorker": "Lone Worker",
  "editor.channels.vox": "VOX",
  "editor.channels.allowTalkaround": "Allow Talkaround",
  "editor.channels.talkaround": "Talkaround",
  "editor.channels.privateCallConfirmed": "Private Call Confirmed",
  "editor.channels.dataCallConfirmed": "Data Call Confirmed",
  "editor.channels.emergencyAlarmAck": "Emergency Alarm Ack",
  "editor.channels.compressedUdp": "Compressed UDP Header",
  "editor.channels.displayPttId": "Display PTT ID",
  "editor.channels.receiveGps": "Receive GPS Info",
  "editor.channels.sendGps": "Send GPS Info",
  "editor.channels.reverseBurst": "Reverse Burst",
  "editor.channels.dcdmSwitch": "DCDM Switch",
  "editor.channels.leaderMs": "Leader/MS",
  "editor.channels.allowInterrupt": "Allow Interrupt",
  "editor.channels.decode": "Decode {n}",
  "editor.channels.delete": "Delete Channel",
  "editor.channels.selectToEdit": "Select a channel to edit",
  "editor.channels.bulkHeading": "Bulk Channel Update",
  "editor.channels.bulkSummary": "Filtered: {filtered} | Selected: {selected}",
  "editor.channels.bulkFiltered": "Filtered ({count})",
  "editor.channels.bulkSelected": "Selected ({count})",
  "editor.channels.bulkSelectFiltered": "Select Filtered ({count})",
  "editor.channels.bulkClearSelected": "Clear Selected",
  "editor.channels.bulkModeUnchanged": "Mode (unchanged)",
  "editor.channels.bulkPowerUnchanged": "Power (unchanged)",
  "editor.channels.bulkBandwidthUnchanged": "Bandwidth (unchanged)",
  "editor.channels.bulkSlotUnchanged": "Time Slot (unchanged)",
  "editor.channels.bulkColorCodePlaceholder": "Color Code (unchanged)",
  "editor.channels.bulkRxPlaceholder": "RX MHz (unchanged)",
  "editor.channels.bulkShiftPlaceholder": "Shift MHz (unchanged)",
  "editor.channels.bulkApplyHelp": "TX Frequency is derived from RX Frequency + Shift.",
  "editor.channels.bulkSelectedCount": "{selected} of {total} filtered channels are selected.",

  "editor.tabUnavailable": "Tab is not available in this build.",
} as const;

export type MessageKey = keyof typeof en;

