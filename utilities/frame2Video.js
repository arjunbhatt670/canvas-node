const ffmpeg = require('fluent-ffmpeg')
const ffmpegPath = require('ffmpeg-static');
const { print } = require('./grains');

module.exports = function frame2Video(inputStream, frameRate, output) {
    return new Promise((resolve, reject) => {
        const command = ffmpeg();
        command.setFfmpegPath(ffmpegPath);
        command
            .input(inputStream)
            .inputFPS(frameRate)
            .videoCodec('libx264')
            .videoBitrate('1200k')
            .outputOptions([
                '-pix_fmt yuv420p',
            ])
            .fpsOutput(frameRate)
            .on('start', () => {
                print('ffmpeg process started');
            })
            .on('error', (err, stdout, stderr) => {
                reject(err);
                console.error('ffmpeg stderr:', stderr);
            })
            .on('end', () => {
                print('ffmpeg process completed');
                command.input(output).ffprobe(function (err, metadata) {
                    console.log(metadata.format)
                });
                resolve(output);
            });

        if (typeof output === 'string') {
            command
                .output(output)
                .run();
        } else {
            command.pipe(output);
        }
    })
}