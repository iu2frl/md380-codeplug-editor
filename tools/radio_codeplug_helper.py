#!/usr/bin/env python3
from __future__ import annotations

import argparse
from datetime import datetime, timezone
from pathlib import Path

from radio_common import (
    ARTIFACTS_ROOT,
    ensure_artifact_dirs,
    run_md380_dfu,
    validate_codeplug_path,
    write_manifest,
)


def default_backup_file() -> Path:
    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    return ARTIFACTS_ROOT / "backup" / f"codeplug-backup-{stamp}.bin"


def command_radio_read(out_path: Path) -> None:
    ensure_artifact_dirs()
    out_path.parent.mkdir(parents=True, exist_ok=True)
    print(f"Reading codeplug from radio to {out_path}")
    run_md380_dfu("read", out_path)
    manifest = write_manifest(out_path, source="radio-read", fmt=out_path.suffix.lstrip("."))
    print(f"Read complete. Manifest: {manifest}")


def command_radio_write(in_path: Path, backup_out: Path | None, skip_backup: bool, yes: bool) -> None:
    ensure_artifact_dirs()
    validate_codeplug_path(in_path)

    if not yes:
        raise SystemExit("Refusing to write without explicit confirmation. Re-run with --yes")

    if not skip_backup:
      backup_path = backup_out if backup_out else default_backup_file()
      backup_path.parent.mkdir(parents=True, exist_ok=True)
      print(f"Creating backup before write: {backup_path}")
      run_md380_dfu("read", backup_path)
      write_manifest(backup_path, source="radio-backup-before-write", fmt="bin")

    print(f"Writing codeplug {in_path} to radio")
    run_md380_dfu("write", in_path)
    manifest = write_manifest(in_path, source="radio-write-input", fmt=in_path.suffix.lstrip("."))
    print(f"Write complete. Input manifest: {manifest}")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Manual helper for MD380 codeplug read/write")
    sub = parser.add_subparsers(dest="command", required=True)

    read_parser = sub.add_parser("radio-read", help="Read codeplug from radio")
    read_parser.add_argument("--out", required=True, type=Path, help="Output file path (.bin recommended)")

    read_compat = sub.add_parser("read-radio", help="Alias for radio-read")
    read_compat.add_argument("--out", required=True, type=Path, help="Output file path")

    write_parser = sub.add_parser("radio-write", help="Write codeplug to radio")
    write_parser.add_argument("--in", dest="in_path", required=True, type=Path, help="Input codeplug file")
    write_parser.add_argument("--backup-out", type=Path, help="Optional backup file path before write")
    write_parser.add_argument("--skip-backup", action="store_true", help="Disable pre-write radio backup")
    write_parser.add_argument("--yes", action="store_true", help="Confirm you want to write to the radio")

    write_compat = sub.add_parser("write-radio", help="Alias for radio-write")
    write_compat.add_argument("--in", dest="in_path", required=True, type=Path, help="Input codeplug file")
    write_compat.add_argument("--backup-out", type=Path, help="Optional backup file path before write")
    write_compat.add_argument("--skip-backup", action="store_true", help="Disable pre-write radio backup")
    write_compat.add_argument("--yes", action="store_true", help="Confirm you want to write to the radio")

    return parser.parse_args()


def main() -> None:
    args = parse_args()
    if args.command in {"radio-read", "read-radio"}:
        command_radio_read(args.out)
        return

    if args.command in {"radio-write", "write-radio"}:
        command_radio_write(args.in_path, args.backup_out, args.skip_backup, args.yes)
        return

    raise SystemExit(f"Unknown command: {args.command}")


if __name__ == "__main__":
    main()
