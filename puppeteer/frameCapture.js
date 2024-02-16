const ffmpeg = require("fluent-ffmpeg");
const ffmpegPath = require("ffmpeg-static");
const { PassThrough } = require("stream");
const Puppeteer = require(".");

const frameCapture = async () => {
    console.log("starting");
    const time = 10;
    const frameRate = 60;

    console.log("Requested video time", time, "seconds");
    console.log("Using frame rate", frameRate, "fps");

    const puppeteer = new Puppeteer();
    const page = await puppeteer.init();


    await page.goto("http://localhost:5173/");


    const dataURLs = await page.evaluate(
        async function (time) {
            return await this.captureFramesFromCanvas(time);
        },
        time
    );

    const inputStream = new PassThrough();
    dataURLs.forEach((dataURL) => {
        inputStream.write(
            Buffer.from(dataURL.replace("data:image/png;base64,", ""), "base64")
        );
    });

    inputStream.end();

    const command = ffmpeg();
    command.setFfmpegPath(ffmpegPath);

    await new Promise((res, rej) =>
        command
            .input(inputStream)
            .fpsInput(frameRate)
            .output("output.mp4")
            .fpsOutput(frameRate)
            .setDuration(time)
            .on("end", (args) => {
                console.log("video generated");
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
