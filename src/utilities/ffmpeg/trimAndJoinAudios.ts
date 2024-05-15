import ffmpeg, { type FilterSpecification } from 'fluent-ffmpeg';
import { extname } from 'path';

import { ffmpegPath } from 'localPath.js';

// types
import type { FfmpegAudioClip } from './types.js';

/** Trims each audio clip and then join them to create a single playable audio (Series merge) */
export default function trimAndJoinAudios(
  clips: FfmpegAudioClip[],
  totalDuration: number,
  outputChannels: number,
  outputPath: string,
) {
  return new Promise<void>((resolve, reject) => {
    const ffmpegCommand = ffmpeg();
    ffmpegPath && ffmpegCommand.setFfmpegPath(ffmpegPath);

    ffmpegCommand
      .on('end', () => {
        resolve();
      })
      .on('error', (err) => {
        reject(err);
      });

    clips.sort((clip1, clip2) => clip1.start - clip2.start);

    clips.forEach((clip) => {
      ffmpegCommand.input(clip.src);
    });

    const filters: FilterSpecification[] = [];
    let silenceCount = 0;
    const finalInput = [];

    if (clips[0].start > 0) {
      filters.push({
        filter: 'aevalsrc',
        options: {
          exprs: 0,
          d: clips[0].start / 1000,
        },
        outputs: `[silence${silenceCount}]`,
      });
      finalInput.push(`[silence${silenceCount}]`);
      silenceCount++;
    }

    clips.forEach((clip, index) => {
      const clipDuration = Math.min(totalDuration, clip.duration);
      filters.push({
        filter: 'atrim',
        inputs: `[${index}:a]`,
        options: {
          duration: clipDuration / 1000,
          start: clip.trim / 1000,
        },
        outputs: `[audio${index}]`,
      });
      finalInput.push(`[audio${index}]`);

      // Detect silences between clips
      if (
        index !== clips.length - 1 &&
        clip.start + clipDuration < clips[index + 1].start
      ) {
        filters.push({
          filter: 'aevalsrc',
          options: {
            exprs: 0,
            d: (clips[index + 1].start - (clip.start + clipDuration)) / 1000,
          },
          outputs: `[silence${silenceCount}]`,
        });
        finalInput.push(`[silence${silenceCount}]`);
        silenceCount++;
      }
    });

    const lastClip = clips[clips.length - 1];
    const lastClipDuration = Math.min(totalDuration, lastClip.duration);
    if (lastClip && lastClip.start + lastClipDuration < totalDuration) {
      filters.push({
        filter: 'aevalsrc',
        options: {
          exprs: 0,
          d: (totalDuration - (lastClip.start + lastClipDuration)) / 1000,
        },
        outputs: `[silence${silenceCount}]`,
      });
      finalInput.push(`[silence${silenceCount}]`);
      silenceCount++;
    }

    filters.push({
      inputs: finalInput,
      filter: 'concat',
      options: {
        n: finalInput.length,
        v: 0,
        a: 1,
      },
    });

    ffmpegCommand.complexFilter(filters);

    ffmpegCommand.audioChannels(outputChannels);

    ffmpegCommand
      .outputOptions([`-f ${extname(outputPath).slice(1)}`])
      .output(outputPath)
      .run();
  });
}
