import ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "ffmpeg-static";
import fs from "fs";

import { getStreams, print, TimeTracker } from "#root/utilities/grains.js";
import { tmpDir } from "#root/path.js";
import getConfig from "#root/utilities/getConfig.js";

import { Clip, MixAudio } from "./types";

const trimAndJoin = async (
  clips: Clip[],
  totalDuration: number,
  outputPath: string,
  format: string
) => {
  const channels = Math.max(...clips.map((clip) => clip.stream.channels));

  return new Promise<{ path: string; channels: number }>((resolve, reject) => {
    const ffmpegCommand = ffmpeg();
    ffmpegPath && ffmpegCommand.setFfmpegPath(ffmpegPath);
    ffmpegCommand
      .on("end", () => {
        resolve({
          path: outputPath,
          channels,
        });
      })
      .on("error", (err, _, stdout) => {
        console.error("ffmpeg error:", err.message, stdout);
        reject(err);
      });

    clips.sort((clip1, clip2) => clip1.start - clip2.start);

    clips.forEach((clip) => {
      ffmpegCommand.input(clip.src);
    });

    /** @type {ffmpeg.FilterSpecification[]} */
    const filters = [];
    let silenceCount = 0;
    const finalInput = [];

    if (clips[0].start > 0) {
      filters.push({
        filter: "aevalsrc",
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
        filter: "atrim",
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
          filter: "aevalsrc",
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
        filter: "aevalsrc",
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
      filter: "concat",
      options: {
        n: finalInput.length,
        v: 0,
        a: 1,
      },
    });

    ffmpegCommand.complexFilter(filters);

    ffmpegCommand.audioChannels(channels);

    ffmpegCommand
      .outputOptions([`-f ${format}`])
      .output(outputPath)
      .run();
  });
};

const mixAudios: MixAudio = async (audios, outputPath, format) => {
  const channels = Math.max(...audios.map((audio) => audio.channels));

  return new Promise((resolve, reject) => {
    const stream = fs.createWriteStream(outputPath);
    const ffmpegCommand = ffmpeg();
    ffmpegPath && ffmpegCommand.setFfmpegPath(ffmpegPath);
    ffmpegCommand
      .on("end", () => {
        resolve(stream);
      })
      .on("error", (err, stderr, stdout) => {
        console.error("ffmpeg error:", err.message, stdout);
        reject(err);
      });

    audios.forEach((audio) => ffmpegCommand.addInput(audio.path));

    ffmpegCommand.complexFilter({
      filter: "amix",
      options: {
        inputs: audios.length,
        duration: "longest",
      },
    });

    // convert to stereo
    ffmpegCommand.audioChannels(channels);

    ffmpegCommand.outputOptions([`-f ${format}`]).pipe(stream);
  });
};

const getAudioFromTrack = async (
  track: Media["tracks"][number],
  videoProperties: Media["videoProperties"]
) => {
  const audioVideos = track.clips.filter((clip) =>
    ["VIDEO_CLIP", "AUDIO_CLIP"].includes(clip.type)
  );

  const audioStreams = await Promise.all(
    audioVideos.map(async (clip) => {
      const streams = await getStreams(clip.sourceUrl);
      return streams.find((stream) => stream.codec_type === "audio");
    })
  );

  const audioClips: Clip[] = audioVideos
    .map((clip, index) => ({
      duration: clip.duration,
      src: clip.sourceUrl,
      start: clip.startOffSet,
      end: clip.endOffSet,
      trim: clip.trimOffset || 0,
      stream: audioStreams[index],
    }))
    .filter((_, index) => audioStreams[index]);

  if (audioClips.length) {
    const audio = await trimAndJoin(
      audioClips,
      videoProperties.duration,
      `${tmpDir}/${track.id}.mp3`,
      "mp3"
    );
    print(`Trim and join finished for track ${track.id}`);
    return audio;
  }
};

(async () => {
  const { downloadedData: config } = await getConfig();

  const timeTracker = new TimeTracker();
  const totalTimeTracker = new TimeTracker();
  totalTimeTracker.start();

  timeTracker.start();
  const tracks = await Promise.all(
    config.tracks.map((track) =>
      getAudioFromTrack(track, config.videoProperties)
    )
  );
  timeTracker.log("Tracks are ready");
  const validTracks = tracks.map((track) => track!).filter((track) => track);
  if (!validTracks.length) return;

  timeTracker.start();

  await mixAudios(validTracks, process.env.OUTPUT!, "mp3");

  timeTracker.log("Tracks are mixed");

  totalTimeTracker.log("Total time");

  ffmpeg.ffprobe(process.env.OUTPUT!, (_, meta) =>
    console.log("Final Audio properties", meta.format)
  );

  validTracks.forEach((track) => {
    fs.unlink(track.path, (err) => {
      err ? console.error(err) : console.log("unlinked", track.path);
    });
  });
})();
