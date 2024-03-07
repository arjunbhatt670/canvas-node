const ffmpeg = require("fluent-ffmpeg");
const ffmpegPath = require("ffmpeg-static");
const fs = require("fs");
const { downloadMedia, calculateMaxAudioChannels } = require("./utils");
const { tmpDir } = require("./path");

/**
 * @param {Clip[]} clips
 * @param {number} totalDuration
 * @param {fs.WriteStream} stream
 * @returns {Promise<fs.WriteStream>}
 */
const trimAndJoin = async (clips = [], totalDuration, outputPath, format) => {
    const finalAudioChannels = await calculateMaxAudioChannels(clips.map(clip => clip.src));

    return new Promise((resolve, reject) => {
        const stream = fs.createWriteStream(outputPath);
        const ffmpegCommand = ffmpeg();
        ffmpegCommand.setFfmpegPath(ffmpegPath);
        ffmpegCommand
            .on("end", () => {
                console.log("trim and join finished");
                resolve(stream);
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
            filters.push({
                filter: "atrim",
                inputs: `[${index}:a]`,
                options: {
                    duration: clip.duration / 1000,
                    start: clip.trim / 1000,
                },
                outputs: `[audio${index}]`,
            });
            finalInput.push(`[audio${index}]`);

            // Detect silences between clips
            if (
                index !== clips.length - 1 &&
                clip.start + clip.duration < clips[index + 1].start
            ) {
                filters.push({
                    filter: "aevalsrc",
                    options: {
                        exprs: 0,
                        d: (clips[index + 1].start - (clip.start + clip.duration)) / 1000,
                    },
                    outputs: `[silence${silenceCount}]`,
                });
                finalInput.push(`[silence${silenceCount}]`);
                silenceCount++;
            }
        });

        const lastClip = clips[clips.length - 1];
        if (lastClip.start + lastClip.duration < totalDuration) {
            filters.push({
                filter: "aevalsrc",
                options: {
                    exprs: 0,
                    d: (totalDuration - (lastClip.start + lastClip.duration)) / 1000,
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

        // convert to stereo
        ffmpegCommand.audioChannels(finalAudioChannels);

        ffmpegCommand
            .outputOptions([`-f ${format}`])
            .pipe(stream)
    });
};

/**
 * @param {(string| Readable)[]} audios
 * @param {fs.WriteStream} stream
 * @returns {Promise<void>}
 */
const mixAudios = async (audios, outputPath, format) => {
    const finalAudioChannels = await calculateMaxAudioChannels(audios);

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

        audios.forEach((audio) => ffmpegCommand.addInput(audio));

        ffmpegCommand.complexFilter({
            filter: "amix",
            options: {
                inputs: audios.length,
                duration: "longest",
            },
        });

        // convert to stereo
        ffmpegCommand.audioChannels(finalAudioChannels);

        ffmpegCommand
            .outputOptions([`-f ${format}`])
            .pipe(stream);
    });
}

(async () => {
    const mediaData = await fetch("http://localhost:5173/data60.json").then(
        (value) => value.json()
    );

    const config = await downloadMedia(mediaData, true);

    let start = Date.now();

    const promises = config.tracks.map(async (track) => {
        /** @type {Clip[]} */
        const clips = track.clips
            .filter(clip => ['VIDEO_CLIP', 'AUDIO_CLIP'].includes(clip.type))
            .map((clip) => ({
                duration: clip.duration,
                src: clip.sourceUrl,
                start: clip.startOffSet,
                end: clip.endOffSet,
                trim: clip.trimOffset || 0,
            }));

        const audioPath = `${tmpDir}/${track.id}.mp3`;

        if (clips.length) {
            await trimAndJoin(clips, mediaData.videoProperties.duration, audioPath, 'mp3');
            return audioPath;
        }
    });

    const audioPaths = (await Promise.allSettled(promises)).map(result => result.value).filter(Boolean);

    console.log('Merging time', Date.now() - start);
    start = Date.now();

    await mixAudios(audioPaths, "output.mp3", 'mp3');

    console.log('Mixing time', Date.now() - start);

    ffmpeg.ffprobe('output.mp3', (_, data) => console.log('Final Audio properties', {
        time: data.format.duration,
        channel_name: data.streams[0].channel_layout,
    }))


    audioPaths.forEach((path) => {
        fs.unlink(path, (err) => {
            err ? console.error(err) : console.log("unlinked");
        });
    });
})();
