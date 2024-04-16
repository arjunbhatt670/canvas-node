import ffmpegPath from "ffmpeg-static";
import { spawn } from "child_process";

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
      "-q:v 100",
      // "-q:v 1", //jpeg
      // "-qmin 1", //jpeg
      `-start_number ${frameCountStart ?? 1}`,
      //   "-c:v png",
      //   "-f image2pipe",
    ];

    const proc = spawn(
      ffmpegPath!,
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

    process.stdin.on("error", (err) => {
      reject(err);
    });
  });
}
