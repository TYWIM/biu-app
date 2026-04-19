import { logger, type RsbuildPlugin } from "@rsbuild/core";
import { rimrafSync } from "rimraf";

import { buildElectronConfig } from "./electron-config-build";

let electronRuntimeAvailablePromise: Promise<boolean> | null = null;

const isElectronRuntimeAvailable = async () => {
  if (!electronRuntimeAvailablePromise) {
    electronRuntimeAvailablePromise = import("electron")
      .then(() => true)
      .catch(err => {
        logger.warn(`Electron runtime unavailable, skipping Electron integration: ${String((err && (err as any).message) || err)}`);
        return false;
      });
  }

  return electronRuntimeAvailablePromise;
};

export const pluginElectron = (): RsbuildPlugin => ({
  name: "plugin-electron",
  setup(api) {
    api.onAfterDevCompile(async ({ isFirstCompile }) => {
      if (isFirstCompile) {
        logger.info("[electron] Bundle the typescript configuration for electron...");
        await buildElectronConfig("development");

        if (await isElectronRuntimeAvailable()) {
          const { startElectronDev } = await import("./electron-dev");
          startElectronDev();
        }
      }
    });

    api.onBeforeBuild(async () => {
      logger.info("Cleaning dist directory...");
      try {
        rimrafSync("dist");
      } catch (err) {
        logger.error(`Clean dist failed: ${String((err && (err as any).message) || err)}`);
      }

      logger.info("[electron] Bundling Electron TypeScript...");
      await buildElectronConfig();
    });

    api.onAfterBuild(async () => {
      if (await isElectronRuntimeAvailable()) {
        const { buildElectron } = await import("./electron-build");
        await buildElectron();
      }
    });
  },
});
