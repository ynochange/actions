import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { checksumText, contentType, resolveAssets, sha256 } from "../assets.js";

async function workspace() {
  const dir = await mkdtemp(join(tmpdir(), "assets-"));
  await mkdir(join(dir, "dist"));
  for (const n of ["app_1.0.0_linux_amd64.tar.gz", "app_1.0.0_darwin_arm64.tar.gz", "app_1.0.0_windows_amd64.zip", "notes.md"]) {
    await writeFile(join(dir, "dist", n), n);
  }
  return dir;
}

test("paths and wildcards find files, each once, and an empty match fails", async () => {
  const dir = await workspace();
  const found = await resolveAssets("dist/*.tar.gz\ndist/*.zip, dist/app_1.0.0_linux_amd64.tar.gz", dir);
  assert.deepEqual(found.map((a) => a.name), ["app_1.0.0_darwin_arm64.tar.gz", "app_1.0.0_linux_amd64.tar.gz", "app_1.0.0_windows_amd64.zip"]);
  await assert.rejects(resolveAssets("dist/*.deb", dir), /no files match dist\/\*\.deb/);
  await assert.rejects(resolveAssets("dist/missing.zip", dir), /no files match/);
});

test("each .sha256 file is what sha256sum writes, and it checks", async () => {
  const dir = await workspace();
  const [a] = await resolveAssets("dist/app_1.0.0_linux_amd64.tar.gz", dir);
  a.sha256 = await sha256(a.path);
  const text = checksumText(a);
  assert.match(text, /^[0-9a-f]{64} {2}app_1\.0\.0_linux_amd64\.tar\.gz\n$/);
  await writeFile(join(dir, "dist", `${a.name}.sha256`), text);
  try {
    execFileSync("sha256sum", ["-c", `${a.name}.sha256`], { cwd: join(dir, "dist"), stdio: "pipe" });
  } catch (e) {
    if (e.code !== "ENOENT") throw new Error("sha256sum -c rejected the file"); // no sha256sum here: nothing to compare with
  }
});

test("content types by name", () => {
  assert.equal(contentType("a.tar.gz"), "application/gzip");
  assert.equal(contentType("a.zip"), "application/zip");
  assert.equal(contentType("a.tar.gz.sha256"), "text/plain");
  assert.equal(contentType("ynochange"), "application/octet-stream");
});
