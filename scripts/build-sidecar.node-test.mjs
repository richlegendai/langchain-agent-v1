import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import {
  chmodSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { delimiter, join, resolve } from "node:path";
import test from "node:test";

const buildScript = resolve("scripts", "build-sidecar.mjs");

test("PyInstaller 캐시를 각 sidecar 빌드의 임시 폴더로 격리한다", () => {
  const testRoot = mkdtempSync(join(tmpdir(), "reviewflow-sidecar-test-"));
  const fakeBin = join(testRoot, "bin");
  const rustc = join(fakeBin, "rustc");
  const uv = join(fakeBin, "uv");
  const inheritedConfigDirectory = join(testRoot, "shared-pyinstaller-cache");

  mkdirSync(fakeBin, { recursive: true });
  writeFileSync(rustc, "#!/bin/sh\nprintf 'host: aarch64-apple-darwin\\n'\n");
  writeFileSync(
    uv,
    `#!/usr/bin/env node
const { mkdirSync, writeFileSync } = require("node:fs");
const { join } = require("node:path");
const distIndex = process.argv.indexOf("--distpath");
const distPath = process.argv[distIndex + 1];
if (distIndex < 0 || distPath === undefined) {
  throw new Error("--distpath 인수가 필요합니다.");
}
mkdirSync(distPath, { recursive: true });
writeFileSync(join(distPath, "review-analysis-sidecar"), "test-sidecar");
writeFileSync(
  join(process.cwd(), "observed-config-directory.txt"),
  process.env.PYINSTALLER_CONFIG_DIR ?? "",
);
`,
  );
  chmodSync(rustc, 0o755);
  chmodSync(uv, 0o755);

  try {
    execFileSync(process.execPath, [buildScript], {
      cwd: testRoot,
      env: {
        ...process.env,
        PATH: `${fakeBin}${delimiter}${process.env.PATH ?? ""}`,
        PYINSTALLER_CONFIG_DIR: inheritedConfigDirectory,
      },
      stdio: "pipe",
    });

    const observedConfigDirectory = readFileSync(
      join(testRoot, "observed-config-directory.txt"),
      "utf8",
    );
    assert.notEqual(observedConfigDirectory, inheritedConfigDirectory);
    assert.match(observedConfigDirectory, /reviewflow-sidecar-[^/]+\/pyinstaller-config$/u);
    assert.equal(
      readFileSync(
        join(
          testRoot,
          "src-tauri",
          "binaries",
          "review-analysis-sidecar-aarch64-apple-darwin",
        ),
        "utf8",
      ),
      "test-sidecar",
    );
  } finally {
    assert.ok(testRoot.startsWith(`${tmpdir()}/reviewflow-sidecar-test-`));
    rmSync(testRoot, { recursive: true, force: true });
  }
});
