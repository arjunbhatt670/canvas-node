import ffmpegPath from "ffmpeg-static";
import { spawn } from "child_process";
import fs from "fs";

import { type Readable } from "stream";
import { tmpDir } from "#root/path";
import { TimeTracker } from "./grains";

export default function frame2VideoSpawn(
  inputStream: Readable,
  frameRate: number,
  output: string
): Promise<string> {
  const timeTracker = new TimeTracker();
  return new Promise((resolve, reject) => {
    const inputOptions = [
      "-y",
      `-r ${frameRate}`,
      // "-c:v mjpeg",
      // "-f image2",
    ];
    const outputOptions = [
      "-c:v h264_videotoolbox", // for mac
      // "-vcodec libx264", // for all use
      "-b:v 1200k", // Target bit rate
      // "-maxrate 1200k",
      // "-minrate 1200k",
      // "-bufsize 3M",
      `-r ${frameRate}`,
      `-preset ultrafast`,
      "-pix_fmt yuv420p",
      "-benchmark",
      // "-stats (global)",
      "-q:v 50", // Variable bit rate
      // "-crf 15",
    ];

    const proc = spawn(
      "/opt/homebrew/Cellar/ffmpeg/6.1.1_3/bin/ffmpeg",
      [
        ...inputOptions,
        "-i -",
        // `-i ${tmpDir}/pixiFrames/frame_%d.jpeg`,
        ...outputOptions,
        output,
      ],
      {
        shell: true,
      }
    )
      .on("close", (code) => {
        if (code === 0) {
          timeTracker.log("frame2Video took");
          resolve(output);
        } else {
          reject(`Rejected with code ${code}`);
        }
      })
      .on("error", (err) => {
        reject(err);
      })
      .on("spawn", () => {
        timeTracker.start();
      });

    proc.stdin.on("error", (...args) => {
      console.log(args);
    });
    proc.stderr.pipe(fs.createWriteStream("ffmpeg.log"));

    inputStream.pipe(proc.stdin);
  });
}
