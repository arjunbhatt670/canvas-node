const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static')
const { PassThrough } = require('stream');
const puppeteer = require('puppeteer');


const record = async () => {
    console.log('starting');
    const time = 30;
    const frameRate = 30;

    console.log('Requested video time', time, 'seconds');
    console.log('Using frame rate', frameRate, 'fps');

    const browser = await puppeteer.launch({
        dumpio: true
    });
    const page = await browser.newPage();

    await page.goto('http://localhost:5173/');

    const startTime = Date.now();

    const { dataURL, createdFramesCount } = await page.evaluate(async function () {
        return await this.recordForPuppeteer(30, 30); //30200
    })

    console.log('Processed', createdFramesCount, 'frames.');

    const buffer = Buffer.from(dataURL.replace('data:video/webm;base64,', ''), 'base64');

    console.log("Video recording time spent - ", Date.now() - startTime, 'ms')

    const inputStream = new PassThrough();
    inputStream.write(buffer);
    inputStream.end();

    const command = ffmpeg();
    command.setFfmpegPath(ffmpegPath);
    let ffmpegStartTime;

    await new Promise((res, rej) => command.outputOptions([
        '-c:v libx264',     // Use H.264 codec
        '-preset veryfast', // Preset for fast encoding
        '-crf 23',          // Constant rate factor for video quality
        `-r ${frameRate}`,            // Frame rate
        `-t ${time}`,
        '-pix_fmt yuv420p', // Pixel format
        // '-c:a aac',
        // '-vf scale=1280:-2' // Scale width to 1280 pixels while preserving aspect ratio (change if needed)
    ]).input(inputStream)
        .output('output.mp4')
        .on('start', () => {
            ffmpegStartTime = Date.now();
        })
        .on('end', (args) => {
            console.log('Ffmpeg - Recorded chunks to video conversion time spent: ', Date.now() - ffmpegStartTime, 'ms');
            res(args);
        })
        .on('error', (error) => {
            rej(error)
        })
        .run());


    command.input('output.mp4').ffprobe(function (err, metadata) {
        console.log('Duration of video', metadata.format.duration, 'seconds');
    });


    await browser.close()
    console.log("end");
}

record()

