// The action's entry point: reads the inputs and environment GitHub
// provides, and writes the outputs. No dependencies, so nothing to bundle.
import { appendFileSync } from "node:fs";
import { restClient } from "./github.js";
import { nextRelease } from "./run.js";

function input(name, fallback = "") {
  return (process.env[`INPUT_${name.toUpperCase()}`] ?? "").trim() || fallback;
}

try {
  const token = input("token", process.env.GITHUB_TOKEN ?? "");
  if (!token) throw new Error("no token: pass the token input or set GITHUB_TOKEN");
  const repo = process.env.GITHUB_REPOSITORY;
  const head = process.env.GITHUB_SHA;
  if (!repo || !head) throw new Error("GITHUB_REPOSITORY and GITHUB_SHA must be set");

  const request = restClient({ token, apiUrl: process.env.GITHUB_API_URL || undefined });
  const out = await nextRelease({ request, repo, head, log: console.log });

  const lines = Object.entries(out).map(([k, v]) => `${k}=${v}\n`).join("");
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, lines);
  else process.stdout.write(lines);
} catch (err) {
  console.log(`::error::${err.message}`);
  process.exitCode = 1;
}
