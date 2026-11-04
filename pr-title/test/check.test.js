import { test } from "node:test";
import assert from "node:assert/strict";
import { checkTitle, splitList } from "../check.js";

test("conventional titles pass", () => {
  for (const t of ["feat: hold to abstain", "fix(vote): dots on the title line", "refactor(db)!: drop a column", "ci: pin actions", "revert: feat: x"]) {
    assert.deepEqual(checkTitle(t), [], t);
  }
});

test("other titles fail, saying why", () => {
  assert.match(checkTitle("Hold to abstain")[0], /isn't a conventional commit/);
  assert.match(checkTitle("feat:no space")[0], /isn't a conventional commit/);
  assert.match(checkTitle("Feat: capital type")[0], /isn't a conventional commit/);
  assert.match(checkTitle("feature: x")[0], /"feature" isn't an allowed type/);
  assert.match(checkTitle("feat(): x")[0], /scope is empty/);
  assert.match(checkTitle("feat: ")[0], /subject after the colon is empty/);
});

test("types, scopes and the subject can be restricted", () => {
  assert.match(checkTitle("docs: x", { types: ["feat", "fix"] })[0], /use one of feat, fix/);
  assert.match(checkTitle("feat: x", { requireScope: true })[0], /scope is required/);
  assert.deepEqual(checkTitle("feat(vote,ui): x", { scopes: ["vote", "ui"] }), []);
  assert.match(checkTitle("feat(db): x", { scopes: ["vote", "ui"] })[0], /isn't an allowed scope/);
  assert.match(checkTitle("feat: Capital", { subjectPattern: "^[a-z]" })[0], /doesn't match/);
});

test("lists split on commas", () => {
  assert.deepEqual(splitList(" feat, fix ,,"), ["feat", "fix"]);
});
