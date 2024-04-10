import video2Frame from "../utilities/video2Frame";
import { getFramePath, TimeTracker } from "../utilities/grains";
import { tmpDir } from "../path";

const extractVideoClipFrames = async (
  clip: DataClip,
  options: {
    frameRate: number;
    maxDuration: number;
    frameImageType: string;
    strictStart: number;
  }
): Promise<string> => {
  const { frameImageType, frameRate, maxDuration, strictStart } = options;

  const frameOutputPath = getFramePath({
    dir: tmpDir,
    format: frameImageType,
    frameName: clip.id,
  });

  return video2Frame(clip.sourceUrl, frameOutputPath, {
    startTime: ((clip.trimOffset || 0) + strictStart) / 1000,
    frameRate,
    height: clip.coordinates.height,
    width: clip.coordinates.width,
    frameCount: Math.ceil(
      (Math.min(clip.duration, maxDuration) * frameRate) / 1000
    ),
    frameCountStart: 1 + (strictStart * frameRate) / 1000,
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
