const ffmpeg = require('fluent-ffmpeg')
const ffmpegPath = require('ffmpeg-static');

module.exports.mergeAudioAndVideo = function (audio = 'output.mp3', video = 'output2.mp4') {
    return new Promise((resolve) => {
        const ffmpegCommand = ffmpeg();
        ffmpegCommand.setFfmpegPath(ffmpegPath);

        ffmpegCommand
            .input(video)
            .input(audio)
            .videoCodec('copy')
            .audioCodec('aac')
            .outputOptions([
                `-shortest`
            ])
            .on('start', () => {
                console.log('Merging audio ad video');
            }).on('end', () => {
                console.log('Audio and video merged');
                resolve();
            }).on('error', (err, stderr, stdout) => {
                console.error('ffmpeg error:', err.message, stdout);
            })
            .output('final.mp4')
            .run();
    })
}

module.exports.mergeAudioAndVideo()