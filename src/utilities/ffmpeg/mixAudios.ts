import ffmpeg from 'fluent-ffmpeg';
import fs from 'fs';
import { extname } from 'path';

import { ffmpegPath } from 'localPath.js';

/** Mix multiple audios into a single audio. (Parallel merge) */
export default function mixAudios(
  audioPaths: string[],
  options: {
    outputChannels: number;
    outputAudioPath: string;
  },
) {
  const { outputChannels, outputAudioPath } = options;

  return new Promise((resolve, reject) => {
    const stream = fs.createWriteStream(outputAudioPath);
    const ffmpegCommand = ffmpeg();
    ffmpegPath && ffmpegCommand.setFfmpegPath(ffmpegPath);

    ffmpegCommand
      .on('end', () => {
        resolve(stream);
      })
      .on('error', (err) => {
        reject(err);
      });

    audioPaths.forEach((audio) => ffmpegCommand.addInput(audio));

    ffmpegCommand.complexFilter({
      filter: 'amix',
      options: {
        inputs: audioPaths.length,
        duration: 'longest',
      },
    });

    ffmpegCommand.audioChannels(outputChannels);

    ffmpegCommand
      .outputOptions([`-f ${extname(outputAudioPath).slice(1)}`])
      .pipe(stream);
  });
}
