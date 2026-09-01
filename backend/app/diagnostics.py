from __future__ import annotations

import os


def diagnostics_enabled() -> bool:
    return os.getenv("COACH_DIAGNOSTICS", "").strip() == "1"
