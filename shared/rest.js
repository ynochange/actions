// The GitHub REST API, for the actions in this repo. No dependencies.

/** A request function for the REST API: request(path, { method, body })
 * resolves to { status, json, headers }. A path may be a full URL (such as
 * a release's upload URL), and a raw body is sent as is, with contentType.
 * 2xx, 404 (not found) and 422 (e.g. a ref that already exists) resolve;
 * anything else throws. */
export function restClient({ token, apiUrl = "https://api.github.com", fetchImpl = fetch }) {
  return async (path, { method = "GET", body, raw, contentType } = {}) => {
    const url = /^https?:\/\//.test(path) ? path : apiUrl + path;
    const res = await fetchImpl(url, {
      method,
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${token}`,
        "X-GitHub-Api-Version": "2022-11-28",
        ...(body ? { "Content-Type": "application/json" } : {}),
        ...(raw ? { "Content-Type": contentType ?? "application/octet-stream" } : {}),
      },
      body: raw ?? (body ? JSON.stringify(body) : undefined),
    });
    if (res.status === 404 || res.status === 422) return { status: res.status, json: null, headers: res.headers };
    if (!res.ok) throw new Error(`GitHub API ${method} ${path}: ${res.status} ${await res.text()}`);
    const text = await res.text();
    return { status: res.status, json: text ? JSON.parse(text) : null, headers: res.headers };
  };
}

/** Reads an action input the way GitHub passes it, as INPUT_<NAME>. */
export function input(name, fallback = "") {
  return (process.env[`INPUT_${name.toUpperCase()}`] ?? "").trim() || fallback;
}

/** Writes the action's outputs, or prints them when run by hand. */
export async function setOutputs(out) {
  const lines = Object.entries(out).map(([k, v]) => `${k}=${v}\n`).join("");
  if (process.env.GITHUB_OUTPUT) {
    const { appendFileSync } = await import("node:fs");
    appendFileSync(process.env.GITHUB_OUTPUT, lines);
  } else process.stdout.write(lines);
}
