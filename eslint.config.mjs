import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
export default defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([".next/**", "node_modules/**", "docs/**", "next-env.d.ts"]),
  {
    files: [
      "src/app/**/*.{ts,tsx}",
      "src/components/**/*.{ts,tsx}",
      "src/features/**/*.{ts,tsx}",
      "src/client/**/*.{ts,tsx}",
    ],
    ignores: ["src/app/api/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            "@/server/**",
            "**/server/**",
            "pg",
            "drizzle-orm",
            "@/fixtures/**",
          ],
        },
      ],
    },
  },
  {
    files: ["src/contracts/**/*.{ts,tsx}", "src/fixtures/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            "@/server/**",
            "**/server/**",
            "@/client/**",
            "@/components/**",
            "next/*",
            "react",
            "pg",
            "drizzle-orm",
            "node:*",
          ],
        },
      ],
    },
  },
]);
