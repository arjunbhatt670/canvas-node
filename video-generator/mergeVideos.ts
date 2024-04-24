import ffmpegPath from "ffmpeg-static";
import fs from "fs";
import { spawn } from "child_process";

import { finalsPath, videoSegmentsPath } from "#root/path";
import {
  TimeTracker,
  getMediaMetaData,
  print,
  writeFileIntoText,
} from "#root/utilities/grains";

async function mergeVideosFfmpeg(videosTextFilePath: string, output: string) {
  const errorFile = `${finalsPath}/merge-errors.txt`;

  console.log("outputoutput", output);

  return new Promise<void>((resolve, reject) => {
    const proc = spawn(
      ffmpegPath!,
      [
        "-y",
        "-f concat",
        "-safe 0",
        `-i ${videosTextFilePath}`,
        "-c copy",
        output,
      ],
      {
        shell: true,
      }
    )
      .on("close", (code, s) => {
        if (code === 0) {
          resolve();
        } else {
          print("closed with code", code);
          print(`Please refer ${errorFile}`);
        }
      })
      .on("error", (err) => {
        reject(err);
      });
    proc.stderr.pipe(fs.createWriteStream(errorFile));
  });
}

const mergeVideos = async (finalVideoPath: string, segmentsPath: string) => {
  const timeTracker = new TimeTracker();

  timeTracker.start();

  const listFilePath = `${finalsPath}/video_segments.txt`;
  writeFileIntoText(segmentsPath, listFilePath);

  await mergeVideosFfmpeg(listFilePath, finalVideoPath);

  if (global.stats) global.stats.mergeVideos = timeTracker.now();
  timeTracker.log("Videos merged");
};

export default mergeVideos;
