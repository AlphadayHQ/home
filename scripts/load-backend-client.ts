import { execFileSync } from "node:child_process";
import { appendFileSync } from "node:fs";

const stack = process.env.ORIGIN_STACK;
const output = process.env.GITHUB_ENV;
if (!stack || !output) throw new Error("ORIGIN_STACK and GITHUB_ENV are required");

const arn = execFileSync("aws", [
  "cloudformation", "describe-stacks", "--stack-name", stack,
  "--query", "Stacks[0].Outputs[?OutputKey=='BackendClientSecretArn'].OutputValue | [0]",
  "--output", "text",
], { encoding: "utf8" }).trim();

if (arn && arn !== "None") {
  let data;
  try {
    data = JSON.parse(execFileSync("aws", [
      "secretsmanager", "get-secret-value", "--secret-id", arn,
      "--query", "SecretString", "--output", "text",
    ], { encoding: "utf8" }));
  } catch {
    throw new Error("Unable to load backend client credential JSON");
  }
  if (!data || typeof data !== "object") throw new Error("Invalid backend client credential JSON");
  const entries = ["API_APP_ID", "API_APP_SECRET"].map((key) => {
    const value: unknown = data[key];
    if (typeof value !== "string" || !value || /[\r\n\0]/.test(value)) {
      throw new Error("Invalid backend client credential format");
    }
    return { key, value };
  });
  for (const { value } of entries) {
    console.log(`::add-mask::${value.replace(/%/g, "%25")}`);
  }
  appendFileSync(output, entries.map(({ key, value }) => `${key}=${value}\n`).join(""));
} else {
  console.log("No landing client secret configured; using anonymous API quota handling.");
}
