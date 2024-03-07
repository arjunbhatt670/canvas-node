const { PassThrough } = require("stream");
const fs = require('fs');


const Puppeteer = require(".");
const { asyncIterable } = require("../utils");
const frame2Video = require("../frame2Video");

(async () => {

    const puppeteerLoadStart = Date.now();
    const puppeteer = new Puppeteer();
    const page = await puppeteer.init();


    await page.goto("http://localhost:3000/");

    console.log('Time taken by puppeteer to load page', Date.now() - puppeteerLoadStart, 'ms')

    const inputStream = new PassThrough();

    const assetsLoadStart = Date.now();

    await page.evaluate(function () {
        return new Promise((resolve) => {
            document.addEventListener('assets-loaded', function loaded() {
                resolve();
                document.removeEventListener('assets-loaded', loaded);
            })
        });
    });

    console.log('Time taken by puppeteer to load assets', Date.now() - assetsLoadStart, 'ms')

    const startTime = Date.now();
    /** @type {HTMLInputElement} */
    const inputElement = await page.$('#currentTimeInput');
    const canvas = await page.$("canvas");

    const duration = await page.evaluate((inputElement) => +inputElement.getAttribute('data-duration'), inputElement);
    const frameRate = await page.evaluate((inputElement) => +inputElement.getAttribute('data-frame-rate'), inputElement);
    const totalFrames = (duration * frameRate) / 1000;

    for await (const frameNum of asyncIterable(totalFrames)) {
        const timeMoment = ((frameNum + 1) * 1000) / frameRate
        const url = await page.evaluate(
            function (timeMoment, inputElement, canvas) {
                return new Promise((resolve) => {
                    const event = new Event('change');
                    inputElement.value = timeMoment;

                    document.addEventListener('canvas-seeked', function seeked() {
                        const dataUrl = canvas.toDataURL('image/jpeg', 1);
                        resolve(dataUrl);
                        document.removeEventListener('canvas-seeked', seeked);
                    })
                    inputElement.dispatchEvent(event);
                })
            },
            timeMoment, inputElement, canvas
        );

        inputStream.write(Buffer.from(url, "base64"));
    }

    await puppeteer.exit();

    console.log('Processed', totalFrames, 'frames.');
    console.log("Frames extraction time spent - ", Date.now() - startTime, 'ms')

    inputStream.end();

    frame2Video(inputStream, frameRate, 'output.mp4');
})();
