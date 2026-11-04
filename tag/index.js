// The action's entry point. No dependencies, so nothing to bundle.
import { input, restClient, setOutputs } from "../shared/rest.js";
import { splitTags, tagCommit } from "./tag.js";

try {
  const token = input("token", process.env.GITHUB_TOKEN ?? "");
  if (!token) throw new Error("no token: pass the token input or set GITHUB_TOKEN");
  const repo = process.env.GITHUB_REPOSITORY;
  const sha = input("sha", process.env.GITHUB_SHA ?? "");
  if (!repo || !sha) throw new Error("GITHUB_REPOSITORY and GITHUB_SHA must be set");

  const request = restClient({ token, apiUrl: process.env.GITHUB_API_URL || undefined });
  const { created, skipped } = await tagCommit({
    request,
    repo,
    sha,
    tags: splitTags(input("tags")),
    floatingTags: splitTags(input("floating-tags")),
    continueIfExists: input("continue-if-exists") === "true",
    ignoreNoOp: input("ignore-no-op") === "true",
    log: console.log,
  });
  await setOutputs({ created: created.join(","), skipped: skipped.join(",") });
} catch (err) {
  console.log(`::error::${err.message}`);
  process.exitCode = 1;
}
