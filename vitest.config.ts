import { cloudflareTest, readD1Migrations } from "@cloudflare/vitest-pool-workers";
import fs from "node:fs";
import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig(async () => {
  const migrationsPath = path.join(__dirname, "db");
  const migrations = await readD1Migrations(migrationsPath);

  const devVarsPath = path.join(__dirname, ".dev.vars");
  const envVars: Record<string, string> = {};

  if (fs.existsSync(devVarsPath)) {
    const content = fs.readFileSync(devVarsPath, "utf-8");
    const lines = content.split("\n");
    for (const line of lines) {
      if (line.trim() && !line.startsWith("#")) {
        const [key, value] = line.split("=");
        if (key && value) {
          envVars[key] = value.replace(/"/g, "");
        }
      }
    }
  }

  return {
    plugins: [
      cloudflareTest({
        wrangler: {
          configPath: "./wrangler.toml",
        },
        miniflare: {
          compatibilityFlags: ["nodejs_compat"],
          compatibilityDate: "2024-09-23",
          d1Databases: ["DB"],
          bindings: {
            TEST_MIGRATIONS: migrations,
            ...envVars,
          },
        },
      }),
    ],
    test: {
      setupFiles: ["./src/tests/apply-migrations.ts"],
      globals: true,
      includeTaskLocation: true,
    },
    resolve: {
      alias: {
        "~": path.resolve(__dirname, "./src"),
      },
    },
  };
});
