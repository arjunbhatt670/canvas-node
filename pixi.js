const ffmpeg = require('fluent-ffmpeg')
const ffmpegPath = require('ffmpeg-static');
const { PassThrough } = require('stream');


const { WebGLRenderingContext } = require('gl')
const { Canvas, Image, CanvasRenderingContext2D, ImageData } = require('canvas');
const { JSDOM } = require('jsdom');
const Worker = require('worker_threads');
require('pixi-shim')

global.Worker = Worker.Worker;
const document = new JSDOM().window.document;
global.document = document;
global.window = document.defaultView;
global.window.document = global.document;
global.WebGLRenderingContext = WebGLRenderingContext
global.CanvasRenderingContext2D = CanvasRenderingContext2D
global.ImageData = ImageData
global.Canvas = Canvas;
global.Image = Image;


const PIXI = require('@pixi/node');


async function generateVideo(secs) {

    console.log('Requested video time', secs, 'seconds');

    const frameRate = 30;
    const frames = frameRate * secs;

    console.log('Using frame rate', frameRate, 'fps')

    const command = ffmpeg();
    command.setFfmpegPath(ffmpegPath);
    command.outputOptions([
        '-c:v libx264',     // Use H.264 codec
        '-preset veryfast', // Preset for fast encoding
        '-crf 23',          // Constant rate factor for video quality
        `-r ${frameRate}`,            // Frame rate
        `-t ${secs}`,
        '-pix_fmt yuv420p', // Pixel format
        // '-vf scale=1280:-2' // Scale width to 1280 pixels while preserving aspect ratio (change if needed)
    ]);
    const inputStream = new PassThrough();

    const pixiStart = Date.now();

    const app = new PIXI.Application({
        width: 1200,
        height: 720,
        hello: true
    });
    let frame = 0;


    let oldRef;

    const goXWise = async () => {
        const rectangle = new PIXI.Graphics();
        rectangle.beginFill(0xFF0000);
        rectangle.drawRect(frame % app.renderer.width, 0, 50, 50);
        rectangle.endFill();

        if (oldRef) {
            app.stage.removeChild(oldRef)
        }
        oldRef = rectangle;

        app.stage.addChild(rectangle);

        app.render()

        const baseData = app.view
            .toDataURL().replace('data:image/png;base64,', '')

        return Buffer.from(baseData, 'base64')
    }


    // Loop until there are no more frames to process
    while (frame < frames) {
        const frameBuffer = await goXWise();
        if (frameBuffer) {
            // fs.writeFileSync(`intermediates/frame_${frame}.png`, frameBuffer)
            inputStream.write(frameBuffer)
        }
        frame++;
    }

    // const vidRes = new PIXI.VideoResource('https://pixijs.com/assets/video.mp4');

    // const videoTexture = await PIXI.Texture.from('./inputVideo.mp4', {
    //     resourceOptions: {
    //         autoLoad: false
    //     }
    // });
    // const videoSprite = new PIXI.Sprite(videoTexture);
    // app.stage.addChild(videoSprite);
    // const videoController = videoSprite.texture.baseTexture.getDrawableSource();
    // videoController.play()


    // while (frame < frames) {
    //     const frameBuffer = Buffer.from(await app.renderer.extract.base64(), 'base64')
    //     if (frameBuffer) {
    //         // fs.writeFileSync(`intermediates/frame_${frame}.png`, frameBuffer)
    //         inputStream.write(frameBuffer)
    //     }
    //     frame++;
    // }





    const pixiEnd = Date.now();
    console.log("pixi/node drawing time spent of all frames", pixiEnd - pixiStart, 'ms')


    inputStream.end();

    command.input(inputStream);
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
generateVideo(30).catch(err => {
    console.error('Error generating video:', err);
});


