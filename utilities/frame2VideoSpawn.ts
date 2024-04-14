import ffmpegPath from "ffmpeg-static";
import { spawn } from "child_process";

import { type Readable } from "stream";

export default function frame2VideoSpawn(
  inputStream: Readable,
  frameRate: number,
  output: string
): Promise<string> {
  return new Promise((resolve, reject) => {
    const inputOptions = [`-r ${frameRate}`];
    const outputOptions = [
      "-vcodec libx264",
      "-b:v 1200k",
      // "-maxrate 1200k",
      // "-minrate 1200k",
      // "-bufsize 3M",
      `-r ${frameRate}`,
      `-preset ultrafast`,
    ];

    const proc = spawn(
      ffmpegPath!,
      [...inputOptions, "-i -", ...outputOptions, output],
      {
        shell: true,
      }
    )
      .on("close", (code) => {
        if (code === 0) {
          resolve(output);
        } else {
          reject(`Rejected with code ${code}`);
        }
      })
      .on("error", (err) => {
        reject(err);
      });

    proc.stdin.on("error", (...args) => {
      console.log("stdin err", args);
    });
    inputStream.pipe(proc.stdin);
  });
}