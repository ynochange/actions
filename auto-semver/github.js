// The GitHub REST calls auto-semver makes, through an injectable request
// function so tests can fake them.

/** A request function for the REST API: request(path) resolves to
 * { status, json, headers }. Only 2xx and 404 resolve; anything else throws. */
export function restClient({ token, apiUrl = "https://api.github.com", fetchImpl = fetch }) {
  return async (path) => {
    const res = await fetchImpl(apiUrl + path, {
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${token}`,
        "X-GitHub-Api-Version": "2022-11-28",
      },
    });
    if (res.status === 404) return { status: 404, json: null, headers: res.headers };
    if (!res.ok) throw new Error(`GitHub API ${path}: ${res.status} ${await res.text()}`);
    return { status: res.status, json: await res.json(), headers: res.headers };
  };
}

/** Every release tag (vX.Y.Z), lowest first, with the commit it points at. */
export async function fetchReleaseTags(request, repo, parseTag, compareVersions) {
  const tags = [];
  for (let page = 1; ; page++) {
    const { json } = await request(`/repos/${repo}/tags?per_page=100&page=${page}`);
    if (!json || json.length === 0) break;
    for (const t of json) {
      const v = parseTag(t.name);
      if (v) tags.push({ name: t.name, sha: t.commit.sha, version: v });
    }
    if (json.length < 100) break;
  }
  return tags.sort((a, b) => compareVersions(a.version, b.version));
}

/** Whether base is head or one of its ancestors. */
export async function isAncestor(request, repo, base, head) {
  const { status, json } = await request(`/repos/${repo}/compare/${base}...${head}?per_page=1`);
  return status !== 404 && (json.status === "ahead" || json.status === "identical");
}

/** The commit to count from: the tag's own, which must be on the branch.
 * Anything else fails: a version worked out from an unrelated starting
 * point would be wrong. */
export async function resolveBase(request, repo, tag, head) {
  if (await isAncestor(request, repo, tag.sha, head)) return tag.sha;
  throw new Error(
    `the latest release tag ${tag.name} (${tag.sha}) isn't on this branch. Tag the tip of the branch by hand to resume.`,
  );
}

/** The full message of every commit after base, up to head. */
export async function commitMessagesSince(request, repo, base, head) {
  const messages = [];
  for (let page = 1; ; page++) {
    const { json } = await request(`/repos/${repo}/compare/${base}...${head}?per_page=100&page=${page}`);
    const commits = json.commits ?? [];
    for (const c of commits) messages.push(c.commit.message);
    if (commits.length < 100 || messages.length >= json.total_commits) break;
  }
  return messages;
}

/** How many commits head's history has, from the last page of a
 * one-per-page listing. */
export async function countCommits(request, repo, head) {
  const { json, headers } = await request(`/repos/${repo}/commits?sha=${head}&per_page=1`);
  const link = headers.get("link") ?? "";
  const last = /[?&]page=(\d+)>;\s*rel="last"/.exec(link);
  return last ? Number(last[1]) : (json ?? []).length;
}

export async function tagExists(request, repo, tag) {
  const { status } = await request(`/repos/${repo}/git/ref/tags/${encodeURIComponent(tag)}`);
  return status !== 404;
}
