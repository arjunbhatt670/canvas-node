const ffmpeg = require('fluent-ffmpeg')
const ffmpegPath = require('ffmpeg-static');
const { PassThrough } = require('stream');


const { WebGLRenderingContext } = require('gl')
const { Canvas, Image, CanvasRenderingContext2D, ImageData } = require('canvas');
const { JSDOM } = require('jsdom');
const Worker = require('worker_threads');

global.Worker = Worker.Worker;
// const document = new JSDOM().window.document;
// global.document = document;
// global.window = document.defaultView;
// global.window.document = global.document;
// global.WebGLRenderingContext = WebGLRenderingContext
// global.CanvasRenderingContext2D = CanvasRenderingContext2D
global.ImageData = ImageData
// global.Canvas = Canvas;
// global.Image = Image;

const PIXI = require('@pixi/node');

const app = new PIXI.Application({
    width: 1200,
    height: 720,
});
var bunny, eggHead;


async function loadAssets() {
    const bunnyAsset = await PIXI.Assets.load('https://pixijs.com/assets/bunny.png');
    const eggHeadAsset = await PIXI.Assets.load('https://pixijs.com/assets/eggHead.png');

    bunny = PIXI.Sprite.from(bunnyAsset);
    eggHead = PIXI.Sprite.from(eggHeadAsset);
}


const pixi = async (frameNum) => {
    console.log('starting', frameNum);


    bunny.x = app.renderer.width / 2;
    bunny.y = app.renderer.height / 2;

    app.stage.addChild(bunny);



    // const ctx = app.view.getContext('2d')

    // ctx.fillStyle = 'red';
    // ctx.fillRect(frameNum % app.renderer.width, 0, 50, 50);

    bunny.rotation += 0.5;

    eggHead.x = 30 + frameNum
    eggHead.y = 30 + frameNum

    app.stage.addChild(eggHead);

    // app.renderer.render(app.stage);

    return Buffer.from(app.renderer.extract
        .canvas(app.stage)
        .toDataURL().split(',')[1], 'base64')

}

async function generateVideo() {
    await loadAssets();

    const command = ffmpeg();
    command.setFfmpegPath(ffmpegPath);
    // command.inputOptions(['-f image2pipe', '-r 30', '-i pipe:0']);
    command.outputOptions([
        '-c:v libx264',     // Use H.264 codec
        '-preset veryfast', // Preset for fast encoding
        '-crf 23',          // Constant rate factor for video quality
        '-r 30',            // Frame rate
        '-pix_fmt yuv420p', // Pixel format
        '-vf scale=1280:-2' // Scale width to 1280 pixels while preserving aspect ratio (change if needed)
    ]);

    const inputStream = new PassThrough();
    let frame = 0;

    // Loop until there are no more frames to process
    while (frame <= 100) {
        const frameBuffer = await pixi(frame);
        if (frameBuffer) {
            inputStream.write(frameBuffer)
        }
        frame++;
    }
    inputStream.end();

    command.input(inputStream);

    command.output('output.mp4')
        .on('start', () => {
            console.log('ffmpeg process started');
        })
        .on('error', (err, stdout, stderr) => {
            console.error('ffmpeg error:', err.message);
            console.error('ffmpeg stderr:', stderr);
        })
        .on('end', () => {
            console.log('Video encoding finished');
        })
        .run();

    app.destroy();
    console.log(`Processed ${frame} frames.`);
}

// Call the async function to start generating the video
generateVideo().catch(err => {
    app.destroy()
    console.error('Error generating video:', err);
});


