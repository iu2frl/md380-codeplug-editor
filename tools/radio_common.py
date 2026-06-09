#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import json
import re
import subprocess
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

REPO_ROOT = Path(__file__).resolve().parent.parent
CODEPLUG_ARTIFACTS_ROOT = REPO_ROOT / "artifacts" / "codeplug"
CALLSIGN_ARTIFACTS_ROOT = REPO_ROOT / "artifacts" / "callsign"
# Backward-compatible alias used by Phase 1 helper.
ARTIFACTS_ROOT = CODEPLUG_ARTIFACTS_ROOT
MDTOOLS_DFU = REPO_ROOT / "examples" / "md380tools" / "md380_dfu.py"
MDTOOLS_SPI = REPO_ROOT / "examples" / "md380tools" / "md380_tool.py"


def ensure_artifact_dirs() -> None:
    for path in (
        CODEPLUG_ARTIFACTS_ROOT / "read",
        CODEPLUG_ARTIFACTS_ROOT / "edited",
        CODEPLUG_ARTIFACTS_ROOT / "backup",
        CALLSIGN_ARTIFACTS_ROOT / "raw",
        CALLSIGN_ARTIFACTS_ROOT / "build",
        CALLSIGN_ARTIFACTS_ROOT / "backup",
    ):
        path.mkdir(parents=True, exist_ok=True)


def checksum_sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def now_utc_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def write_manifest(
    path: Path,
    source: Any,
    fmt: str,
    target_address: str | None = None,
    tool_version: str = "phase1-initial",
) -> Path:
    manifest: dict[str, Any] = {
        "created_at": now_utc_iso(),
        "source": source,
        "format": fmt,
        "checksum_sha256": checksum_sha256(path),
        "target_address": target_address,
        "tool_version": tool_version,
    }
    manifest_path = path.with_suffix(path.suffix + ".json")
    manifest_path.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    return manifest_path


def run_md380_dfu(command: str, file_path: Path) -> None:
    # Keep helper independent from hosting; user runs this locally with Python + USB stack.
    subprocess.run(
        ["python3", str(MDTOOLS_DFU), command, str(file_path)],
        check=True,
        cwd=str(MDTOOLS_DFU.parent),
    )


def run_md380_spi(*args: str, capture_output: bool = False) -> subprocess.CompletedProcess[str] | None:
    result = subprocess.run(
        ["python3", str(MDTOOLS_SPI), *args],
        check=True,
        cwd=str(MDTOOLS_SPI.parent),
        text=True,
        capture_output=capture_output,
    )
    if capture_output:
        return result
    return None


def detect_spi_flash_size() -> int:
    result = run_md380_spi("spiflashid", capture_output=True)
    if result is None:
        raise RuntimeError("Unable to detect SPI flash size")
    output = f"{result.stdout}\n{result.stderr}"

    if re.search(r"16MByte", output, re.IGNORECASE):
        return 16 * 1024 * 1024
    if re.search(r"1MByte", output, re.IGNORECASE):
        return 1 * 1024 * 1024

    raise RuntimeError(f"Unsupported or unknown SPI flash type. Tool output:\n{output.strip()}")


def validate_codeplug_path(path: Path) -> None:
    suffix = path.suffix.lower()
    if suffix not in {".bin", ".rdt", ".dfu"}:
        raise ValueError("Unsupported file extension. Use .bin, .rdt, or .dfu")

    size = path.stat().st_size
    if suffix == ".bin" and size != 262144:
        raise ValueError("Unexpected .bin size. Expected 262144 bytes for MD380 codeplug")
    if suffix == ".rdt" and size != 262709:
        raise ValueError("Unexpected .rdt size. Expected 262709 bytes for known D variant")
