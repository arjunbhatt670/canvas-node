import fs from "fs";
import { spawn } from "child_process";
import path from "path";
import { ffmpegPath } from "#root/path";

export default function video2Frame(
  inputVideo: string,
  output: string,
  inputOptions: {
    startTime: number;
    frameRate: number;
    width: number;
    height: number;
    frameCount: number;
    frameCountStart: number;
  }
) {
  const {
    startTime = 0,
    frameRate,
    width,
    height,
    frameCount,
    frameCountStart,
  } = inputOptions;

  return new Promise<string>((resolve, reject) => {
    const inputOptions = ["-y", "-ss", `${startTime}`];
    const outputOptions = [
      "-r",
      `${frameRate}`,
      "-vf",
      `fps=${frameRate}`,
      "-vf",
      `scale=${width ?? -1}:${height ?? -1}`,
      "-vframes",
      `${frameCount}`,
      // "-q:v", //png
      // "18", //png
      "-q:v", //jpeg
      "1", //jpeg
      "-qmin", //jpeg
      "1", //jpeg
      "-start_number",
      `${frameCountStart ?? 1}`,
      // "-pix_fmt",
      // "yuv420p",
      // "-c:v",
      // "png",
      // "-f",
      // "image2pipe",
      // "-",
      "-benchmark",
    ];

    const proc = spawn(ffmpegPath, [
      ...inputOptions,
      "-i",
      inputVideo,
      ...outputOptions,
      output,
    ])
      .on("close", (code) => {
        if (code === 0) {
          resolve(output);
        } else {
          reject(new Error(`Rejected with code ${code}`));
        }
      })
      .on("error", (err) => {
        reject(err);
      });

    proc.stdin.on("error", (err) => {
      reject(err);
    });

    proc.stderr.pipe(
      fs.createWriteStream(path.join(__dirname, "videoToFrame.log"))
    );
  });
}

// ffmpeg -encoders | grep videotoolbox
