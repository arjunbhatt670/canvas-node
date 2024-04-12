import video2Frame from "#root/utilities/video2Frame";

const extractVideoClipFrames = async (
  clip: DataClip,
  options: {
    frameRate: number;
    frameOutputPath: string;
    limit: {
      start: number;
      duration: number;
    };
  }
) => {
  const { frameOutputPath, frameRate, limit } = options;

  return video2Frame(clip.sourceUrl, frameOutputPath, {
    startTime:
      ((clip.trimOffset || 0) + Math.max(limit.start - clip.startOffSet, 0)) /
      1000,
    frameRate,
    height: clip.coordinates.height,
    width: clip.coordinates.width,
    frameCount: Math.ceil(
      ((Math.min(
        clip.startOffSet + clip.duration,
        limit.start + limit.duration
      ) -
        Math.max(limit.start, clip.startOffSet)) *
        frameRate) /
        1000
    ),
    frameCountStart:
      1 +
      Math.round(
        (Math.max(limit.start - clip.startOffSet, 0) * frameRate) / 1000
      ),
  });
};

function getVisibleObjects(config: Media, timeInstance: number): DataClip[] {
  return config.tracks
    .map((track) =>
      track.clips.sort((clip1, clip2) => clip1.startOffSet - clip2.startOffSet)
    )
    .flat(1)
    .filter(
      (clip) =>
        clip.type !== "AUDIO_CLIP" &&
        clip.startOffSet <= timeInstance &&
        timeInstance < clip.startOffSet + clip.duration
    );
}

export { extractVideoClipFrames, getVisibleObjects };
