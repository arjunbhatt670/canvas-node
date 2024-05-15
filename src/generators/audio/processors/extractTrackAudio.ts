import trimAndJoinAudios from 'utilities/ffmpeg/trimAndJoinAudios.js';
import metaOf from 'utilities/ffmpeg/meta.js';
import { ClipType } from 'constants/videoTemplate.js';

// types
import type { FfmpegAudioClip } from 'utilities/ffmpeg/types.js';
import type {
  AudioClip,
  VideoClip,
  VideoTemplate,
} from 'types/videoTemplate.js';

/** Extracts a single audio from the complete track */
export default async function extractTrackAudio(options: {
  track: VideoTemplate['tracks'][number];
  trackTotalDuration: number;
  outputAudioPath: string;
}) {
  const { outputAudioPath, track, trackTotalDuration } = options;

  const audioAndVideoClips = track.clips.filter(
    (clip): clip is VideoClip | AudioClip =>
      [ClipType.VIDEO_CLIP, ClipType.AUDIO_CLIP].includes(clip.type),
  );

  const ffmpegAudioClips: FfmpegAudioClip[] = [];

  await Promise.all(
    audioAndVideoClips.map(async (clip) => {
      const { streams } = await metaOf(clip.sourceUrl);
      const audioStream = streams.find(
        (stream) => stream.codec_type === 'audio',
      );

      if (audioStream) {
        ffmpegAudioClips.push({
          duration: clip.duration,
          src: clip.sourceUrl,
          start: clip.startOffSet,
          end: clip.endOffSet,
          trim: clip.trimOffset || 0,
          stream: audioStream,
        });
      }
    }),
  );

  if (ffmpegAudioClips.length) {
    const outputChannels = Math.max(
      ...ffmpegAudioClips.map((clip) => clip.stream.channels || 0),
    );

    await trimAndJoinAudios(
      ffmpegAudioClips,
      trackTotalDuration,
      outputChannels,
      outputAudioPath,
    );

    return {
      channels: outputChannels,
      path: outputAudioPath,
    };
  }

  return null;
}
