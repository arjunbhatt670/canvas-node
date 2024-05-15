import ffmpeg from 'fluent-ffmpeg';
import { type PassThrough } from 'stream';

import { ffmpegPath } from 'localPath.js';

export default function mergeAudioAndVideo(
  audio: string,
  video: string,
  output?: PassThrough,
): Promise<PassThrough>;
export default function mergeAudioAndVideo(
  audio: string,
  video: string,
  output: string,
): Promise<string>;
export default function mergeAudioAndVideo(
  audio: string,
  video: string,
  output?: PassThrough | string,
): Promise<PassThrough | string> {
  return new Promise((resolve, reject) => {
    const ffmpegCommand = ffmpeg();
    ffmpegCommand.setFfmpegPath(ffmpegPath);

    ffmpegCommand
      .input(video)
      .input(audio)
      .inputOptions(['-y'])
      .outputOptions(['-c:v copy', '-map 0:v:0', '-map 1:a:0', '-shortest'])
      .on('error', (err) => {
        reject(err);
      });

    if (typeof output === 'string') {
      ffmpegCommand
        .output(output)
        .on('end', () => {
          resolve(output);
        })
        .run();
    } else {
      const stream = ffmpegCommand
        .addOutputOptions(['-f ismv'])
        .pipe(output, { end: true }) as PassThrough;
      resolve(stream);
    }
  });
}
