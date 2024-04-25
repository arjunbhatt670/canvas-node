import { spawn } from "child_process";
import { type Page } from "puppeteer";

import { rootPath } from "#root/path";
import saveTextClipAssets from "./saveTextClipAssets";

export default async function spawnCluster(
  config: Media,
  finalPath: string,
  puppeteerPage: Page
) {
  saveTextClipAssets(config, puppeteerPage);

  return new Promise<void>((resolve, reject) => {
    spawn(
      `NODE_OPTIONS=\"-r ts-node/register --no-warnings\" node ${rootPath}/video-generator/spawnClusterRun.ts`,
      [],
      {
        shell: true,
        stdio: ["inherit", "inherit", "inherit", "ipc"],
        env: {
          CONFIG: JSON.stringify(config),
          FINAL_PATH: finalPath,
          PATH: process.env.PATH,
          STATS: JSON.stringify(global.stats),
        },
      }
    )
      .on("close", (code, signal) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Rejected with code ${code} and signal ${signal}`));
        }
      })
      .on("error", (err) => {
        reject(err);
      })
      .on("message", (stats: Stats) => {
        global.stats = stats;
      });
  });
}
