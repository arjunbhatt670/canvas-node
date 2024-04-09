import ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "ffmpeg-static";
import { print } from "./grains";

import { type Readable, type Writable, type PassThrough } from "stream";

export default function frame2Video(
  inputStream: Readable,
  frameRate: number,
  output?: Writable
): Promise<Writable | PassThrough>;
export default function frame2Video(
  inputStream: Readable,
  frameRate: number,
  output: string
): Promise<string>;
export default function frame2Video(
  inputStream: Readable,
  frameRate: number,
  output?: Writable | string
): Promise<Writable | PassThrough | string> {
  return new Promise((resolve, reject) => {
    const command = ffmpeg();
    ffmpegPath && command.setFfmpegPath(ffmpegPath);
    command
      .input(inputStream)
      .inputFPS(frameRate)
      .videoCodec("libx264")
      .videoBitrate("1200k")
      .fpsOutput(frameRate)
      .on("start", () => {
        print("ffmpeg process started");
      })
      .on("error", (err, stdout, stderr) => {
        reject(err);
        console.error("ffmpeg stderr:", stderr);
      })
      .on("end", () => {
        print("ffmpeg process completed");
        if (typeof output === "string") {
          command.input(output).ffprobe(function (err, metadata) {
            console.log(metadata.format);
          });
          resolve(output);
        }
      });

    if (typeof output === "string") {
      command.output(output).run();
    } else {
      const stream = command
        .addOutputOptions(["-f ismv"])
        .pipe(output, { end: true });
      resolve(stream);
    }
  });
}
