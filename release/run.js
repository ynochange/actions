import { commitsSince, fetchReleaseTags, recentCommits } from "../shared/github.js";
import { compareVersions, parseTag } from "../shared/semver.js";
import { renderNotes } from "./notes.js";

// A first release lists at most this many commits.
const FIRST_RELEASE_LIMIT = 100;

/** Creates (or, on a re-run, updates) the GitHub release for tag, with
 * notes from the commits since the previous release tag. */
export async function publishRelease({ request, repo, tag, serverUrl, log = () => {} }) {
  const version = parseTag(tag);
  if (!version) throw new Error(`${tag} isn't a release tag (vX.Y.Z)`);
  const tags = await fetchReleaseTags(request, repo, parseTag, compareVersions);
  const self = tags.find((t) => t.name === tag);
  if (!self) throw new Error(`tag ${tag} doesn't exist: create it first`);
  const previous = tags.filter((t) => compareVersions(t.version, version) < 0).pop();

  let commits, truncated = false;
  if (previous) {
    commits = await commitsSince(request, repo, previous.sha, self.sha);
    log(`${commits.length} commit(s) since ${previous.name}`);
  } else {
    const recent = await recentCommits(request, repo, self.sha, FIRST_RELEASE_LIMIT + 1);
    truncated = recent.length > FIRST_RELEASE_LIMIT;
    commits = recent.slice(0, FIRST_RELEASE_LIMIT).reverse();
    log(`First release: ${commits.length} commit(s)`);
  }
  const body = renderNotes({ commits, previous: previous?.name, tag, repo, serverUrl, truncated });

  const existing = await request(`/repos/${repo}/releases/tags/${encodeURIComponent(tag)}`);
  const fields = { name: tag, body };
  let res;
  if (existing.status === 404) {
    res = await request(`/repos/${repo}/releases`, { method: "POST", body: { tag_name: tag, ...fields, make_latest: "legacy" } });
    log(`Created the ${tag} release`);
  } else {
    res = await request(`/repos/${repo}/releases/${existing.json.id}`, { method: "PATCH", body: fields });
    log(`Updated the ${tag} release`);
  }
  if (res.status === 422) throw new Error(`GitHub refused the ${tag} release`);
  return { url: res.json.html_url, body };
}
