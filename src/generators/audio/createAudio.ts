import mixAudios from 'utilities/ffmpeg/mixAudios.js';
import { getAudioTrackPath } from 'generators/utils.js';
import extractTrackAudio from './processors/extractTrackAudio.js';

// types
import type { VideoGenerationConfig } from 'types/index.js';

export default async function createAudio(
  videoGenerationConfig: VideoGenerationConfig,
) {
  const { finalAudioPath, template, tmpDirPath } = videoGenerationConfig;

  const trackAudios = await Promise.all(
    template.tracks.map((track) =>
      extractTrackAudio({
        outputAudioPath: getAudioTrackPath(track.id, tmpDirPath),
        track,
        trackTotalDuration: template.videoProperties.duration,
      }),
    ),
  );
  const validTrackAudios = trackAudios.filter(
    (track): track is { channels: number; path: string } => Boolean(track),
  );

  if (!validTrackAudios.length) {
    return false;
  }

  const outputChannels = Math.max(
    ...validTrackAudios.map((clip) => clip.channels),
  );
  await mixAudios(
    validTrackAudios.map((track) => track.path),
    { outputAudioPath: finalAudioPath, outputChannels },
  );

  return true;
}
