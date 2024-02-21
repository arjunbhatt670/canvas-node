const ffmpeg = require('fluent-ffmpeg')
const ffmpegPath = require('ffmpeg-static');
const { PassThrough } = require('stream');
const { exec } = require('child_process');


const { WebGLRenderingContext } = require('gl')
const { Canvas, Image, CanvasRenderingContext2D, ImageData, loadImage } = require('canvas');
const { JSDOM } = require('jsdom');
const Worker = require('worker_threads');
require('pixi-shim');
const { Writable } = require('node:stream');
const tmp = require("tmp")

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

const ffmpegCommand = ffmpeg();
ffmpegCommand.setFfmpegPath(ffmpegPath);


const PIXI = require('@pixi/node');
const fs = require('fs');


// convert stereo to mono
//ffmpeg -i stereo.flac -ac 1 mono.flac

//join 2 audio
///  ffmpeg -i mono.mp3 -i stereo.mp3  -filter_complex "[0:a][1:a]concat=n=2:v=0:a=1" output.mp3

// mix two audios
// ffmpeg -i stereo.mp3 -i mono.mp3 -filter_complex amix=inputs=2:duration=first  -ac 1  output1.mp3

// mix audio and video
// ffmpeg  -i video/video_0.mp4 -i audio/audio_0.mp3 -filter_complex  "[1:a] atrim=duration=10:start=120 [1], [0:a][1]   amix=inputs=2" -ac 2 output.mp3

// add silence between 2 audios and trim (video/audio)
// ffmpeg -loglevel verbose -y -i mono.mp3 -i stereo.mp3 -filter_complex "[0:a] silenceremove=stop_periods=1:stop_duration=1:stop_threshold=-50dB [first], [1:a] silenceremove=start_periods=1:start_duration=0:start_threshold=-50dB [second],aevalsrc=exprs=0:d=5[silence],[first] [silence] [second] concat=n=3:v=0:a=1" output.mp3
// ffmpeg -loglevel verbose -y -i audio/audio_0.mp3 -i video/video_0.mp4  -filter_complex "[0:a] silenceremove=stop_periods=1:stop_duration=1:stop_threshold=-50dB [first], [1:a] silenceremove=start_periods=1:start_duration=5:start_threshold=-50dB [second],aevalsrc=exprs=0:d=5[silence],[second][silence][first] concat=n=3:v=0:a=1" output.mp3
// latest
// ffmpeg -loglevel verbose -y -i audio/audio_0.mp3 -i video/video_0.mp4  -filter_complex "[0:a] atrim=duration=5:start=120  [first], [1:a] atrim=start=10:end=15 [second],aevalsrc=exprs=0:d=5[silence1],aevalsrc=exprs=0:d=5[silence2],[silence1][second][silence2][first] concat=n=4:v=0:a=1" output.mp3


async function extractFrames(inputVideoPath, outputPattern, { frameCount, startTime = 0, duration }) {
    // const stream = new Writable({
    //     write: (chunk) => {
    //         // fs.writeFileSync('intermediates/frame.png', chunk)
    //         console.log('arjun', chunk);
    //     },
    //     emitClose: true
    // })

    // const stream = fs.createWriteStream('intermediates/frame_%d.png');

    // const stream = new PassThrough();

    return new Promise((resolve) => {
        ffmpegCommand
            .input(inputVideoPath)
            .setStartTime(startTime)
            .setDuration(duration)
            .frames(frameCount)
            .output(outputPattern)
            // .outputOptions(['-f image2pipe'])
            .on('start', () => {
                console.log(extractFrames.name, 'started');
            }).on('end', () => {
                console.log(extractFrames.name, 'completed');
                resolve();
            }).on('error', (err, stderr, stdout) => {
                console.error('ffmpeg error:', err.message, stdout);
            })
            .run()
        // .stream(stream)
    });

}


async function generateVideo(secs) {

    const frameRate = 30;
    const frames = frameRate * secs;

    console.log('Requested video time', secs, 'seconds');
    console.log('Using frame rate', frameRate, 'fps');

    await PIXI.Assets.init({
        basePath: 'intermediates'
    })


    await extractFrames('./inputVideo.mp4', 'intermediates/frame_%d.png', 15 * 30);

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
    let frame = 1;


    let oldRef;

    const goXWise = async () => {
        const rectangle = new PIXI.Graphics();
        rectangle.beginFill(0xFF0000);
        rectangle.drawRect(frame % app.renderer.width, 0, 50, 50);
        rectangle.endFill();


        // const videoFrame = await loadImage(`intermediates/frame_${frame}.png`); // Use the input video file directly

        if (frame <= 360) {
            const img = await PIXI.Assets.load(`frame_${frame}.png`);
            app.stage.addChild(PIXI.Sprite.from(img));
        }

        if (oldRef) {
            app.stage.removeChild(oldRef)
        }
        oldRef = rectangle;

        app.stage.addChild(rectangle);

        app.render()

        const baseData = app.view.toDataURL();

        // if (frame === 2) {
        //     console.log('baseData', baseData)
        // }

        return Buffer.from(baseData, 'base64')
    }


    // Loop until there are no more frames to process
    const paths = []
    while (frame <= frames) {
        const frameBuffer = await goXWise();
        if (frameBuffer) {
            // fs.writeFileSync(`intermediates/frame_${frame}.png`, frameBuffer)
            // inputStream.write(frameBuffer)
            const tmpobj = tmp.fileSync({
                postfix: '.png'
            });
            fs.writeFileSync(tmpobj.name, frameBuffer);
            paths.push(tmpobj.name)
        }
        frame++;
    }


    const pixiEnd = Date.now();
    console.log("pixi/node drawing time spent of all frames", pixiEnd - pixiStart, 'ms')


    inputStream.end();

    // var tmpobj = tmp.fileSync({
    //     dir: 'mot/',
    // });
    // fs.writeFileSync(tmpobj.name, data);

    // tmpobj.removeCallback()

    paths.forEach((path) => {
        command.input(path);
    })
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
    // exec('rm -rf intermediates/*')
    console.log('Processed', frame, 'frames.');
}

// Call the async function to start generating the video
// generateVideo(30).catch(err => {
//     console.error('Error generating video:', err);
// });

(async () => {
    // await generateVideo(5);
    await extractFrames('inputVideo.mp4', 'intermediates/inputVideo_frame_%d.png', {
        duration: 7,
        startTime: 8,
        frameCount: 7 * 30

    });

})();


