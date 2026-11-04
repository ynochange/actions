// Release assets: finding the files, their checksums, and attaching them.
import { createHash } from "node:crypto";
import { readFile, readdir, stat } from "node:fs/promises";
import { basename, dirname, join } from "node:path";

/** The files a list of paths names, newline- or comma-separated. A `*` in
 * a file name matches any run of characters (dist/*.tar.gz); folders don't
 * take wildcards. A path that matches nothing fails. */
export async function resolveAssets(spec, cwd = process.cwd()) {
  const out = [];
  for (const pattern of spec.split(/[\n,]/).map((s) => s.trim()).filter(Boolean)) {
    const dir = join(cwd, dirname(pattern));
    const base = basename(pattern);
    let names;
    if (base.includes("*")) {
      const re = new RegExp("^" + base.split("*").map((p) => p.replace(/[.+?^${}()|[\]\\]/g, "\\$&")).join(".*") + "$");
      names = (await readdir(dir)).filter((n) => re.test(n)).sort();
    } else {
      names = [base];
    }
    let found = 0;
    for (const name of names) {
      const path = join(dir, name);
      const st = await stat(path).catch(() => null);
      if (!st?.isFile()) continue;
      found++;
      if (!out.some((a) => a.name === name)) out.push({ path, name, size: st.size });
    }
    if (found === 0) throw new Error(`no files match ${pattern}`);
  }
  return out;
}

export async function sha256(path) {
  return createHash("sha256").update(await readFile(path)).digest("hex");
}

/** A SHA256SUMS file's text, as sha256sum writes it (sha256sum -c reads it). */
export function checksumsText(assets) {
  return assets.map((a) => `${a.sha256}  ${a.name}\n`).join("");
}

export function contentType(name) {
  if (name.endsWith(".tar.gz") || name.endsWith(".tgz")) return "application/gzip";
  if (name.endsWith(".zip")) return "application/zip";
  if (name.endsWith(".json")) return "application/json";
  if (name === "SHA256SUMS" || name.endsWith(".txt")) return "text/plain";
  return "application/octet-stream";
}

/** Attaches data to the release as name, replacing an asset of that name
 * from an earlier run. */
export async function uploadAsset(request, repo, release, name, data) {
  for (const a of release.assets ?? []) {
    if (a.name === name) await request(`/repos/${repo}/releases/assets/${a.id}`, { method: "DELETE" });
  }
  const url = release.upload_url.replace(/\{.*\}$/, "") + `?name=${encodeURIComponent(name)}`;
  const res = await request(url, { method: "POST", raw: data, contentType: contentType(name) });
  if (res.status === 422) throw new Error(`GitHub refused the asset ${name}`);
  return res.json;
}
