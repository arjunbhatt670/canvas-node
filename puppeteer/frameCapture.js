const ffmpeg = require("fluent-ffmpeg");
const ffmpegPath = require("ffmpeg-static");
const { PassThrough } = require("stream");
const Puppeteer = require(".");
const { asyncIterable } = require("../utils");

const frameCapture = async () => {
    console.log("starting");
    const time = 10;
    const frameRate = 30;
    const totalFrames = time * frameRate

    console.log("Requested video time", time, "seconds");
    console.log("Using frame rate", frameRate, "fps");

    const puppeteer = new Puppeteer();
    const page = await puppeteer.init();


    await page.goto("http://localhost:5174/");

    const inputStream = new PassThrough();

    await page.evaluate(() => this.initCanvas())

    const startTime = Date.now()
    for await (const frameNum of asyncIterable(totalFrames)) {
        await page.evaluate(
            function (arg1, arg2) {
                return this.captureFrameNumber(arg1, arg2);
            },
            frameNum + 1, frameRate
        );

        // console.log('frameNum', frameNum)


        const canvas = await page.$("canvas");
        const url = await page.evaluate((canvas) => canvas.toDataURL('image/jpeg', 1), canvas);
        inputStream.write(
            Buffer.from(url.replace("data:image/png;base64,", ""), "base64")
        );
    }


    console.log('Processed', totalFrames, 'frames.');
    console.log("Frames extraction time spent - ", Date.now() - startTime, 'ms')

    inputStream.end();

    const command = ffmpeg();
    command.setFfmpegPath(ffmpegPath);
    let ffmpegStartTime;

    await new Promise((res, rej) =>
        command
            .input(inputStream)
            .fpsInput(frameRate)
            .output("output.mp4")
            .fpsOutput(frameRate)
            .setDuration(time)
            .on('start', () => {
                ffmpegStartTime = Date.now();
            })
            .on("end", (args) => {
                console.log('Ffmpeg frames to video conversion time spent: ', Date.now() - ffmpegStartTime, 'ms');
                res(args);
            })
            .on("error", (error) => {
                rej(error);
            })
            .run()
    );

    command.input("output.mp4").ffprobe(function (err, metadata) {
        console.log("Duration of video", metadata.format.duration, "seconds");
    });

    await puppeteer.exit();
    console.log("end");
};

frameCapture();


// const command = ffmpeg();
// command.setFfmpegPath(ffmpegPath);

// command.input('assets/WMV_Video_File.wmv').output('output.mp4').withAudioCodec('flac').run();
