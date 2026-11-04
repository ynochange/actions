import { test } from "node:test";
import assert from "node:assert/strict";
import { splitTags, tagCommit } from "../tag.js";

const REPO = "o/r";

// A fake refs API over a map of tag to sha.
function fakeRefs(refs = {}) {
  const calls = [];
  const request = async (path, { method = "GET", body } = {}) => {
    calls.push(`${method} ${path}`);
    const p = path.replace(`/repos/${REPO}`, "");
    if (method === "POST" && p === "/git/refs") {
      const tag = body.ref.replace("refs/tags/", "");
      if (refs[tag]) return { status: 422, json: null };
      refs[tag] = body.sha;
      return { status: 201, json: {} };
    }
    let m;
    if ((m = /^\/git\/refs\/tags\/(.+)$/.exec(p)) && method === "PATCH") {
      const tag = decodeURIComponent(m[1]);
      if (!refs[tag]) return { status: 422, json: null };
      refs[tag] = body.sha;
      return { status: 200, json: {} };
    }
    if ((m = /^\/git\/ref\/tags\/(.+)$/.exec(p))) {
      const sha = refs[decodeURIComponent(m[1])];
      return sha ? { status: 200, json: { object: { sha } } } : { status: 404, json: null };
    }
    throw new Error(`unexpected ${method} ${path}`);
  };
  return { request, refs, calls };
}

test("splits tag lists", () => {
  assert.deepEqual(splitTags(" v1.2.3, 1.2.3,,v1.2.3 "), ["v1.2.3", "1.2.3"]);
  assert.deepEqual(splitTags(""), []);
});

test("creates tags and moves floating ones", async () => {
  const { request, refs } = fakeRefs({ v0: "old" });
  const out = await tagCommit({ request, repo: REPO, sha: "abc", tags: ["v0.2.0"], floatingTags: ["v0", "v0.2"] });
  assert.deepEqual(out, { created: ["v0.2.0", "v0", "v0.2"], skipped: [] });
  assert.deepEqual(refs, { v0: "abc", "v0.2.0": "abc", "v0.2": "abc" });
});

test("an existing tag fails, unless it's already here and that's allowed", async () => {
  await assert.rejects(tagCommit({ request: fakeRefs({ "v0.2.0": "abc" }).request, repo: REPO, sha: "abc", tags: ["v0.2.0"] }), /already exists/);
  const out = await tagCommit({ request: fakeRefs({ "v0.2.0": "abc" }).request, repo: REPO, sha: "abc", tags: ["v0.2.0"], continueIfExists: true });
  assert.deepEqual(out, { created: [], skipped: ["v0.2.0"] });
  await assert.rejects(
    tagCommit({ request: fakeRefs({ "v0.2.0": "zzz" }).request, repo: REPO, sha: "abc", tags: ["v0.2.0"], continueIfExists: true }),
    /at zzz, not abc/,
  );
});

test("no tags at all fails unless allowed", async () => {
  await assert.rejects(tagCommit({ request: fakeRefs().request, repo: REPO, sha: "abc", tags: [] }), /no tags given/);
  assert.deepEqual(await tagCommit({ request: fakeRefs().request, repo: REPO, sha: "abc", tags: [], ignoreNoOp: true }), { created: [], skipped: [] });
});
