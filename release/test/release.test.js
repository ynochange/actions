import { test } from "node:test";
import assert from "node:assert/strict";
import { noteLine, renderNotes, sectionOf } from "../notes.js";
import { publishRelease } from "../run.js";

const c = (sha, message) => ({ sha, message });

test("note lines drop the type and bold the scope", () => {
  assert.equal(noteLine(c("abcdef123456", "feat(vote): hold to abstain\n\nbody")), "- **vote:** hold to abstain (abcdef1)");
  assert.equal(noteLine(c("abcdef123456", "fix: dots on the title line")), "- dots on the title line (abcdef1)");
  assert.equal(noteLine(c("abcdef123456", "Rename yweno")), "- Rename yweno (abcdef1)");
});

test("commits go in breaking, features, fixes or other", () => {
  assert.equal(sectionOf(c("a", "feat!: x")), "breaking");
  assert.equal(sectionOf(c("a", "fix: x\n\nBREAKING CHANGE: y")), "breaking");
  assert.equal(sectionOf(c("a", "feat(x): y")), "feat");
  assert.equal(sectionOf(c("a", "fix: y")), "fix");
  assert.equal(sectionOf(c("a", "ci: y")), "other");
  assert.equal(sectionOf(c("a", "Plain words")), "other");
});

test("notes list groups in order, skip empty ones, and link the comparison", () => {
  const notes = renderNotes({
    commits: [c("1111111", "fix: a"), c("2222222", "feat: b"), c("3333333", "chore: c"), c("4444444", "feat: d")],
    previous: "v0.1.0",
    tag: "v0.2.0",
    repo: "o/r",
  });
  assert.equal(
    notes,
    "## Features\n\n- b (2222222)\n- d (4444444)\n\n## Fixes\n\n- a (1111111)\n\n## Other changes\n\n- c (3333333)\n\n" +
      "**Full changes:** https://github.com/o/r/compare/v0.1.0...v0.2.0\n",
  );
});

// A fake GitHub for publishing: tags, a linear history and releases.
function fakeGitHub({ commits, tags, releases = {} }) {
  const index = new Map(commits.map((x, i) => [x.sha, i]));
  const calls = [];
  const request = async (path, { method = "GET", body } = {}) => {
    calls.push({ method, path, body });
    const url = new URL("https://api.github.com" + path);
    const p = url.pathname.replace("/repos/o/r", "");
    const page = Number(url.searchParams.get("page") ?? 1);
    let m;
    if (p === "/tags") return { status: 200, json: page > 1 ? [] : Object.entries(tags).map(([name, sha]) => ({ name, commit: { sha } })) };
    if ((m = /^\/compare\/(\w+)\.\.\.(\w+)$/.exec(p))) {
      const range = commits.slice(index.get(m[1]) + 1, index.get(m[2]) + 1);
      return { status: 200, json: { status: "ahead", total_commits: range.length, commits: page > 1 ? [] : range.map((x) => ({ sha: x.sha, commit: { message: x.message } })) } };
    }
    if (p === "/commits") {
      const upto = commits.slice(0, index.get(url.searchParams.get("sha")) + 1).reverse();
      return { status: 200, json: upto.slice((page - 1) * 100, page * 100).map((x) => ({ sha: x.sha, commit: { message: x.message } })) };
    }
    if ((m = /^\/releases\/tags\/(.+)$/.exec(p))) {
      const r = releases[decodeURIComponent(m[1])];
      return r ? { status: 200, json: r } : { status: 404, json: null };
    }
    if (p === "/releases" && method === "POST") return { status: 201, json: { html_url: `https://github.com/o/r/releases/tag/${body.tag_name}` } };
    if ((m = /^\/releases\/(\d+)$/.exec(p)) && method === "PATCH") return { status: 200, json: { html_url: "https://github.com/o/r/releases/x" } };
    throw new Error(`unexpected ${method} ${path}`);
  };
  return { request, calls };
}

const history = [c("c0", "feat: first"), c("c1", "fix: a"), c("c2", "feat(ui): b")];

test("creates the release with notes since the previous release", async () => {
  const { request, calls } = fakeGitHub({ commits: history, tags: { "v0.1.0": "c0", "v0.2.0": "c2", nightly: "c1" } });
  const { url, body } = await publishRelease({ request, repo: "o/r", tag: "v0.2.0" });
  assert.equal(url, "https://github.com/o/r/releases/tag/v0.2.0");
  assert.match(body, /## Features\n\n- \*\*ui:\*\* b \(c2\)/);
  assert.match(body, /## Fixes\n\n- a \(c1\)/);
  assert.doesNotMatch(body, /first/);
  const post = calls.find((x) => x.method === "POST");
  assert.equal(post.body.name, "v0.2.0");
});

test("a first release lists the history, oldest first", async () => {
  const { request } = fakeGitHub({ commits: history, tags: { "v0.1.0": "c2" } });
  const { body } = await publishRelease({ request, repo: "o/r", tag: "v0.1.0" });
  assert.match(body, /- first \(c0\)\n- \*\*ui:\*\* b \(c2\)/);
  assert.doesNotMatch(body, /Full changes/);
});

test("a re-run updates the release instead", async () => {
  const { request, calls } = fakeGitHub({ commits: history, tags: { "v0.1.0": "c0", "v0.2.0": "c2" }, releases: { "v0.2.0": { id: 7 } } });
  await publishRelease({ request, repo: "o/r", tag: "v0.2.0" });
  assert.ok(calls.some((x) => x.method === "PATCH" && x.path.endsWith("/releases/7")));
  assert.ok(!calls.some((x) => x.method === "POST"));
});

test("the tag must exist and be a release tag", async () => {
  const { request } = fakeGitHub({ commits: history, tags: { "v0.1.0": "c0" } });
  await assert.rejects(publishRelease({ request, repo: "o/r", tag: "v0.2.0" }), /doesn't exist/);
  await assert.rejects(publishRelease({ request, repo: "o/r", tag: "nightly" }), /isn't a release tag/);
});
