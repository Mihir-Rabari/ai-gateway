import { describe, it } from "node:test";
import assert from "node:assert";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const packageRoot = path.resolve(__dirname, "..");
const packageJson = JSON.parse(readFileSync(path.join(packageRoot, "package.json"), "utf8")) as {
  main?: string;
  module?: string;
  exports?: Record<string, { import?: string; require?: string; types?: string }>;
};

describe("sdk package metadata", () => {
  it("points main/module/exports at files that exist", () => {
    const targets = [
      packageJson.main,
      packageJson.module,
      packageJson.exports?.["."]?.import,
      packageJson.exports?.["."]?.require,
      packageJson.exports?.["."]?.types,
      packageJson.exports?.["./widget"]?.import,
      packageJson.exports?.["./widget"]?.types,
    ].filter((value): value is string => Boolean(value));

    for (const target of targets) {
      const resolved = path.join(packageRoot, target);
      assert.equal(
        existsSync(resolved),
        true,
        `Expected package target "${target}" to exist at ${resolved}`,
      );
    }
  });
});
