// The action's entry point: reads the inputs and environment GitHub
// provides, and writes the outputs. No dependencies, so nothing to bundle.
import { input, restClient, setOutputs } from "../shared/rest.js";
import { nextRelease } from "./run.js";

try {
  const token = input("token", process.env.GITHUB_TOKEN ?? "");
  if (!token) throw new Error("no token: pass the token input or set GITHUB_TOKEN");
  const repo = process.env.GITHUB_REPOSITORY;
  const head = process.env.GITHUB_SHA;
  if (!repo || !head) throw new Error("GITHUB_REPOSITORY and GITHUB_SHA must be set");

  const request = restClient({ token, apiUrl: process.env.GITHUB_API_URL || undefined });
  await setOutputs(await nextRelease({ request, repo, head, log: console.log }));
} catch (err) {
  console.log(`::error::${err.message}`);
  process.exitCode = 1;
}
