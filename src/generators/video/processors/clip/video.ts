import video2Frame from 'utilities/ffmpeg/video2Frame.js';
import {
  getVideoClipFrameEndPoints,
  getVideoClipFramePath,
} from 'generators/utils.js';
import { ClipType } from 'constants/videoTemplate.js';

// types
import type { Clip, VideoClip } from 'types/videoTemplate.js';
import { type VideoGenerationConfig } from 'types/index.js';

/** Extract and save frames from each video clip present in template */
export default async function processVideo(
  videoGenerationConfig: VideoGenerationConfig,
  limit: { start: number; duration: number },
) {
  const { template, tmpDirPath } = videoGenerationConfig;

  const filterClip = (clip: Clip): clip is VideoClip =>
    clip.type === ClipType.VIDEO_CLIP &&
    clip.startOffSet < limit.start + limit.duration &&
    clip.startOffSet + clip.duration >= limit.start;

  await Promise.all(
    template.tracks
      .map((track) => track.clips.filter(filterClip))
      .flat(1)
      .map((clip) => {
        const outputFramesPath = getVideoClipFramePath({
          dir: tmpDirPath,
          clipName: clip.id,
        });

        const { frameCount, startFrame, startTime } =
          getVideoClipFrameEndPoints({
            videoClip: clip,
            limit,
            frameRate: template.videoProperties.frameRate,
          });

        return video2Frame({
          startTime,
          frameRate: template.videoProperties.frameRate,
          height: clip.coordinates.height,
          width: clip.coordinates.width,
          frameCount,
          frameCountStart: startFrame,
          outputFramesPath,
          inputVideoFilePath: clip.sourceUrl,
        });
      }),
  );
}
