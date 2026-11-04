// The action's entry point: checks the pull request's title from the event
// GitHub passes in. No API calls, no checkout, no dependencies.
import { readFileSync } from "node:fs";
import { input } from "../shared/rest.js";
import { DEFAULT_TYPES, checkTitle, splitList } from "./check.js";

try {
  let title = input("title");
  if (!title && process.env.GITHUB_EVENT_PATH) {
    const event = JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH, "utf8"));
    title = event.pull_request?.title ?? "";
  }
  if (!title) throw new Error("no pull request title: run this on pull_request events, or pass title");

  const types = splitList(input("types"));
  const problems = checkTitle(title, {
    types: types.length ? types : DEFAULT_TYPES,
    scopes: splitList(input("scopes")),
    requireScope: input("require-scope") === "true",
    subjectPattern: input("subject-pattern"),
  });
  if (problems.length) {
    for (const p of problems) console.log(`::error title=Pull request title::${p}`);
    process.exitCode = 1;
  } else {
    console.log(`"${title}" is a conventional commit title`);
  }
} catch (err) {
  console.log(`::error::${err.message}`);
  process.exitCode = 1;
}
