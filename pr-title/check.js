// Pull request title rules: a conventional commit subject, since a squash
// merge makes the title the commit that auto-semver reads. Pure: no I/O.

export const DEFAULT_TYPES = ["feat", "fix", "docs", "style", "refactor", "perf", "test", "build", "ci", "chore", "revert"];

// A space after the colon, unless nothing follows (then the subject is
// empty, which is reported as such).
const TITLE = /^([a-z]+)(?:\(([^)]*)\))?(!)?:(?: (.*)|)$/;

/** The problems with a title, as sentences; empty when it's fine. */
export function checkTitle(title, { types = DEFAULT_TYPES, scopes = [], requireScope = false, subjectPattern = "" } = {}) {
  const t = title.trim();
  const m = TITLE.exec(t);
  if (!m) {
    return [`"${t}" isn't a conventional commit: write type(scope): subject, e.g. "feat: hold to abstain" or "fix(vote)!: dots move".`];
  }
  const [, type, scope, , subject = ""] = m;
  const problems = [];
  if (!types.includes(type)) problems.push(`"${type}" isn't an allowed type: use one of ${types.join(", ")}.`);
  if (scope !== undefined && scope.trim() === "") problems.push("The scope is empty: drop the brackets or name a scope.");
  if (requireScope && !scope) problems.push("A scope is required, e.g. feat(vote): ...");
  if (scope && scopes.length && !scope.split(",").every((s) => scopes.includes(s.trim()))) {
    problems.push(`"${scope}" isn't an allowed scope: use one of ${scopes.join(", ")}.`);
  }
  if (!subject.trim()) problems.push("The subject after the colon is empty.");
  else if (subjectPattern && !new RegExp(subjectPattern).test(subject)) {
    problems.push(`The subject "${subject}" doesn't match ${subjectPattern}.`);
  }
  return problems;
}

/** Splits a comma-separated list, dropping blanks. */
export function splitList(s) {
  return s.split(",").map((x) => x.trim()).filter(Boolean);
}
