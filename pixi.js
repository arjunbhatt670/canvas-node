const Worker = require('worker_threads');
global.Worker = Worker.Worker;
const fs = require('fs');
const { WebGLRenderingContext } = require('gl')
const { Canvas, Image, CanvasRenderingContext2D, ImageData } = require('canvas');
const { JSDOM } = require('jsdom');
const document = new JSDOM().window.document;
global.document = document;
global.window = document.defaultView;
global.window.document = global.document;




// global.WebGL2RenderingContext = WebGLRenderingContext
global.WebGLRenderingContext = WebGLRenderingContext
global.CanvasRenderingContext2D = CanvasRenderingContext2D

global.ImageData = ImageData

global.Canvas = Canvas;
global.Image = Image;

// Node canvas Image's dont currently have `addEventListener` so we fake it for now.
// We can always make updates to the node-canvas lib
// global.Image.prototype.addEventListener = function (event, fn) {
//     const img = this;

//     switch (event) {
//         case 'error':
//             img.onerror = function () {
//                 img.onerror = null;
//                 img.onload = null;
//                 fn.call(img);
//             };
//             break;

//         case 'load':
//             img.onload = function () {
//                 img.onerror = null;
//                 img.onload = null;
//                 fn.call(img);
//             };
//             break;
//     }
// };

// global.Image.prototype.removeEventListener = function () { };
// global.navigator = { userAgent: 'node.js' }; // could be anything


const PIXI = require('@pixi/node');

const pixi = async () => {
    // xvfb.start();
    console.log('starting')
    await PIXI.Assets.init();


    // const glProgram = WebGLRenderingContext.createProgram()

    // const glP = new GLProgram(glProgram)

    // const r = PIXI.autoDetectRenderer()

    // console.log('renderer', r.width)

    // const a = new PIXI.Application({
    //     context: new WebGLRenderingContext(),
    //     forceCanvas: true,
    //     clearBeforeRender: true,
    // });

    // console.log('buffer', a);

    // const canvas = createCanvas(500, 500)

    // The application will create a renderer using WebGL. It will also setup the ticker
    // and the root stage Container.
    const app = new PIXI.Application({
        width: 800,
        // forceCanvas: true
        // view: canvas,
        // context: new WebGLRenderingContext()
    });

    // app.renderer = new PIXI.Renderer({
    //     width: 800
    // })

    // app.destroy();


    // load a sprite

    const bunnyB = await PIXI.Assets.load('https://pixijs.com/assets/bunny.png');

    // console.log('pop2', bunnyTexture)
    // create sprite from texture
    const bunny = PIXI.Sprite.from(bunnyB);

    // console.log('app.renderer', app.renderer)

    // Setup the position of the bunny
    bunny.x = app.renderer.width / 2;
    bunny.y = app.renderer.height / 2;

    // Rotate around the center
    bunny.anchor.x = 0.5;
    bunny.anchor.y = 0.5;

    // Add the bunny to the scene we are building.
    app.stage.addChild(bunny);

    // Listen for frame updates
    // app.ticker.add(() => {
    //     // each frame we spin the bunny around a bit
    // });
    bunny.rotation += 0.5;

    // const container = new PIXI.Container();

    // app.stage.addChild(container);

    // const videoB = await PIXI.Assets.load('https://pixijs.com/assets/video.mp4');

    // // create a new Sprite using the video texture (yes it's that easy)
    // const videoSprite = PIXI.Sprite.from(videoB);

    // // // Stetch the fullscreen
    // videoSprite.width = app.screen.width;
    // videoSprite.height = app.screen.height;

    // extract and save the stage
    app.renderer.render(app.stage);
    const base64Image = app.renderer.extract
        .canvas(app.stage)
        .toDataURL();

    const base64Data = base64Image.replace(/^data:image\/png;base64,/, '');
    const output = `test.png`;

    console.log(output)

    fs.writeFileSync(output, base64Data, 'base64');
    // xvfb.stop();

    app.destroy()
    console.log("end")
}











// downloadVideo('https://cdn.pixabay.com/photo/2015/03/17/02/01/cubes-677092_1280.png', 'bunny.png');

// Replace these with your input video and output image directory
// const inputVideoPath = 'inputVideo.mp4';
// const outputImageDirectory = 'intermediates';

// Create a readable stream from the video file
// const videoStream = fs.createReadStream(inputVideoPath);

// // Run FFmpeg with input as the video stream and output as the image pipe
// ffmpeg().input(videoStream)
//     // .inputOptions('-framerate', "10")
//     .inputFormat('mp4') // specify the input format if needed
//     .outputFormat('image2pipe')
//     .on('end', () => {
//         console.log('Image extraction finished');
//     })
//     .on('error', (err) => {
//         console.error('Error:', err);
//     })
//     .pipe()
//     .on('data', (data) => {
//         // `data` is a Buffer containing the image frame
//         // Handle each frame as it arrives (e.g., save it to a file, process it, etc.)
//         const frameNumber = Date.now(); // You might want to use a better method to generate frame numbers
//         const outputImagePath = `${outputImageDirectory}/frame_${frameNumber}.png`;
//         fs.writeFileSync(outputImagePath, data);
//         console.log(`Frame ${frameNumber} saved to ${outputImagePath}`);
//     });

// var xvfb = new Xvfb();

pixi()

