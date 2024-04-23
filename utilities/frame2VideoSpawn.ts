import { spawn } from "child_process";
import fs from "fs";

import { type Readable } from "stream";
import { ffmpegPath, tmpDir } from "#root/path";
import { TimeTracker, print } from "./grains";

export default function frame2VideoSpawn(
  inputStream: Readable,
  frameRate: number,
  output: string
): Promise<string> {
  const timeTracker = new TimeTracker();
  return new Promise((resolve, reject) => {
    const inputOptions = ["-y", `-r ${frameRate}`];
    const outputOptions = [
      "-c:v h264_videotoolbox", // for mac
      // "-c:v libx264", // for all use
      "-b:v 1200k", // Target bit rate
      // "-maxrate 1200k",
      // "-minrate 1200k",
      // "-bufsize 3M",
      `-r ${frameRate}`,
      `-preset ultrafast`,
      "-pix_fmt yuv420p",
      "-benchmark",
      "-q:v 65", // Variable bit rate (for codec videotoolbox)
      // "-crf 15", // Constant rate factor (for codec libx264)
    ];

    const proc = spawn(
      ffmpegPath,
      [...inputOptions, "-i -", ...outputOptions, output],
      {
        shell: true,
      }
    )
      .on("close", (code) => {
        if (code === 0) {
          if (global.stats) {
            global.stats.ffmpeg =
              timeTracker.now() -
              global.stats.drawCanvas -
              global.stats.extractCanvas -
              global.stats.streamed;

            print("frame2Video took extra time of", global.stats.ffmpeg, "ms");
          }
          resolve(output);
        } else {
          reject(new Error(`Rejected with code ${code}`));
        }
      })
      .on("error", reject)
      .on("spawn", () => {
        timeTracker.start();
      });

    proc.stdin.on("error", (err) => {
      reject(err);
    });
    proc.stderr.pipe(fs.createWriteStream("ffmpeg.log"));

    inputStream.pipe(proc.stdin);
  });
}
