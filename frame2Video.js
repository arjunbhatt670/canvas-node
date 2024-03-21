const ffmpeg = require('fluent-ffmpeg')
const ffmpegPath = require('ffmpeg-static');

module.exports = function frame2Video(inputStream, frameRate, outputPath) {
    const command = ffmpeg();
    command.setFfmpegPath(ffmpegPath);
    let ffmpegStartTime;
    command
        .input(inputStream)
        .inputFPS(frameRate)
        .output(outputPath)
        .videoCodec('libx264')
        .videoBitrate('1200k')
        .outputOptions([
            '-pix_fmt yuv420p',
        ])
        .fpsOutput(frameRate)
        .on('start', () => {
            ffmpegStartTime = Date.now();
            console.log('ffmpeg process started');
        })
        .on('error', (err, stdout, stderr) => {
            console.error('ffmpeg error:', err.message);
            console.error('ffmpeg stderr:', stderr);
        })
        .on('end', () => {
            console.log('ffmpeg video conversion time spent', Date.now() - ffmpegStartTime, 'ms');
            console.log('Video saved to path', outputPath);
            command.input(outputPath).ffprobe(function (err, metadata) {
                console.log('Duration of video', metadata.format.duration, 'seconds');
            });
        })
        .run()
}