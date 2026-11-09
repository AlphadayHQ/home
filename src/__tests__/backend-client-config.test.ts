import { execFile } from "node:child_process";
import { mkdtemp, chmod, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { delimiter, join, resolve } from "node:path";
import { promisify } from "node:util";
import { expect, it } from "vitest";

const execute = promisify(execFile);
const script = resolve("scripts/load-backend-client.ts");

async function load(secret: string, arn = "arn:aws:secretsmanager:eu-west-1:402248308880:secret:test") {
  const dir = await mkdtemp(join(tmpdir(), "landing-client-config-"));
  const output = join(dir, "github-env");
  try {
    await writeFile(output, "");
    await writeFile(join(dir, "aws"), '#!/bin/sh\nif [ "$1" = cloudformation ]; then printf "%s" "$TEST_SECRET_ARN"; else printf "%s" "$TEST_SECRET_JSON"; fi\n');
    await chmod(join(dir, "aws"), 0o700);
    try {
      const { stdout } = await execute(process.execPath, [script], {
        env: {
          PATH: `${dir}${delimiter}${process.env.PATH}`,
          ORIGIN_STACK: "test-landing-origin",
          GITHUB_ENV: output,
          TEST_SECRET_JSON: secret,
          TEST_SECRET_ARN: arn,
        },
      });
      return { ok: true, log: stdout, env: await readFile(output, "utf8") };
    } catch (error) {
      return { ok: false, log: String(error), env: await readFile(output, "utf8") };
    }
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

it("masks and loads both server variables from the origin's secret", async () => {
  const result = await load(JSON.stringify({ API_APP_ID: "dummy-app", API_APP_SECRET: "dummy-secret" }));
  expect(result.ok).toBe(true);
  expect(result.env).toBe("API_APP_ID=dummy-app\nAPI_APP_SECRET=dummy-secret\n");
  expect(result.log).toContain("::add-mask::dummy-app");
  expect(result.log).toContain("::add-mask::dummy-secret");
});

it.each([
  '{"API_APP_ID":"dummy-app"}',
  '{"API_APP_ID":"dummy-app","API_APP_SECRET":"bad\\nline"}',
  "invalid-dummy-secret-content",
])("rejects invalid credential JSON without publishing partial values", async (secret) => {
  const result = await load(secret);
  expect(result.ok).toBe(false);
  expect(result.env).toBe("");
  expect(result.log).not.toContain(secret);
});

it("allows an origin without configured credentials to use quota-aware anonymous reads", async () => {
  const result = await load("not used", "None");
  expect(result.ok).toBe(true);
  expect(result.env).toBe("");
  expect(result.log).toContain("anonymous API quota handling");
});
