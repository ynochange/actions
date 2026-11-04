// Semver and conventional-commit rules. Pure: no I/O.

export const Bump = Object.freeze({ NONE: 0, PATCH: 1, MINOR: 2, MAJOR: 3 });

const BREAKING_SUBJECT = /^[a-z]+(\([^)]+\))?!:/;
// Uppercase with a colon, as the spec says: anything looser catches prose
// like "breaking change." wrapped to the start of a line.
const BREAKING_FOOTER = /^BREAKING[- ]CHANGE:/;
const TYPED_SUBJECT = /^([a-z]+)(\([^)]+\))?:/;
const RELEASE_TAG = /^v(\d+)\.(\d+)\.(\d+)$/;

/** How far one commit moves the version. The whole message counts, so a
 * BREAKING CHANGE footer in a squash merge's body is seen. */
export function bumpFromCommit(message) {
  const lines = message.split("\n");
  const subject = lines[0].trim();
  if (BREAKING_SUBJECT.test(subject)) return Bump.MAJOR;
  if (lines.some((l) => BREAKING_FOOTER.test(l.trim()))) return Bump.MAJOR;
  const m = subject.match(TYPED_SUBJECT);
  return m && m[1] === "feat" ? Bump.MINOR : Bump.PATCH;
}

/** The biggest bump among the messages; at least a patch. */
export function computeBump(messages) {
  let bump = Bump.PATCH;
  for (const m of messages) bump = Math.max(bump, bumpFromCommit(m));
  return bump;
}

export function bumpName(bump) {
  return Object.keys(Bump).find((k) => Bump[k] === bump).toLowerCase();
}

/** A release tag is exactly vX.Y.Z, with no pre-release. */
export function parseTag(name) {
  const m = RELEASE_TAG.exec(name);
  return m ? { major: +m[1], minor: +m[2], patch: +m[3] } : null;
}

export function compareVersions(a, b) {
  return a.major - b.major || a.minor - b.minor || a.patch - b.patch;
}

/** Before 1.0.0 a breaking change bumps the minor: going to 1.0.0 is a
 * release commitment, which no commit can make. */
export function applyBump(v, bump) {
  if (bump === Bump.MAJOR && v.major === 0) return { major: 0, minor: v.minor + 1, patch: 0 };
  if (bump === Bump.MAJOR) return { major: v.major + 1, minor: 0, patch: 0 };
  if (bump === Bump.MINOR) return { major: v.major, minor: v.minor + 1, patch: 0 };
  return { major: v.major, minor: v.minor, patch: v.patch + 1 };
}

export function versionString(v) {
  return `${v.major}.${v.minor}.${v.patch}`;
}
