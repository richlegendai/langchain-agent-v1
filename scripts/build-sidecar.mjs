import { execFileSync } from "node:child_process";
import {
  chmodSync,
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const root = process.cwd();
const rustVersion = execFileSync("rustc", ["-vV"], { encoding: "utf8" });
const host = /^host:\s+(.+)$/mu.exec(rustVersion)?.[1];
if (host === undefined) {
  throw new Error("Rust 대상 트리플을 확인하지 못했습니다.");
}

const temporaryRoot = mkdtempSync(join(tmpdir(), "reviewflow-sidecar-"));
const pyinstallerConfigDirectory = join(temporaryRoot, "pyinstaller-config");
const outputDirectory = join(root, "src-tauri", "binaries");
const executableSuffix = process.platform === "win32" ? ".exe" : "";
const outputName = `review-analysis-sidecar-${host}${executableSuffix}`;

try {
  execFileSync(
    "uv",
    [
      "run",
      "pyinstaller",
      "--clean",
      "--noconfirm",
      "--onefile",
      "--name",
      "review-analysis-sidecar",
      "--distpath",
      join(temporaryRoot, "dist"),
      "--workpath",
      join(temporaryRoot, "build"),
      "--specpath",
      join(temporaryRoot, "spec"),
      join(root, "review_analyzer", "sidecar.py"),
    ],
    {
      cwd: root,
      env: {
        ...process.env,
        PYINSTALLER_CONFIG_DIR: pyinstallerConfigDirectory,
      },
      stdio: "inherit",
    },
  );
  mkdirSync(outputDirectory, { recursive: true });
  const source = join(temporaryRoot, "dist", `review-analysis-sidecar${executableSuffix}`);
  const destination = join(outputDirectory, outputName);
  copyFileSync(source, destination);
  if (process.platform !== "win32") {
    chmodSync(destination, 0o755);
  }
  process.stdout.write(`${destination}\n`);
} finally {
  rmSync(temporaryRoot, { recursive: true, force: true });
}
