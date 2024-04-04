const ffmpeg = require('fluent-ffmpeg')
const ffmpegPath = require('ffmpeg-static');
const { print } = require('./grains');

/**
 * @returns {Promise<string | PassThrough>}
 */
module.exports = async function video2Frame(inputVideo, output, inputOptions) {
    const { startTime = 0, frameRate, width, height, frameCount } = inputOptions;

    return new Promise((resolve) => {
        const ffmpegCommand = ffmpeg();
        ffmpegCommand.setFfmpegPath(ffmpegPath);

        ffmpegCommand
            .input(inputVideo)
            .inputOptions([
                `-ss ${startTime}`
            ])
            .outputOptions([
                `-r ${frameRate}`,
                `-vf fps=${frameRate}`,
                `-vf scale=${width ?? -1}:${height ?? -1}`,
                `-vframes ${frameCount}`,
                '-q:v 1'
            ])
            .on('start', () => {
                print(`frame extraction for ${inputVideo} started`);
            }).on('end', () => {
                print(`frame extraction for ${inputVideo} completed`);
            }).on('error', (err, stderr, stdout) => {
                console.error('ffmpeg error:', err.message, stdout);
            });

        if (typeof output === 'string') {
            ffmpegCommand
                .output(output)
                .on('end', () => {
                    resolve(output);
                })
                .run();
        } else {
            const res = ffmpegCommand
                .addOutputOptions(['-c:v png', '-f image2pipe'])
                .pipe(output);
            resolve(res);
        }
    })
}