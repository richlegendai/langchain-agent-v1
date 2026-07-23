import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import test from "node:test";

test(
  "macOS 앱에 포함된 sidecar가 JSONL 계약 오류를 반환한다",
  { skip: process.platform !== "darwin" },
  () => {
    const sidecar = resolve(
      "src-tauri",
      "target",
      "release",
      "bundle",
      "macos",
      "ReviewFlow Desktop.app",
      "Contents",
      "MacOS",
      "review-analysis-sidecar",
    );
    const completed = spawnSync(sidecar, [], {
      encoding: "utf8",
      input: '{"schema_version":"9.9"}\n',
    });

    assert.equal(completed.status, 1, completed.stderr);
    const event = JSON.parse(completed.stdout);
    assert.equal(event.schema_version, "1.0");
    assert.equal(event.event, "fatal_error");
    assert.equal(event.error.code, "invalid_input");
  },
);
