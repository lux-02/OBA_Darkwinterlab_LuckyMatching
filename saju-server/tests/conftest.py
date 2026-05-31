from __future__ import annotations

import sys
import subprocess
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
BUNDLE_PATH = ROOT / "saju_server" / "vendor" / "manseryeok_bridge.bundle.js"

if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))


@pytest.fixture(scope="session", autouse=True)
def ensure_manseryeok_bundle() -> None:
    if BUNDLE_PATH.exists():
        return

    install_command = ["npm", "ci"] if (ROOT / "package-lock.json").exists() else ["npm", "install"]
    subprocess.run(install_command, cwd=ROOT, check=True)
    subprocess.run(["npm", "run", "build:bridge"], cwd=ROOT, check=True)
