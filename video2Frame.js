const ffmpeg = require('fluent-ffmpeg')
const ffmpegPath = require('ffmpeg-static');

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
                console.log('frame extraction for', inputVideo, 'started');
            }).on('end', () => {
                console.log('frame extraction for', inputVideo, 'completed');
                resolve();
            }).on('error', (err, stderr, stdout) => {
                console.error('ffmpeg error:', err.message, stdout);
            });

        if (typeof inputVideo === 'string') {
            ffmpegCommand
                .output(output)
                .run();
        } else {
            ffmpegCommand
                .addOutputOptions(['-f image2pipe'])
                .pipe();
        }
    })
}