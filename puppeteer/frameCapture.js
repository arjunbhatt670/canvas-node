/* global window */

const { Readable } = require("stream");
const { exec } = require('child_process');


const Puppeteer = require(".");
const frame2Video = require("#root/utilities/frame2Video.js");
const getConfig = require("../utilities/getConfig");
const { extractVideoFrames } = require("../video-generator/utils");
const { finalsPath } = require("../path");
const { print, TimeTracker } = require("../utilities/grains");

(async () => {
    const tempPaths = [];
    const timeTracker = new TimeTracker();
    const totalTimeTracker = new TimeTracker();

    const { data: rawConfig, downloadedData: config } = await getConfig();
    const videoFramesTempPath = await extractVideoFrames(config, 'png');
    tempPaths.push(videoFramesTempPath);

    totalTimeTracker.start();

    timeTracker.start()
    const puppeteer = new Puppeteer();
    const page = await puppeteer.init();
    await page.goto("http://localhost:3000/", {
        waitUntil: 'domcontentloaded'
    });

    timeTracker.log('[Puppeteer] Page loaded');

    timeTracker.start()
    /** wait for page to be ready to use react */
    await page.evaluate(function () {
        window.isHeadLess = true;
        return new Promise((resolve) => document.addEventListener('app-mounted', resolve));
    });


    timeTracker.log('React initialization completed');

    timeTracker.start();
    /** Pass the media config to the application using window object  */
    await page.evaluate(function (payload) {
        window.onPayload(payload);

        return new Promise((resolve) => document.addEventListener('assets-loaded', resolve))
    }, rawConfig);

    timeTracker.log('[Puppeteer] Initial assets loaded');


    const totalFrames = (config.videoProperties.duration * config.videoProperties.frameRate) / 1000;
    let currentFrame = 1;
    const inputStream = new Readable({
        read: () => { }
    });
    const loopTimeTracker = new TimeTracker();
    const evalTracker = new TimeTracker();
    const time = {
        draw: 0,
        extract: 0,
        communication: 0,
    };


    const ffmpegTimeTracker = new TimeTracker();
    ffmpegTimeTracker.start();
    frame2Video(inputStream, config.videoProperties.frameRate, `${finalsPath}/output_pup_60s.mp4`).then(() => {
        ffmpegTimeTracker.log('[ffmpeg] Final video generated');
        totalTimeTracker.log('Total Time');
    });

    ffmpegTimeTracker.pause();
    loopTimeTracker.start();
    while (currentFrame <= totalFrames + 1) {
        evalTracker.start();
        const { url, time: { drawTime, extractTime, evalTime } } = await page.evaluate(
            function (currentFrame) {
                const evalStart = Date.now();
                return new Promise((resolve) => {
                    let drawTime = Date.now();
                    document.addEventListener('canvas-seeked', function seeked() {
                        drawTime = Date.now() - drawTime;
                        let extractTime = Date.now();
                        if (currentFrame === 1) {
                            resolve({ url: null, time: {} });
                            document.removeEventListener('canvas-seeked', seeked);
                        }

                        const dataUrl = window.pixiApp.view.toDataURL('image/jpeg', 1);

                        extractTime = Date.now() - extractTime;

                        resolve({ url: dataUrl, time: { drawTime, extractTime, evalTime: Date.now() - evalStart } });

                        document.removeEventListener('canvas-seeked', seeked);
                    });

                    window.onFrameChange(currentFrame);
                })
            },
            currentFrame
        );

        if (!url) { currentFrame++; continue; }

        time.draw += drawTime;
        time.extract += extractTime;
        time.communication += (evalTracker.now() - evalTime);

        // fs.writeFileSync(`${rootPath}/puppeteerFrames/frame_${currentFrame}.jpeg`, url.split(';base64,').pop(), {
        //     encoding: 'base64'
        // })

        timeTracker.start();
        const buffer = Buffer.from(url
            // .split('base64,')[1]
            , "base64");
        inputStream.push(buffer); // 0.15ms
        time.extract += timeTracker.now();

        currentFrame++;
    }

    ffmpegTimeTracker.resume();
    print(`Processed ${totalFrames} frames.`);
    print(`Frames iteration took ${loopTimeTracker.now()} ms. (Drawing - ${time.draw} ms) (Extract - ${time.extract} ms) (Communication - ${time.communication} ms)`);

    inputStream.push(null);
    await puppeteer.exit();

    /** Remove temp files */
    tempPaths.forEach((path) => {
        exec(`rm -rf ${path}`);
    })
})();
