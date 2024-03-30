const ffmpeg = require("fluent-ffmpeg");
const ffmpegPath = require("ffmpeg-static");
const fs = require("fs");
const { getStreams, TimeTracker } = require("./utils");
const { tmpDir, finalsPath } = require("./path");
const { getConfig } = require("./service");

/**
 * @param {Clip[]} clips
 * @param {number} totalDuration
 * @param {fs.WriteStream} stream
 * @returns {Promise<{path: string; channels: number}>}
 */
const trimAndJoin = async (clips = [], totalDuration, outputPath, format) => {
    const channels = Math.max(...clips.map(clip => clip.stream.channels));

    return new Promise((resolve, reject) => {
        const ffmpegCommand = ffmpeg();
        ffmpegCommand.setFfmpegPath(ffmpegPath);
        ffmpegCommand
            .on("end", () => {
                console.log("trim and join finished");
                resolve({
                    path: outputPath,
                    channels
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

/**
 * @param {(string| Readable)[]} audios
 * @param {fs.WriteStream} stream
 * @returns {Promise<void>}
 */
const mixAudios = async (audios, outputPath, format) => {
    const channels = Math.max(...audios.map(audio => audio.channels));

    return new Promise((resolve, reject) => {
        const stream = fs.createWriteStream(outputPath);
        const ffmpegCommand = ffmpeg();
        ffmpegCommand.setFfmpegPath(ffmpegPath);
        ffmpegCommand
            .on("end", () => {
                console.log("Mix finished");
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

        ffmpegCommand
            .outputOptions([`-f ${format}`])
            .pipe(stream);
    });
}

const getAudioFromTrack = async (track, videoProperties) => {
    const audioVideos = track.clips.filter(clip => ['VIDEO_CLIP', 'AUDIO_CLIP'].includes(clip.type));

    const audioClips = (await Promise.all(audioVideos.map(
        /** @returns {Promise<Clip>} */
        async function getAudio(clip) {
            const streams = await getStreams(clip.sourceUrl);
            const audioStream = streams.find(stream => stream.codec_type === 'audio');

            if (!audioStream) return null;

            return {
                duration: clip.duration,
                src: clip.sourceUrl,
                start: clip.startOffSet,
                end: clip.endOffSet,
                trim: clip.trimOffset || 0,
                stream: audioStream
            }
        }))).filter(Boolean);

    if (audioClips.length) {
        const audio = await trimAndJoin(audioClips, videoProperties.duration, `${tmpDir}/${track.id}.mp3`, 'mp3');
        return audio;
    }
}

(async () => {
    const { downloadedData: config } = await getConfig();

    const timeTracker = new TimeTracker();
    timeTracker.start();

    const audioPromises = config.tracks.map((track) => getAudioFromTrack(track, config.videoProperties));
    const audios = (await Promise.all(audioPromises)).filter(Boolean);

    timeTracker.log('Audios merged');

    timeTracker.start();

    const finalAudioPath = `${finalsPath}/output_120s.mp3`;
    await mixAudios(audios, finalAudioPath, 'mp3');

    timeTracker.log('Audios mixed')

    ffmpeg.ffprobe(finalAudioPath, (_, data) => console.log('Final Audio properties', {
        time: data.format.duration,
        channel_name: data.streams.map(stream => stream.channel_layout),
    }))


    audios.forEach((audio) => {
        fs.unlink(audio.path, (err) => {
            err ? console.error(err) : console.log("unlinked");
        });
    });
})();
