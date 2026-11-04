// Creates tags on a commit through the REST API: no checkout, no git.

/** Splits a comma-separated list, dropping blanks and repeats. */
export function splitTags(s) {
  return [...new Set(s.split(",").map((t) => t.trim()).filter(Boolean))];
}

const ref = (tag) => `refs/tags/${tag}`;

/** Creates tag at sha. When it exists: with continueIfExists and at sha
 * already, it's skipped; otherwise it fails. */
export async function createTag(request, repo, tag, sha, continueIfExists) {
  const { status } = await request(`/repos/${repo}/git/refs`, { method: "POST", body: { ref: ref(tag), sha } });
  if (status !== 422) return "created";
  if (continueIfExists) {
    const { json } = await request(`/repos/${repo}/git/ref/tags/${encodeURIComponent(tag)}`);
    if (json?.object?.sha === sha) return "skipped";
    throw new Error(`tag ${tag} already exists, at ${json?.object?.sha}, not ${sha}`);
  }
  throw new Error(`tag ${tag} already exists`);
}

/** Moves a floating tag (such as v1) to sha, creating it if need be. */
export async function moveTag(request, repo, tag, sha) {
  const { status } = await request(`/repos/${repo}/git/refs/tags/${encodeURIComponent(tag)}`, {
    method: "PATCH",
    body: { sha, force: true },
  });
  if (status !== 422 && status !== 404) return "moved";
  await createTag(request, repo, tag, sha, false);
  return "created";
}

/** Tags sha. Resolves to { created, skipped }, each a list of tags. */
export async function tagCommit({ request, repo, sha, tags, floatingTags = [], continueIfExists = false, ignoreNoOp = false, log = () => {} }) {
  if (tags.length === 0 && floatingTags.length === 0 && !ignoreNoOp) {
    throw new Error("no tags given: set tags or floating-tags, or ignore-no-op");
  }
  const created = [];
  const skipped = [];
  for (const t of tags) {
    const r = await createTag(request, repo, t, sha, continueIfExists);
    (r === "created" ? created : skipped).push(t);
    log(r === "created" ? `Created ${t}` : `${t} is already at ${sha}`);
  }
  for (const t of floatingTags) {
    await moveTag(request, repo, t, sha);
    created.push(t);
    log(`Moved ${t} to ${sha}`);
  }
  return { created, skipped };
}
