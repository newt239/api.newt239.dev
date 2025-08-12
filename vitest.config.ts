import fs from "node:fs";
import path from "node:path";

import {
  defineWorkersProject,
  readD1Migrations,
} from "@cloudflare/vitest-pool-workers/config";

export default defineWorkersProject(async () => {
  const migrationsPath = path.join(__dirname, "db");
  const migrations = await readD1Migrations(migrationsPath);

  // .env.dev から環境変数を無理やり読み込む
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
    test: {
      setupFiles: ["./src/test/apply-migrations.ts"],
      globals: true,
      includeTaskLocation: true,
      poolOptions: {
        wrangler: {
          configPath: "./wrangler.toml",
        },
        workers: {
          singleWorker: true,
          isolatedStorage: false,
          miniflare: {
            compatibilityFlags: ["nodejs_compat"],
            compatibilityDate: "2024-04-01",
            d1Databases: ["DB"],
            bindings: {
              TEST_MIGRATIONS: migrations,
              ...envVars,
            },
          },
        },
      },
    },
    resolve: {
      alias: {
        "~": path.resolve(__dirname, "./src"),
      },
    },
  };
});
