from __future__ import annotations

import json
import subprocess
import sys


def test_sidecar_returns_structured_error_for_invalid_contract() -> None:
    completed = subprocess.run(
        [sys.executable, "-m", "review_analyzer.sidecar"],
        input='{"schema_version":"9.9"}\n',
        capture_output=True,
        check=False,
        text=True,
    )

    event = json.loads(completed.stdout)
    assert completed.returncode == 1
    assert event["event"] == "fatal_error"
    assert event["schema_version"] == "1.0"
    assert event["error"]["code"] == "invalid_input"
    assert "9.9" not in event["error"]["message"]
