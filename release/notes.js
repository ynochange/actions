// Release notes from conventional commits. Pure: no I/O.
import { Bump, bumpFromCommit } from "../shared/semver.js";

const SUBJECT = /^([a-z]+)(?:\(([^)]+)\))?(!)?:\s*(.*)$/;

const SECTIONS = [
  ["breaking", "Breaking changes"],
  ["feat", "Features"],
  ["fix", "Fixes"],
  ["other", "Other changes"],
];

/** One commit as a note line: the subject without its type, the scope in
 * bold, and the short SHA, which GitHub links. */
export function noteLine({ sha, message }) {
  const subject = message.split("\n")[0].trim();
  const m = SUBJECT.exec(subject);
  const text = m ? (m[2] ? `**${m[2]}:** ${m[4]}` : m[4]) : subject;
  return `- ${text} (${sha.slice(0, 7)})`;
}

/** Which section a commit belongs in. */
export function sectionOf({ message }) {
  if (bumpFromCommit(message) === Bump.MAJOR) return "breaking";
  const m = SUBJECT.exec(message.split("\n")[0].trim());
  if (m && (m[1] === "feat" || m[1] === "fix")) return m[1];
  return "other";
}

/** The downloads as a table: each file, linked, with its SHA-256. */
export function downloadsTable({ downloads, tag, repo, serverUrl = "https://github.com" }) {
  const rows = downloads.map((d) => `| [${d.name}](${serverUrl}/${repo}/releases/download/${tag}/${encodeURIComponent(d.name)}) | \`${d.sha256}\` |`);
  return `## Downloads\n\n| File | SHA-256 |\n|---|---|\n${rows.join("\n")}\n\nCheck one with \`sha256sum -c SHA256SUMS --ignore-missing\`.`;
}

/** The notes for a release: commits grouped by kind, oldest first within a
 * group; then the downloads with their checksums, and any footer; then a
 * compare link when there's a previous release. */
export function renderNotes({ commits, previous, tag, repo, serverUrl = "https://github.com", truncated = false, downloads = [], footer = "" }) {
  const groups = Object.fromEntries(SECTIONS.map(([k]) => [k, []]));
  for (const c of commits) groups[sectionOf(c)].push(noteLine(c));
  const parts = [];
  for (const [key, title] of SECTIONS) {
    if (groups[key].length) parts.push(`## ${title}\n\n${groups[key].join("\n")}`);
  }
  if (parts.length === 0) parts.push("No changes.");
  if (truncated) parts.push(`Only the newest ${commits.length} commits are listed.`);
  if (downloads.length) parts.push(downloadsTable({ downloads, tag, repo, serverUrl }));
  if (footer.trim()) parts.push(footer.trim());
  if (previous) parts.push(`**Full changes:** ${serverUrl}/${repo}/compare/${previous}...${tag}`);
  return parts.join("\n\n") + "\n";
}
