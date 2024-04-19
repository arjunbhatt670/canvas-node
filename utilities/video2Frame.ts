import fs from "fs";
import { spawn } from "child_process";
import path from "path";

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
    const inputOptions = [`-ss ${startTime}`];
    const outputOptions = [
      `-r ${frameRate}`,
      `-vf fps=${frameRate}`,
      `-vf scale=${width ?? -1}:${height ?? -1}`,
      `-vframes ${frameCount}`,
      "-q:v 1",
      // "-q:v 1", //jpeg
      // "-qmin 1", //jpeg
      `-start_number ${frameCountStart ?? 1}`,
      //   "-c:v png",
      //   "-f image2pipe",
    ];

    const proc = spawn(
      "/opt/homebrew/Cellar/ffmpeg/6.1.1_3/bin/ffmpeg",
      [...inputOptions, `-i ${inputVideo}`, ...outputOptions, output],
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

    proc.stdin.on("error", (err) => {
      reject(err);
    });

    proc.stderr.pipe(
      fs.createWriteStream(path.join(__dirname, "videoToFrame.log"))
    );
  });
}

// ffmpeg -encoders | grep videotoolbox
