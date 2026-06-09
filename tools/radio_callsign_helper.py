#!/usr/bin/env python3
from __future__ import annotations

import argparse
import csv
import io
import subprocess
import tempfile
import unicodedata
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

from radio_common import (
    CALLSIGN_ARTIFACTS_ROOT,
    detect_spi_flash_size,
    ensure_artifact_dirs,
    write_manifest,
)

CALLSIGN_FLASH_ADDRESS = 0x100000
TOOL_VERSION = "phase2-initial"
INDEXED_BUILDER = Path(__file__).resolve().parent.parent / "examples" / "md380tools" / "lineardb_to_indexeddb.py"


def utc_stamp() -> str:
    return datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")


def to_ascii_safe(text: str) -> str:
    normalized = unicodedata.normalize("NFD", text)
    ascii_text = "".join(char for char in normalized if unicodedata.category(char) != "Mn")
    return ascii_text.encode("ascii", errors="replace").decode("ascii")


def source_kind(source: str) -> str:
    parsed = urllib.parse.urlparse(source)
    if parsed.scheme in {"http", "https"}:
        return "url"
    return "file"


def read_source_text(source: str) -> str:
    kind = source_kind(source)
    if kind == "url":
        with urllib.request.urlopen(source, timeout=30) as response:  # nosec B310
            raw = response.read()
        return raw.decode("utf-8", errors="replace")

    path = Path(source)
    if not path.exists():
        raise FileNotFoundError(f"Source file does not exist: {path}")
    return path.read_text(encoding="utf-8", errors="replace")


def normalize_callsign_csv(raw_text: str, profile: str) -> bytes:
    rows: list[list[str]] = []
    reader = csv.reader(io.StringIO(raw_text))

    for raw_row in reader:
        if not raw_row:
            continue
        row = [to_ascii_safe(value.strip()) for value in raw_row]
        if not row[0].isdigit():
            continue

        # Canonical md380tools indexed builder expects exactly 7 fields:
        # id,callsign,name,city,state,nickname,country
        normalized = (row + [""] * 7)[:7]
        if profile == "eu":
            # Privacy-aware profile: keep ID/callsign/country, clear personal/location free-text.
            normalized[2] = ""
            normalized[3] = ""
            normalized[4] = ""
            normalized[5] = ""

        rows.append(normalized)

    rows.sort(key=lambda item: (int(item[0]), item[1]))

    output = io.StringIO()
    writer = csv.writer(output, lineterminator="\n")
    writer.writerows(rows)
    return output.getvalue().encode("ascii", errors="replace")


def build_linear_database(csv_bytes: bytes, output_path: Path) -> None:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_bytes(f"{len(csv_bytes)}\n".encode("ascii") + csv_bytes)


def build_indexed_database(csv_bytes: bytes, output_path: Path) -> None:
    output_path = output_path.resolve()
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile(prefix="callsign-normalized-", suffix=".csv", delete=False) as handle:
        temp_csv = Path(handle.name)
        handle.write(csv_bytes)

    try:
        subprocess.run(
            ["python3", str(INDEXED_BUILDER), str(temp_csv), str(output_path)],
            check=True,
            cwd=str(INDEXED_BUILDER.parent),
        )
    finally:
        temp_csv.unlink(missing_ok=True)


def default_build_output(db_format: str) -> Path:
    stamp = utc_stamp()
    file_name = f"callsign-{db_format}-{stamp}.bin"
    return CALLSIGN_ARTIFACTS_ROOT / "build" / file_name


def default_backup_output() -> Path:
    return CALLSIGN_ARTIFACTS_ROOT / "backup" / f"callsign-backup-{utc_stamp()}.bin"


def backup_spi_region(out_path: Path, address: int, size: int) -> None:
    detect_and_validate_spi_bounds(address, size)
    out_path.parent.mkdir(parents=True, exist_ok=True)

    with tempfile.NamedTemporaryFile(prefix="spiflash-full-", suffix=".bin", delete=False) as handle:
        full_dump_path = Path(handle.name)

    try:
        subprocess.run(
            ["python3", str(Path(__file__).resolve().parent.parent / "examples" / "md380tools" / "md380_tool.py"), "spiflashdump", str(full_dump_path)],
            check=True,
            cwd=str((Path(__file__).resolve().parent.parent / "examples" / "md380tools")),
        )
        full_dump = full_dump_path.read_bytes()
        region = full_dump[address:address + size]
        if len(region) != size:
            raise RuntimeError("Failed to read requested SPI backup region")
        out_path.write_bytes(region)
    finally:
        full_dump_path.unlink(missing_ok=True)


def detect_and_validate_spi_bounds(address: int, size: int, minimum_size: int = 16 * 1024 * 1024) -> int:
    if address < 0:
        raise ValueError("Address must be >= 0")
    if size <= 0:
        raise ValueError("Size must be > 0")

    flash_size = detect_spi_flash_size()
    if flash_size < minimum_size:
        raise RuntimeError(f"Unsupported flash size {flash_size} bytes; expected at least {minimum_size} bytes")
    if address + size > flash_size:
        raise RuntimeError(
            f"Requested range 0x{address:x}-0x{address + size:x} exceeds SPI flash size {flash_size} bytes"
        )
    return flash_size


def command_callsign_build(source: str, db_format: str, out_path: Path | None, profile: str) -> None:
    ensure_artifact_dirs()
    raw_text = read_source_text(source)
    normalized_csv = normalize_callsign_csv(raw_text, profile)

    raw_snapshot_path = CALLSIGN_ARTIFACTS_ROOT / "raw" / f"callsign-source-{utc_stamp()}.csv"
    raw_snapshot_path.parent.mkdir(parents=True, exist_ok=True)
    raw_snapshot_path.write_bytes(normalized_csv)
    write_manifest(
        raw_snapshot_path,
        source={"kind": source_kind(source), "value": source, "profile": profile},
        fmt="csv",
        tool_version=TOOL_VERSION,
    )

    output_path = out_path if out_path else default_build_output(db_format)
    if db_format == "linear":
        build_linear_database(normalized_csv, output_path)
    else:
        build_indexed_database(normalized_csv, output_path)

    manifest = write_manifest(
        output_path,
        source={"source_csv": str(raw_snapshot_path), "profile": profile},
        fmt=db_format,
        target_address=f"0x{CALLSIGN_FLASH_ADDRESS:x}",
        tool_version=TOOL_VERSION,
    )
    print(f"Build complete: {output_path}")
    print(f"Manifest: {manifest}")


def command_callsign_backup(out_path: Path | None, address: int, size: int) -> None:
    ensure_artifact_dirs()
    backup_path = out_path if out_path else default_backup_output()
    print(f"Backing up SPI region 0x{address:x} size {size} bytes to {backup_path}")
    backup_spi_region(backup_path, address, size)
    manifest = write_manifest(
        backup_path,
        source={"action": "callsign-backup", "address": f"0x{address:x}", "size": size},
        fmt="bin",
        target_address=f"0x{address:x}",
        tool_version=TOOL_VERSION,
    )
    print(f"Backup complete. Manifest: {manifest}")


def command_callsign_flash(in_path: Path, address: int, backup_out: Path | None, skip_backup: bool, yes: bool) -> None:
    ensure_artifact_dirs()
    if not in_path.exists():
        raise FileNotFoundError(f"Input file does not exist: {in_path}")

    payload_size = in_path.stat().st_size
    detect_and_validate_spi_bounds(address, payload_size)

    if not yes:
        raise SystemExit("Refusing to flash without explicit confirmation. Re-run with --yes")

    rollback_path = backup_out if backup_out else default_backup_output()
    if not skip_backup:
        command_callsign_backup(rollback_path, address, payload_size)

    print(f"Flashing callsign database {in_path} to 0x{address:x}")
    subprocess.run(
        ["python3", str(Path(__file__).resolve().parent.parent / "examples" / "md380tools" / "md380_tool.py"), "spiflashwrite", str(in_path), f"0x{address:x}"],
        check=True,
        cwd=str((Path(__file__).resolve().parent.parent / "examples" / "md380tools")),
    )

    manifest = write_manifest(
        in_path,
        source={"action": "callsign-flash", "backup": str(rollback_path) if not skip_backup else None},
        fmt=in_path.suffix.lstrip(".") or "bin",
        target_address=f"0x{address:x}",
        tool_version=TOOL_VERSION,
    )
    print(f"Flash complete. Input manifest: {manifest}")
    if not skip_backup:
        print(f"Rollback file saved at: {rollback_path}")


def command_callsign_restore(in_path: Path, address: int, yes: bool) -> None:
    ensure_artifact_dirs()
    if not in_path.exists():
        raise FileNotFoundError(f"Backup file does not exist: {in_path}")
    size = in_path.stat().st_size
    detect_and_validate_spi_bounds(address, size)

    if not yes:
        raise SystemExit("Refusing to restore without explicit confirmation. Re-run with --yes")

    print(f"Restoring SPI region at 0x{address:x} from {in_path}")
    subprocess.run(
        ["python3", str(Path(__file__).resolve().parent.parent / "examples" / "md380tools" / "md380_tool.py"), "spiflashwrite", str(in_path), f"0x{address:x}"],
        check=True,
        cwd=str((Path(__file__).resolve().parent.parent / "examples" / "md380tools")),
    )
    manifest = write_manifest(
        in_path,
        source={"action": "callsign-restore"},
        fmt=in_path.suffix.lstrip(".") or "bin",
        target_address=f"0x{address:x}",
        tool_version=TOOL_VERSION,
    )
    print(f"Restore complete. Manifest: {manifest}")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Manual helper for MD380 callsign DB build/flash")
    sub = parser.add_subparsers(dest="command", required=True)

    build_parser = sub.add_parser("callsign-build", help="Build callsign DB artifact from CSV file or URL")
    build_parser.add_argument("--source", required=True, help="Source CSV path or URL")
    build_parser.add_argument("--format", dest="db_format", required=True, choices=["linear", "indexed"], help="Output format")
    build_parser.add_argument("--out", type=Path, help="Optional output file path")
    build_parser.add_argument("--profile", choices=["global", "eu"], default="global", help="Privacy profile")

    flash_parser = sub.add_parser("callsign-flash", help="Flash callsign DB artifact to SPI flash")
    flash_parser.add_argument("--file", required=True, type=Path, help="Built callsign DB binary")
    flash_parser.add_argument("--address", default=f"0x{CALLSIGN_FLASH_ADDRESS:x}", help="Target SPI address (hex or decimal)")
    flash_parser.add_argument("--backup-out", type=Path, help="Optional rollback backup file path")
    flash_parser.add_argument("--skip-backup", action="store_true", help="Skip pre-flash backup")
    flash_parser.add_argument("--yes", action="store_true", help="Confirm flash operation")

    backup_parser = sub.add_parser("callsign-backup", help="Backup callsign SPI region")
    backup_parser.add_argument("--out", type=Path, help="Output backup file path")
    backup_parser.add_argument("--address", default=f"0x{CALLSIGN_FLASH_ADDRESS:x}", help="Start address")
    backup_parser.add_argument("--size", required=True, type=int, help="Number of bytes to backup")

    restore_parser = sub.add_parser("callsign-restore", help="Restore callsign SPI region from backup")
    restore_parser.add_argument("--file", required=True, type=Path, help="Backup binary file")
    restore_parser.add_argument("--address", default=f"0x{CALLSIGN_FLASH_ADDRESS:x}", help="Target address")
    restore_parser.add_argument("--yes", action="store_true", help="Confirm restore operation")

    return parser.parse_args()


def parse_address(raw_value: str) -> int:
    return int(raw_value, 0)


def main() -> None:
    args = parse_args()

    if args.command == "callsign-build":
        command_callsign_build(args.source, args.db_format, args.out, args.profile)
        return

    if args.command == "callsign-backup":
        command_callsign_backup(args.out, parse_address(args.address), args.size)
        return

    if args.command == "callsign-flash":
        command_callsign_flash(args.file, parse_address(args.address), args.backup_out, args.skip_backup, args.yes)
        return

    if args.command == "callsign-restore":
        command_callsign_restore(args.file, parse_address(args.address), args.yes)
        return

    raise SystemExit(f"Unknown command: {args.command}")


if __name__ == "__main__":
    main()
