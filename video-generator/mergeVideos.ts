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
  const timeTracker = new TimeTracker();
  const errorFile = `${finalsPath}/merge-errors.txt`;

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
          timeTracker.log("Videos merged");
          resolve();
        } else {
          print("closed with code", code);
          print(`Please refer ${errorFile}`);
        }
      })
      .on("error", (err) => {
        print(err);
        reject(err);
      })
      .on("spawn", () => {
        timeTracker.start();
      });
    proc.stderr.pipe(fs.createWriteStream(errorFile));
  });
}

const mergeVideos = async (finalVideoPath: string) => {
  const listFilePath = `${finalsPath}/video_segments.txt`;
  writeFileIntoText(videoSegmentsPath, listFilePath);

  await mergeVideosFfmpeg(listFilePath, finalVideoPath);

  const meta = await getMediaMetaData(finalVideoPath);

  console.log(meta);
};

export default mergeVideos;
