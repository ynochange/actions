import { test } from "node:test";
import assert from "node:assert/strict";
import { Bump, applyBump, bumpFromCommit, computeBump, parseTag } from "../semver.js";

test("conventional commit types set the bump", () => {
  assert.equal(bumpFromCommit("feat: hold to abstain"), Bump.MINOR);
  assert.equal(bumpFromCommit("feat(vote): hold to abstain"), Bump.MINOR);
  assert.equal(bumpFromCommit("fix: group dots on the title line"), Bump.PATCH);
  assert.equal(bumpFromCommit("Rename yweno to ynochange"), Bump.PATCH);
  assert.equal(bumpFromCommit("feat!: new protocol"), Bump.MAJOR);
  assert.equal(bumpFromCommit("refactor(db)!: drop table"), Bump.MAJOR);
});

test("a BREAKING CHANGE footer anywhere in the message is breaking", () => {
  assert.equal(bumpFromCommit("feat: x\n\nBody.\n\nBREAKING CHANGE: settings renamed"), Bump.MAJOR);
  assert.equal(bumpFromCommit("fix: x\n\n  BREAKING-CHANGE: y"), Bump.MAJOR);
  // Prose that merely mentions it isn't.
  assert.equal(bumpFromCommit("fix: x\n\nthis is not a breaking change: honest"), Bump.PATCH);
});

test("the biggest bump wins, and there's always at least a patch", () => {
  assert.equal(computeBump([]), Bump.PATCH);
  assert.equal(computeBump(["fix: a", "feat: b", "chore: c"]), Bump.MINOR);
  assert.equal(computeBump(["feat: b", "fix!: c"]), Bump.MAJOR);
});

test("before 1.0.0 a breaking change bumps the minor", () => {
  assert.deepEqual(applyBump({ major: 0, minor: 4, patch: 7 }, Bump.MAJOR), { major: 0, minor: 5, patch: 0 });
  assert.deepEqual(applyBump({ major: 1, minor: 4, patch: 7 }, Bump.MAJOR), { major: 2, minor: 0, patch: 0 });
  assert.deepEqual(applyBump({ major: 0, minor: 4, patch: 7 }, Bump.MINOR), { major: 0, minor: 5, patch: 0 });
  assert.deepEqual(applyBump({ major: 0, minor: 4, patch: 7 }, Bump.PATCH), { major: 0, minor: 4, patch: 8 });
});

test("only plain vX.Y.Z tags are releases", () => {
  assert.deepEqual(parseTag("v0.10.2"), { major: 0, minor: 10, patch: 2 });
  for (const t of ["0.1.0", "v1.2", "v1.2.3-rc.1", "v1.2.3.4", "release"]) assert.equal(parseTag(t), null);
});
