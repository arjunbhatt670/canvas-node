const ffmpeg = require('fluent-ffmpeg')
const ffmpegPath = require('ffmpeg-static');
const { PassThrough } = require('stream');
const { exec } = require('child_process');


const { WebGLRenderingContext } = require('gl')
const { Canvas, Image, CanvasRenderingContext2D, ImageData } = require('canvas');
const Worker = require('worker_threads');

global.Worker = Worker.Worker;
global.WebGLRenderingContext = WebGLRenderingContext
global.CanvasRenderingContext2D = CanvasRenderingContext2D
global.ImageData = ImageData
global.Canvas = Canvas;
global.Image = Image;


const PIXI = require('@pixi/node');
const fs = require('fs');
const mediaData = require('./data.json');

function getFrame({ frame = '%d', format, dir, frameName }) {
    return [dir, `${frameName}_frame%d.${format}`].filter(Boolean).join('/').replace('%d', frame)
}

async function extractFrames(inputVideoPath, { startTime = 0, duration, frameRate, width, height, outputFormat = 'png', dir, frameName }) {
    const outputPath = getFrame({ dir, format: outputFormat, frameName });
    await new Promise((res, rej) => exec(`rm -rf ${outputPath.replace('%d', '**')}`, (err) => err ? rej(err) : res()));


    return new Promise((resolve) => {
        const ffmpegCommand = ffmpeg();
        ffmpegCommand.setFfmpegPath(ffmpegPath);

        ffmpegCommand
            .input(inputVideoPath)
            .inputOptions([
                `-ss ${startTime}`,
                `-t ${duration}`
            ])
            .output(outputPath)
            .outputOptions([
                `-r ${frameRate}`,
                `-vf fps=${frameRate}`,
                `-vf scale=${width ?? -1}:${height ?? -1}`,
                `-vframes ${frameRate * duration}`,
                // '-f image2pipe',
                // '-c:v png',
                // '-c:v libx264'
            ])
            .on('start', () => {
                console.log('frame extraction for', inputVideoPath, 'started');
            }).on('end', () => {
                console.log('frame extraction for', inputVideoPath, 'completed');
                resolve();
            }).on('error', (err, stderr, stdout) => {
                console.error('ffmpeg error:', err.message, stdout);
            })
            .run();
    })
}


(async () => {
    const videoClips = mediaData.tracks.map((track) => track.clips.map((clip) => clip.type === 'VIDEO_CLIP' ? clip : null)).flat(1).filter(Boolean);

    const extractStart = Date.now();
    const promises = videoClips.map((clip) => {
        return extractFrames(clip.sourceUrl, {
            duration: clip.duration / 1000,
            startTime: clip.trimOffset / 1000,
            frameRate: mediaData.videoProperties.frameRate,
            dir: 'intermediates',
            frameName: clip.id,
            height: clip.coordinates.height,
            width: clip.coordinates.width
        });
    });

    await Promise.allSettled(promises);
    console.log('Video frames extraction time', Date.now() - extractStart, 'ms');


    const shapeClips = mediaData.tracks.map((track) => track.clips.map((clip) => clip.type === 'SHAPE_CLIP' ? clip : null)).flat(1).filter(Boolean);

    const shapeExtractStart = Date.now();
    shapeClips.map((clip) => {
        fs.writeFileSync(`intermediates/${clip.id}.png`, Buffer.from(clip.shapeInfo.shapeMediaUrl.split('base64,')[1], 'base64url'))
    })
    console.log('Shapes extraction time', Date.now() - shapeExtractStart, 'ms');


    const imageClips = mediaData.tracks.map((track) => track.clips.map((clip) => clip.type === 'IMAGE_CLIP' ? clip : null)).flat(1).filter(Boolean);

    const imageExtractStart = Date.now();
    imageClips.map((clip) => {
        fs.writeFileSync(`intermediates/${clip.id}.png`, fs.readFileSync(clip.sourceUrl));
    })
    console.log('images extraction time', Date.now() - imageExtractStart, 'ms');

    const totalFrames = (mediaData.videoProperties.duration * mediaData.videoProperties.frameRate) / 1000;

    const app = new PIXI.Application({
        width: mediaData.videoProperties.width,
        height: mediaData.videoProperties.height,
        hello: true
    });

    app.renderer.background.color = '#ffffff';

    await PIXI.Assets.init({
        basePath: 'intermediates',
        skipDetections: true
    });

    console.time('Video frames load time')
    await PIXI.Assets.load(fs.readdirSync('intermediates'))
    console.timeEnd('Video frames load time')


    const inputStream = new PassThrough();

    let pixiStart = Date.now();
    let currentFrame = 1;

    const statics = new Map();

    while (currentFrame <= totalFrames) {
        const currentTime = (currentFrame * 1000) / mediaData.videoProperties.frameRate;
        const clips = getVisibleObjects(currentTime);

        const container = new PIXI.Container();
        app.stage = container;

        for (let clipIndex = 0; clipIndex < clips.length; clipIndex++) { // 5ms
            const clip = clips[clipIndex];
            const clipStartFrame = (clip.startOffSet * mediaData.videoProperties.frameRate) / 1000;

            switch (clip.type) {
                case 'VIDEO_CLIP': {
                    try {
                        const videoFramePath = getFrame({
                            frame: currentFrame + 1 - clipStartFrame,
                            format: 'png',
                            frameName: clip.id
                        });

                        const img = await PIXI.Assets.get(videoFramePath);

                        const sprite = PIXI.Sprite.from(img);
                        sprite.x = clip.coordinates.x;
                        sprite.y = clip.coordinates.y;
                        sprite.width = clip.coordinates.width;
                        sprite.height = clip.coordinates.height;

                        container.addChild(sprite);
                    } catch (_err) {
                        /**  */
                    }

                    break;
                }

                case 'SHAPE_CLIP': {
                    if (statics.has(clip)) {
                        container.addChild(statics.get(clip));
                    } else {
                        const img = await PIXI.Assets.load(`${clip.id}.png`);

                        const sprite = PIXI.Sprite.from(img);
                        sprite.x = clip.coordinates.x;
                        sprite.y = clip.coordinates.y;
                        sprite.width = clip.coordinates.width;
                        sprite.height = clip.coordinates.height;

                        statics.set(clip, sprite);
                        container.addChild(sprite);
                    }

                    break;
                }

                case 'IMAGE_CLIP': {
                    if (statics.has(clip)) {
                        container.addChild(statics.get(clip));
                    } else {
                        const img = await PIXI.Assets.load(`${clip.id}.png`);

                        const sprite = PIXI.Sprite.from(img);
                        sprite.x = clip.coordinates.x;
                        sprite.y = clip.coordinates.y;
                        sprite.width = clip.coordinates.width;
                        sprite.height = clip.coordinates.height;

                        statics.set(clip, sprite);
                        container.addChild(sprite);
                    }

                    break;
                }
            }
        }

        app.render();
        const baseData = app.view.toDataURL('image/jpeg', 1);  // 5ms

        inputStream.write(Buffer.from(baseData, 'base64'));  // 0.15ms

        currentFrame++;
    }

    app.destroy();

    const pixiEnd = Date.now();
    console.log("pixi/node drawing time spent of all frames", pixiEnd - pixiStart, 'ms')

    inputStream.end();

    exec('rm -rf intermediates/**_frame**.png');


    const command = ffmpeg();
    command.setFfmpegPath(ffmpegPath);
    let ffmpegStartTime
    command.input(inputStream);
    command.inputFPS(mediaData.videoProperties.frameRate);
    command.output('output.mp4').fpsOutput(mediaData.videoProperties.frameRate).on('start', () => {
        ffmpegStartTime = Date.now();
        console.log('ffmpeg process started');
    })
        .on('error', (err, stdout, stderr) => {
            console.error('ffmpeg error:', err.message);
            console.error('ffmpeg stderr:', stderr);
        })
        .on('end', () => {
            console.log('ffmpeg video conversion time spent', Date.now() - ffmpegStartTime, 'ms');
            command.input('output.mp4').ffprobe(function (err, metadata) {
                console.log('Duration of video', metadata.format.duration, 'seconds');
            });
        })
        .run()
})();


function getVisibleObjects(timeInstance) {
    return mediaData.tracks
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


// extractFrames('./assets/dragon.mp4', {
//     duration: 2,
//     startTime: 0,
//     width: 720,
//     frameRate: 20,
//     outputFormat: 'png',
//     dir: 'intermediates',
//     frameName: 'inputVideo',
// });




// ffmpeg -i filename 2>&1 | sed -n "s/.*, \(.*\) fp.*/\1/p"