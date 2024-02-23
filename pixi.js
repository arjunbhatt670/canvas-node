const ffmpeg = require('fluent-ffmpeg')
const ffmpegPath = require('ffmpeg-static');
const { PassThrough } = require('stream');
const { exec } = require('child_process');


const { WebGLRenderingContext } = require('gl')
const { Canvas, Image, CanvasRenderingContext2D, ImageData, loadImage } = require('canvas');
const { JSDOM } = require('jsdom');
const Worker = require('worker_threads');
// require('pixi-shim');
const { Writable } = require('node:stream');
const tmp = require("tmp")

global.Worker = Worker.Worker;
// const jsdom = new JSDOM();
// const document = jsdom.window.document;
// global.document = document;
// global.window = document.defaultView;
// global.window.document = global.document;
global.WebGLRenderingContext = WebGLRenderingContext
global.CanvasRenderingContext2D = CanvasRenderingContext2D
global.ImageData = ImageData
global.Canvas = Canvas;
global.Image = Image;


const PIXI = require('@pixi/node');
const fs = require('fs');
const mediaData = require('./data.json');

function getFrame({ frame = '%d', format, dir, frameName }) {
    return `${dir}/${frameName}_frame%d.${format}`.replace('%d', frame)
}

async function extractFrames(inputVideoPath, { startTime = 0, duration, frameRate, width, height, outputFormat = 'png', dir, frameName }) {
    const outputPath = getFrame({ dir, format: outputFormat, frameName });
    await new Promise((res, rej) => exec(`rm -rf ${outputPath.replace('%d', '**')}`, (err) => err ? rej(err) : res()));
    // const stream = new Writable({
    //     write: (chunk) => {
    //         console.log('chunk', chunk)
    //     }
    // })

    // stream.on('pipe', async (src) => {
    //     console.log(await src.every(data => {
    //         console.log('data', data)
    //     }))
    // })

    // const stream = new PassThrough();

    // stream.on('data', (chunk) => {
    //     console.log('chunk', chunk)
    // })

    return new Promise((resolve) => {
        const ffmpegCommand = ffmpeg();
        ffmpegCommand.setFfmpegPath(ffmpegPath);

        ffmpegCommand
            .input(inputVideoPath)
            // .inputOptions(['-f rawvideo'])
            .fpsInput(frameRate)
            .setStartTime(startTime)
            .setDuration(duration)
            .output(outputPath)
            .outputOptions([`-vf fps=${frameRate}`, `-vf scale=${width ?? -1}:${height ?? -1}`])
            // .outputOptions(['-c:v png', '-vsync 0'])
            .on('start', () => {
                console.log('frame extraction for', inputVideoPath, 'started');
            }).on('end', () => {
                console.log('frame extraction for', inputVideoPath, 'completed');
                resolve();
            }).on('error', (err, stderr, stdout) => {
                console.error('ffmpeg error:', err.message, stdout);
            })
            .run()
        // .stream(undefined, {
        //     end: true
        // }).on('data', (chunk) => {
        //     console.log('chunk', Buffer.from(chunk).byteLength);
        //     console.log(i)
        //     i++;
        //     // fs.writeFile(`intermediates/file${i}.png`, chunk, () => { });
        // });

        // ffmpegCommand.ffprobe((err, data) => {
        //     console.log('dataaaaa', data)
        // })

    })
}


async function generateVideo({
    duration, frameRate, startTime
}) {

    const frames = frameRate * duration;


    await extractFrames('inputVideo.mp4', 'intermediates/inputVideo_frame_%d.png', {
        duration,
        startTime,
        frameCount: duration * frameRate,
        frameRate

    });

    // return;

    console.log('Requested video time', duration, 'seconds');
    console.log('Using frame rate', frameRate, 'fps');

    await PIXI.Assets.init({
        // basePath: 'intermediates',
        skipDetections: true
    })


    // await extractFrames('./inputVideo.mp4', 'intermediates/frame_%d.png', 15 * 30);

    const command = ffmpeg();
    command.setFfmpegPath(ffmpegPath);
    command.outputOptions([
        // '-c:v libx264',     // Use H.264 codec
        // '-preset veryfast', // Preset for fast encoding
        // '-crf 23',          // Constant rate factor for video quality
        `-r ${frameRate}`,            // Frame rate
        `-t ${duration}`,
        // '-pix_fmt yuv420p', // Pixel format
        // '-vf scale=1280:-2' // Scale width to 1280 pixels while preserving aspect ratio (change if needed)
    ]);
    const inputStream = new PassThrough();

    const pixiStart = Date.now();

    const app = new PIXI.Application({
        width: 1200,
        height: 720,
        hello: true
    });
    let frame = 1;


    let oldRef;

    const goXWise = async () => {
        console.log('frame', frame)
        const rectangle = new PIXI.Graphics();
        rectangle.beginFill(0xFF0000);
        rectangle.drawRect(frame % app.renderer.width, 0, 50, 50);
        rectangle.endFill();

        let start = Date.now();
        const img = await PIXI.Assets.load(`intermediates/inputVideo_frame_${frame}.png`);

        console.log('time1', Date.now() - start);
        start = Date.now();
        app.stage.addChild(PIXI.Sprite.from(img));

        console.log('time2', Date.now() - start);

        if (oldRef) {
            app.stage.removeChild(oldRef)
        }
        oldRef = rectangle;

        app.stage.addChild(rectangle);

        start = Date.now();
        // app.render()

        const baseData = (await app.renderer.extract.base64()).replace('data:image/png;base64,', '');

        console.log('time3', Date.now() - start);

        return Buffer.from(baseData, 'base64')
    }


    // Loop until there are no more frames to process
    const paths = []
    while (frame <= frames) {
        const frameBuffer = await goXWise();
        if (frameBuffer) {
            // fs.writeFileSync(`intermediates/frame_${frame}.png`, frameBuffer)
            inputStream.write(frameBuffer)
            // const tmpobj = tmp.fileSync({
            //     postfix: '.png'
            // });
            // fs.writeFileSync(tmpobj.name, frameBuffer);
            // paths.push(tmpobj.name)
        }
        frame++;
    }

    // console.log(PIXI.VideoResource.MIME_TYPES);
    // // const videoResource = new PIXI.VideoResource('https://pixijs.com/assets/video.mp4');
    // // const vid = await PIXI.Assets.load(`intermediates/inputVideo.mp4`);
    // const texture = PIXI.Texture.fromBuffer(fs.readFileSync(`intermediates/inputVideo.mp4`), 1200, 700);


    // // create a new Sprite using the video texture (yes it's that easy)
    // const videoSprite = new PIXI.Sprite(texture);

    // // Stetch the fullscreen
    // videoSprite.width = app.screen.width;
    // videoSprite.height = app.screen.height;

    // app.stage.addChild(videoSprite);

    // const rectangle = new PIXI.Graphics();
    // rectangle.beginFill(0xFF0000);
    // rectangle.drawRect(frame % app.renderer.width, 0, 50, 50);
    // rectangle.endFill();

    // app.stage.addChild(rectangle)

    // app.ticker.start()

    // app.ticker.add(async (dt) => {
    //     console.log('dt', dt);
    //     app.render();
    //     console.log(await app.view.toDataURL());
    // })

    // setTimeout(() => {
    //     app.ticker.stop();
    //     app.destroy();
    // }, 1000)

    // console.log(requestAnimationFrame(() => {
    //     console.log('helloooooo')
    // }))

    // app.screen()


    const pixiEnd = Date.now();
    console.log("pixi/node drawing time spent of all frames", pixiEnd - pixiStart, 'ms')


    inputStream.end();

    // var tmpobj = tmp.fileSync({
    //     dir: 'mot/',
    // });
    // fs.writeFileSync(tmpobj.name, data);

    // tmpobj.removeCallback()

    // paths.forEach((path) => {
    // })
    command.input(inputStream);
    command.inputFPS(frameRate);
    let ffmpegStartTime;

    command.output('output.mp4')
        .on('start', () => {
            ffmpegStartTime = Date.now();
            console.log('ffmpeg process started');
        })
        .on('error', (err, stdout, stderr) => {
            console.error('ffmpeg error:', err.message);
            console.error('ffmpeg stderr:', stderr);
        })
        .on('end', () => {
            console.log('Video encoding finished');
            console.log('ffmpeg video conversion time spent', Date.now() - ffmpegStartTime, 'ms');
            command.input('output.mp4').ffprobe(function (err, metadata) {
                console.log('Duration of video', metadata.format.duration, 'seconds');
            });
        })
        .run();

    app.destroy();
    console.log('Processed', frame, 'frames.');
}

// // Call the async function to start generating the video
// generateVideo({
//     duration: 5, frameRate: 22, startTime: 9
// }).catch(err => {
//     console.error('Error generating video:', err);
//     // exec('rm -rf intermediates/*');
// }).then(() => {
//     // exec('rm -rf intermediates/*');
// });


// tracks will be mixed
// single track audio will be joined

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
    console.log('extraction time', Date.now() - extractStart)

    const totalFrames = (mediaData.videoProperties.duration * mediaData.videoProperties.frameRate) / 1000;

    const app = new PIXI.Application({
        width: mediaData.videoProperties.width,
        height: mediaData.videoProperties.height,
        hello: true
    });

    await PIXI.Assets.init({
        // basePath: 'intermediates',
        skipDetections: true
    });


    const inputStream = new PassThrough();

    let pixiStart = Date.now();
    let currentFrame = 1;

    console.log('totalFrames', totalFrames);

    let fileSystemAccessTime = 0;

    while (currentFrame <= totalFrames) {
        const clips = getVisibleObjects(currentFrame, mediaData.videoProperties.frameRate);

        const container = new PIXI.Container();
        app.stage = container;

        for (let clipIndex = 0; clipIndex < clips.length; clipIndex++) { // 5ms
            const clip = clips[clipIndex];
            const clipStartFrame = (clip.startOffSet * mediaData.videoProperties.frameRate) / 1000;
            if (clip.type === 'VIDEO_CLIP') {
                const videoFramePath = getFrame({
                    frame: currentFrame + 1 - clipStartFrame,
                    dir: 'intermediates',
                    format: 'png',
                    frameName: clip.id
                });

                const time = Date.now();
                const img = await PIXI.Assets.load(videoFramePath);
                fileSystemAccessTime += (Date.now() - time)

                const sprite = PIXI.Sprite.from(img);
                sprite.x = clip.coordinates.x;
                sprite.y = clip.coordinates.y;
                sprite.width = clip.coordinates.width;
                sprite.height = clip.coordinates.height;

                container.addChild(sprite);
            }
        }

        // const baseData = app.renderer.extract.canvas().toDataURL().replace('data:image/png;base64,', '');

        // const baseData = (await app.renderer.extract.base64()).replace('data:image/png;base64,', '');

        app.render();
        const baseData = app.view.toDataURL('image/jpeg', 1);   // 5ms

        // const baseData = app.renderer.extract.canvas(app.stage).toDataURL('image/jpeg', 1)
        // app.stage.removeChild(container)


        // const intArray = app.renderer.extract.pixels();

        // fs.writeFileSync(`coc/frame${currentFrame}.png
        // `, Buffer.from(intArray))

        // inputStream.write(Buffer.from(intArray, 'base64'));

        inputStream.write(Buffer.from(baseData, 'base64'));  // 0.15ms

        currentFrame++;
    }

    const pixiEnd = Date.now();
    console.log("pixi/node drawing time spent of all frames", pixiEnd - pixiStart, 'ms')

    inputStream.end();

    console.log('total file system access time', fileSystemAccessTime, 'ms');


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
            console.log('Video encoding finished');
            console.log('ffmpeg video conversion time spent', Date.now() - ffmpegStartTime, 'ms');
            command.input('output.mp4').ffprobe(function (err, metadata) {
                console.log('Duration of video', metadata.format.duration, 'seconds');
            });
        })
        .run()

    app.destroy();
})();


function getVisibleObjects(frame, frameRate) {
    const timeInstance = (frame * 1000) / frameRate;
    return mediaData.tracks.map((track) => track.clips.map((clip) => clip)).flat(1).filter((clip) => (['VIDEO_CLIP'].includes(clip.type) && clip.startOffSet <= timeInstance && timeInstance < (clip.startOffSet + clip.duration)));
}


// extractFrames('./assets/inputVideo2.mp4', {
//     duration: 2,
//     startTime: 0,
//     width: 720,
//     frameRate: 120,
//     outputFormat: 'png',
//     dir: 'intermediates',
//     frameName: 'inputVideo'
// });




// ffmpeg -i filename 2>&1 | sed -n "s/.*, \(.*\) fp.*/\1/p"