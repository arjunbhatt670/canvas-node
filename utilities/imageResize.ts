import fs from "fs";
import { spawn } from "child_process";
import path from "path";
import { ffmpegPath } from "#root/path";

export default function imageResize(
  input: string | Buffer,
  output: string,
  config: {
    width: number;
    height: number;
  }
) {
  const { width, height } = config;

  return new Promise<string>((resolve, reject) => {
    const inputOptions = ["-y"];
    const outputOptions = [
      `-vf scale=${width ?? -1}:${height ?? -1}`,
      "-update true",
    ];

    const proc = spawn(
      ffmpegPath,
      [
        ...inputOptions,
        `-i ${typeof input === "string" ? input : "-"}`,
        ...outputOptions,
        output,
      ],
      {
        shell: true,
      }
    )
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

    if (typeof input !== "string") {
      proc.stdin.write(input);
      proc.stdin.end();
    }
    proc.stdin.on("error", (err) => {
      reject(err);
    });
    proc.stderr.pipe(
      fs.createWriteStream(path.join(__dirname, "imageResize.log"))
    );
  });
}
