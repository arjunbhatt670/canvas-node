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

const ffmpegCommand = ffmpeg();
ffmpegCommand.setFfmpegPath(ffmpegPath);


const PIXI = require('@pixi/node');
const fs = require('fs');
const mediaData = require('./data.json')

async function extractFrames(inputVideoPath, outputPattern, { frameCount, startTime = 0, duration, frameRate }) {
    const stream = new Writable({
        write: (chunk) => {
            // fs.writeFileSync('intermediates/frame.png', chunk)
            console.log('arjun', chunk);
        }
    })

    // const stream = new PassThrough();

    let i = 0;
    return new Promise((resolve) => {
        ffmpegCommand
            .input(inputVideoPath)
            .fpsInput(frameRate)
            .setStartTime(startTime)
            .setDuration(duration)
            .frames(frameCount)
            .output(outputPattern)
            // .outputOptions(['-f matroska', '-c:v png'])
            .on('start', () => {
                console.log('frame extraction for', inputVideoPath, 'started');
            }).on('end', () => {
                console.log('frame extraction for', inputVideoPath, 'completed');
                resolve();
            }).on('error', (err, stderr, stdout) => {
                console.error('ffmpeg error:', err.message, stdout);
            })
            .run()
        // .pipe().on('data', (chunk) => {
        //     console.log('arjun data', chunk);
        //     fs.writeFile(`intermediates/file${i}.png`, chunk, () => { });
        //     // i++;
        // })
    });

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

// Call the async function to start generating the video
generateVideo({
    duration: 5, frameRate: 22, startTime: 9
}).catch(err => {
    console.error('Error generating video:', err);
    exec('rm -rf intermediates/*');
}).then(() => {
    exec('rm -rf intermediates/*');
});

// (async () => {

//     mediaData.tracks.forEach((v) => {
//         v.clips.forEach(async (clip) => {
//             await generateVideo()
//         })
//     });
//     await generateVideo(5);

// })();


// tracks will be mixed
// single track audio will be joined


