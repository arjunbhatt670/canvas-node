const ffmpeg = require('fluent-ffmpeg')
const { PassThrough } = require('stream');
const Worker = require('worker_threads');
global.Worker = Worker.Worker;
const { WebGLRenderingContext } = require('gl')
const { Canvas, Image, CanvasRenderingContext2D, ImageData } = require('canvas');
const { JSDOM } = require('jsdom');
const document = new JSDOM().window.document;
global.document = document;
global.window = document.defaultView;
global.window.document = global.document;

global.WebGLRenderingContext = WebGLRenderingContext
global.CanvasRenderingContext2D = CanvasRenderingContext2D

global.ImageData = ImageData

global.Canvas = Canvas;
global.Image = Image;


const puppeteer = require('puppeteer');

const record = async () => {
    console.log('starting');

    const browser = await puppeteer.launch({
        dumpio: true
    });
    const page = await browser.newPage();

    await page.goto('http://localhost:5173/');

    await page.click('#startButton');

    const dataURL = await page.evaluate(async function () {
        return await document.recordForPuppeteer(2000);
    })

    const buffer = Buffer.from(dataURL.replace('data:video/webm;base64,', ''), 'base64');

    const inputStream = new PassThrough();
    inputStream.write(buffer);
    inputStream.end();

    await new Promise((res, rej) => ffmpeg(inputStream)
        .output('output.mp4')
        .on('end', (args) => {
            console.log('video generated');
            res(args);
        })
        .on('error', (error) => {
            rej(error)
        })
        .run());


    ffmpeg.ffprobe('output.mp4', function (err, metadata) {
        console.log('Duration of video', metadata.format.duration.toString());
    });


    await browser.close()
    console.log("end");
}





record()

