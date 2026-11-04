// The action's entry point. No dependencies, so nothing to bundle.
import { input, restClient, setOutputs } from "../shared/rest.js";
import { publishRelease } from "./run.js";
import { resolveAssets } from "./assets.js";

try {
  const token = input("token", process.env.GITHUB_TOKEN ?? "");
  if (!token) throw new Error("no token: pass the token input or set GITHUB_TOKEN");
  const repo = process.env.GITHUB_REPOSITORY;
  if (!repo) throw new Error("GITHUB_REPOSITORY must be set");
  const tag = input("tag");
  if (!tag) throw new Error("the tag input is required");

  const request = restClient({ token, apiUrl: process.env.GITHUB_API_URL || undefined });
  const spec = input("assets");
  const { url } = await publishRelease({
    request,
    repo,
    tag,
    serverUrl: process.env.GITHUB_SERVER_URL || undefined,
    assets: spec ? await resolveAssets(spec) : [],
    checksums: input("checksums", "true") === "true",
    footer: process.env["INPUT_NOTES-FOOTER"] ?? "",
    log: console.log,
  });
  await setOutputs({ url });
} catch (err) {
  console.log(`::error::${err.message}`);
  process.exitCode = 1;
}
