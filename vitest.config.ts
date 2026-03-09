import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: {
    watch: false,
    globals: true,
    fileParallelism: false,
    globalSetup: "./test/global-setup.ts",
    env: {
      DATABASE_URL: "postgresql://postgres:postgres@localhost:5433/test?schema=public",
    },
  },
});
