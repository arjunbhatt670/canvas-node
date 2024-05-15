import { spawn } from 'child_process';
import { ffmpegPath } from 'localPath.js';

export default async function mergeVideos(options: {
  inputVideosTextFile: string;
  outputVideoPath: string;
}) {
  const { inputVideosTextFile, outputVideoPath } = options;

  return new Promise<void>((resolve, reject) => {
    const ffmpegProcess = spawn(ffmpegPath, [
      '-y',
      '-f',
      'concat',
      '-safe',
      '0',
      '-i',
      `${inputVideosTextFile}`,
      '-c',
      'copy',
      outputVideoPath,
    ])
      .on('exit', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Exited with code ${code}`));
        }
      })
      .on('error', (err) => {
        reject(err);
      });

    ffmpegProcess.stdin.on('error', (err) => {
      reject(err);
    });
  });
}
