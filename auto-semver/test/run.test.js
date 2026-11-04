import { test } from "node:test";
import assert from "node:assert/strict";
import { nextRelease } from "../run.js";

const REPO = "o/r";

// A fake GitHub over a linear history: commits[0] is the first commit.
function fakeGitHub({ commits, tags = {}, offBranch = {} }) {
  const index = new Map(commits.map((c, i) => [c.sha, i]));
  const calls = [];
  const ok = (json, link) => ({ status: 200, json, headers: new Headers(link ? { link } : {}) });
  const request = async (path) => {
    calls.push(path);
    const url = new URL("https://api.github.com" + path);
    const p = url.pathname.replace(`/repos/${REPO}`, "");
    const page = Number(url.searchParams.get("page") ?? 1);
    const per = Number(url.searchParams.get("per_page") ?? 30);
    if (p === "/tags") {
      const all = Object.entries(tags).map(([name, sha]) => ({ name, commit: { sha } }));
      return ok(all.slice((page - 1) * per, page * per));
    }
    let m;
    if ((m = /^\/compare\/(\w+)\.\.\.(\w+)$/.exec(p))) {
      const [b, h] = [m[1], m[2]];
      if (offBranch[b]) return ok({ status: "diverged", total_commits: 0, commits: [] });
      const range = commits.slice(index.get(b) + 1, index.get(h) + 1);
      const status = b === h ? "identical" : "ahead";
      return ok({ status, total_commits: range.length, commits: range.slice((page - 1) * per, page * per).map((c) => ({ commit: { message: c.message } })) });
    }
    if (p === "/commits") {
      const n = index.get(url.searchParams.get("sha")) + 1;
      return ok([{}], n > 1 ? `<https://api.github.com/repositories/1/commits?sha=x&per_page=1&page=2>; rel="next", <https://api.github.com/repositories/1/commits?sha=x&per_page=1&page=${n}>; rel="last"` : undefined);
    }
    if ((m = /^\/git\/ref\/tags\/(.+)$/.exec(p))) {
      return tags[decodeURIComponent(m[1])] ? ok({}) : { status: 404, json: null, headers: new Headers() };
    }
    throw new Error("unexpected " + path);
  };
  return { request, calls };
}

const history = (...messages) => messages.map((message, i) => ({ sha: `c${i}`, message }));

test("bumps from the latest tag by the biggest change since", async () => {
  const commits = history("init", "fix: a", "feat: b", "fix: c");
  const { request } = fakeGitHub({ commits, tags: { "v0.3.1": "c1", "v0.2.0": "c0", "nightly": "c2" } });
  assert.deepEqual(await nextRelease({ request, repo: REPO, head: "c3" }), { version: "0.4.0", tag: "v0.4.0", bump: "minor" });
});

test("a breaking change before 1.0.0 is a minor, and after it a major", async () => {
  const commits = history("init", "feat!: b");
  let { request } = fakeGitHub({ commits, tags: { "v0.9.3": "c0" } });
  assert.deepEqual(await nextRelease({ request, repo: REPO, head: "c1" }), { version: "0.10.0", tag: "v0.10.0", bump: "major" });
  ({ request } = fakeGitHub({ commits, tags: { "v1.9.3": "c0" } }));
  assert.equal((await nextRelease({ request, repo: REPO, head: "c1" })).version, "2.0.0");
});

test("reads every page of a long range", async () => {
  const msgs = ["init", ...Array.from({ length: 150 }, (_, i) => `fix: ${i}`), "feat: last"];
  const { request, calls } = fakeGitHub({ commits: history(...msgs), tags: { "v0.1.0": "c0" } });
  assert.equal((await nextRelease({ request, repo: REPO, head: "c151" })).version, "0.2.0");
  assert.ok(calls.some((c) => c.includes("page=2")));
});

test("HEAD already tagged: the same version, nothing to tag", async () => {
  const { request } = fakeGitHub({ commits: history("init", "feat: a"), tags: { "v0.2.0": "c1" } });
  assert.deepEqual(await nextRelease({ request, repo: REPO, head: "c1" }), { version: "0.2.0", tag: "", bump: "" });
});

test("no release tag yet: the patch starts from the commit count", async () => {
  const { request } = fakeGitHub({ commits: history("a", "b", "c", "d") });
  assert.deepEqual(await nextRelease({ request, repo: REPO, head: "c3" }), { version: "0.0.5", tag: "v0.0.5", bump: "patch" });
});

test("a tag that isn't on the branch fails rather than guessing", async () => {
  const { request } = fakeGitHub({ commits: history("init", "fix: a"), tags: { "v0.2.0": "c0" }, offBranch: { c0: true } });
  await assert.rejects(nextRelease({ request, repo: REPO, head: "c1" }), /isn't on this branch/);
});

test("the next tag existing already means nothing to release", async () => {
  // v0.2.1 exists (say, pushed by hand elsewhere) but isn't a release tag
  // the listing returned, so the computed next tag clashes with it.
  const { request: base } = fakeGitHub({ commits: history("init", "fix: a"), tags: { "v0.2.0": "c0" } });
  const request = async (p) => (p.endsWith("/git/ref/tags/v0.2.1") ? { status: 200, json: {}, headers: new Headers() } : base(p));
  assert.deepEqual(await nextRelease({ request, repo: REPO, head: "c1" }), { version: "", tag: "", bump: "" });
});
