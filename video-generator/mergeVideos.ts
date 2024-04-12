import ffmpegPath from "ffmpeg-static";
import fs from "fs";
import { exec, spawn } from "child_process";

import { finalsPath, videoSegmentsPath } from "#root/path";
import {
  TimeTracker,
  getMediaMetaData,
  print,
  writeFileIntoText,
} from "#root/utilities/grains";

export default async function mergeVideos(
  videosTextFilePath: string,
  output: string
) {
  const timeTracker = new TimeTracker();
  const errorFile = `${finalsPath}/merge-errors.txt`;

  return new Promise<void>((resolve, reject) => {
    const proc = spawn(
      ffmpegPath!,
      ["-f concat", "-safe 0", `-i ${videosTextFilePath}`, "-c copy", output],
      {
        shell: true,
      }
    )
      .on("close", (code, s) => {
        if (code === 0) {
          timeTracker.log("Videos merged");
          resolve();
        }
        console.log("closed with code", code);
        console.log(`Please refer ${errorFile}`);
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

(async () => {
  const listFilePath = `${finalsPath}/video_segments.txt`;
  const finalVideoPath =
    process.env.OUTPUT ?? `${finalsPath}/output_pixi_final1.mp4`;

  if (fs.existsSync(finalVideoPath)) {
    fs.rmSync(finalVideoPath);
  }

  writeFileIntoText(videoSegmentsPath, "mp4", listFilePath);

  await mergeVideos(listFilePath, finalVideoPath);

  const meta = await getMediaMetaData(finalVideoPath);

  console.log(meta);
})();
