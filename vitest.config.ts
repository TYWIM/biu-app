import react from "@vitejs/plugin-react";
import path from "node:path";
import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: [path.resolve(__dirname, "tests/setup.ts")],
    exclude: [...configDefaults.exclude, "e2e/**"],
    restoreMocks: true,
    mockReset: true,
    clearMocks: true,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      "@shared": path.resolve(__dirname, "shared"),
    },
  },
});
