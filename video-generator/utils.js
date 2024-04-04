const { exec } = require('child_process');

const video2Frame = require("../video2Frame");
const { getFramePath, TimeTracker } = require('../utils');
const { tmpDir } = require('../path');

/**
 * @param {Media} config 
 * @returns {Promise<string>} Temporary files path regex
 */
const extractVideoFrames = async (config, imgType) => {
    const videoClips = config.tracks.map((track) => track.clips.map((clip) => clip.type === 'VIDEO_CLIP' ? clip : null)).flat(1).filter(Boolean);

    const totalDuration = config.videoProperties.duration;

    const timeTracker = new TimeTracker();
    timeTracker.start();
    const promises = videoClips.map(async (clip) => {
        const frameOutputPath = getFramePath({ dir: tmpDir, format: imgType, frameName: clip.id });

        await new Promise((res, rej) => exec(`rm -rf ${frameOutputPath.replace('%d', '**')}`, (err) => err ? rej(err) : res()));

        return video2Frame(clip.sourceUrl, frameOutputPath, {
            startTime: (clip.trimOffset || 0) / 1000,
            frameRate: config.videoProperties.frameRate,
            height: clip.coordinates.height,
            width: clip.coordinates.width,
            frameCount: Math.ceil(Math.min(clip.duration, totalDuration) * config.videoProperties.frameRate / 1000)
        });
    });

    await Promise.all(promises);
    timeTracker.log('Frames extracted from videos');

    return getFramePath({
        dir: tmpDir,
        format: imgType,
        frameName: '**',
        frame: '**'
    });
}

/**
 * @param {Media} config 
 * @param {number} timeInstance 
 * @returns {DataClip[]}
 */
function getVisibleObjects(config, timeInstance) {
    return config.tracks
        .map((track) =>
            track.clips
                .sort((clip1, clip2) => clip1.startOffSet - clip2.startOffSet)
        )
        .flat(1)
        .filter((clip) =>
        (clip.type !== 'AUDIO_CLIP'
            && clip.startOffSet <= timeInstance
            && timeInstance < (clip.startOffSet + clip.duration)));
}

module.exports = {
    extractVideoFrames,
    getVisibleObjects
}