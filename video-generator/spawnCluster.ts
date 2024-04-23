import { spawn } from "child_process";

import { rootPath } from "#root/path";

export default function spawnCluster(config: Media, finalPath: string) {
  return new Promise<void>((resolve, reject) => {
    spawn(`ts-node ${rootPath}/video-generator/spawnClusterRun.ts`, [], {
      shell: true,
      stdio: ["inherit", "inherit", "inherit", "ipc"],
      env: {
        CONFIG: JSON.stringify(config),
        FINAL_PATH: finalPath,
        PATH: process.env.PATH,
        STATS: JSON.stringify(global.stats),
      },
    })
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
