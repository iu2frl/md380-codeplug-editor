# Phase 1 Codeplug Helper Guide

This guide covers the local helper workflow for Phase 1 codeplug read/write.

## What This Helper Does

The helper is intentionally separate from the web app hosting flow.

- Read codeplug from radio into a local file.
- Write an edited codeplug file back to radio.
- Create backup-before-write by default.
- Produce JSON manifests with checksums for artifacts.

## Prerequisites

### Common

- Python 3.10+
- USB cable and radio in the expected DFU mode for your workflow
- Access to the bundled md380tools scripts in examples/md380tools

### Linux

- libusb package installed (package name varies by distro)
- udev rules for non-root USB access (see examples/md380tools/99-md380.rules)
- Optional: add your user to the appropriate plugdev/dialout group if needed

Example package install (Debian/Ubuntu):

```bash
sudo apt update
sudo apt install -y python3 python3-pip libusb-1.0-0
```

Apply udev rule (example):

```bash
sudo cp tools/99-md380.rules /etc/udev/rules.d/
sudo udevadm control --reload-rules
sudo udevadm trigger
```

### macOS

- Python 3 (Homebrew or system Python)
- libusb (Homebrew)

Example:

```bash
brew install python libusb
```

### Windows

- Python 3 installed and available in PATH
- USB driver compatible with libusb/WinUSB for the radio DFU interface

Notes:

- Zadig is commonly used to install WinUSB for USB DFU devices.
- Replug the device after driver change.

## Commands

From repository root:

```bash
python tools/radio_codeplug_helper.py radio-read --out artifacts/codeplug/read/radio_dump.rdt
python tools/radio_codeplug_helper.py radio-write --in artifacts/codeplug/edited/edited.rdt --yes
```

Compatibility aliases are also supported:

```bash
python tools/radio_codeplug_helper.py read-radio --out artifacts/codeplug/read/radio_dump.rdt
python tools/radio_codeplug_helper.py write-radio --in artifacts/codeplug/edited/edited.rdt --yes
```

## Recommended Manual Workflow

1. Read from radio:

```bash
python tools/radio_codeplug_helper.py radio-read --out artifacts/codeplug/read/radio_dump.rdt
```

2. Open that file in the web editor and make changes.

3. Export from the web editor to artifacts/codeplug/edited.

4. Write to radio (backup is done automatically unless explicitly skipped):

```bash
python tools/radio_codeplug_helper.py radio-write --in artifacts/codeplug/edited/radio_dump-edited.rdt --yes
```

## D/S Validation Log Template

Record real-device helper validation here for Phase 1 exit criteria.

- Date:
- Operator:
- OS:
- Radio model:
- Variant (D/S):
- Firmware:
- Read command used:
- Read success (Y/N):
- Edit + export performed (Y/N):
- Write command used:
- Backup created before write (Y/N):
- Write success (Y/N):
- Post-write sanity check notes:
- Issues encountered:

## Troubleshooting

- Permission denied on Linux:
  - Recheck udev rules and reconnect device.
- Device not found:
  - Verify DFU mode and cable quality.
- Write refused:
  - The helper requires explicit --yes confirmation.
