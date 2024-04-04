const fs = require('fs');
const { exec } = require('child_process');


const { WebGLRenderingContext } = require('gl')
const { Canvas, Image, CanvasRenderingContext2D, ImageData } = require('canvas');
const { JSDOM } = require('jsdom');
const Worker = require('worker_threads');

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

const app = new PIXI.Application({
    width: 800,
    height: 800
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

    bunny.rotation += 0.5;

    eggHead.x = 30 + frameNum
    eggHead.y = 30 + frameNum

    app.stage.addChild(eggHead);

    // extract and save the stage
    // app.renderer.render(app.stage);


    return Buffer.from(app.renderer.extract
        .canvas(app.stage)
        .toDataURL().split(',')[1], 'base64')

}



async function generateVideo() {
    // const videoStream = fs.createWriteStream('output.mp4');

    await loadAssets();

    // const command = ffmpeg();
    // command.setFfmpegPath(ffmpegPath);
    // command.inputOptions(['-f image2pipe', '-r 30', '-i pipe:0']);
    // command.outputOptions(['-c:v libx264', '-r 30', '-pix_fmt yuv420p']);


    // Create a pass-through stream for input
    // const inputStream = new PassThrough();
    // command.input(inputStream);

    let frame = 1;

    // Loop until there are no more frames to process
    while (frame <= 60) {
        const frameBuffer = await pixi(frame);
        if (frameBuffer) {
            fs.writeFileSync(`intermediates/frame_${frame}.png`, frameBuffer);
        }
        frame++;
    }

    app.destroy();
    console.log(`Processed ${frame} frames.`);

    const ffmpegCommand = `ffmpeg -framerate 30 -i intermediates/frame_%d.png -c:v libx264 -pix_fmt yuv420p output.mp4`;


    exec(ffmpegCommand, (error) => {
        if (error) {
            console.error(`Error: ${error.message}`);
            return;
        }
        // Optionally, clean up the individual frame images and downloaded video
        new Array(60).fill(1).forEach((_, i) => {
            console.log('deleting', `intermediates/frame_${i + 1}.png`);
            fs.unlinkSync(`intermediates/frame_${i + 1}.png`);
        });
    });

    // command.save('output.mp4')
    //     .on('error', (err, stdout, stderr) => {
    //         console.error('ffmpeg error:', err.message);
    //         console.error('ffmpeg stderr:', stderr);
    //         process.exit(1); // Terminate the Node.js process in case of error
    //     })
    //     .on('end', () => {
    //         console.log('Video encoding finished');
    //         process.exit(); // Terminate the Node.js process after video encoding is complete
    //     });
}

// Call the async function to start generating the video
generateVideo().catch(err => {
    app.destroy()
    console.error('Error generating video:', err);
});


