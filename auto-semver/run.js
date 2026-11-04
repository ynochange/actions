import { Bump, applyBump, bumpName, compareVersions, computeBump, parseTag, versionString } from "./semver.js";
import { commitMessagesSince, countCommits, fetchReleaseTags, resolveBase, tagExists } from "./github.js";

const EMPTY = Object.freeze({ version: "", tag: "", bump: "" });

/** Works out the next release for head. Resolves to { version, tag, bump };
 * all empty when there's nothing to release. When head already has a
 * release tag, version is that one and tag and bump are empty. */
export async function nextRelease({ request, repo, head, log = () => {} }) {
  const tags = await fetchReleaseTags(request, repo, parseTag, compareVersions);

  const already = tags.filter((t) => t.sha === head).pop();
  if (already) {
    log(`HEAD is already ${already.name}: no new tag`);
    return { version: versionString(already.version), tag: "", bump: "" };
  }

  let next, bump;
  if (tags.length === 0) {
    const count = await countCommits(request, repo, head);
    log(`No release tag yet: the patch starts from ${count} commits`);
    bump = Bump.PATCH;
    next = applyBump({ major: 0, minor: 0, patch: count }, bump);
  } else {
    const latest = tags[tags.length - 1];
    log(`Latest release: ${latest.name} at ${latest.sha}`);
    const base = await resolveBase(request, repo, latest, head);
    const messages = await commitMessagesSince(request, repo, base, head);
    bump = computeBump(messages);
    next = applyBump(latest.version, bump);
    log(`${messages.length} commit(s) since: ${bumpName(bump)}`);
  }

  const tag = `v${versionString(next)}`;
  if (await tagExists(request, repo, tag)) {
    log(`${tag} already exists: nothing to release`);
    return EMPTY;
  }
  log(`Next release: ${tag}`);
  return { version: versionString(next), tag, bump: bumpName(bump) };
}
