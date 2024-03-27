const { Readable } = require('stream');
const { exec } = require('child_process');
const fs = require('fs');

const PIXI = require('./pixi-node');
const frame2Video = require('./frame2Video');
const { getFramePath, Url, print } = require('./utils');
const { tmpDir, finalsPath } = require('./path');
const { getVisibleObjects, extractVideoFrames } = require('./pixiUtils');
const { getConfig } = require('./service');

(async () => {
    const tempPaths = [];
    const imgType = 'png';

    const { downloadedData: config } = await getConfig();

    const videoFramesTempPath = await extractVideoFrames(config, imgType);

    tempPaths.push(videoFramesTempPath);

    const totalTimeStart = Date.now();

    const shapeClips = config.tracks.map((track) => track.clips.map((clip) => clip.type === 'SHAPE_CLIP' ? clip : null)).flat(1).filter(Boolean);

    const shapeExtractStart = Date.now();
    shapeClips.map((clip) => {
        const path = `${tmpDir}/${clip.id}.png`;
        tempPaths.push(path);
        fs.writeFileSync(path, Buffer.from(clip.shapeInfo.shapeMediaUrl.split('base64,')[1], 'base64url'))
    })
    print(`Shapes extraction time ${Date.now() - shapeExtractStart} ms`);

    const imageClips = config.tracks.map((track) => track.clips.map((clip) => clip.type === 'IMAGE_CLIP' ? clip : null)).flat(1).filter(Boolean);

    const imageExtractStart = Date.now();
    imageClips.map((clip) => {
        const path = `${tmpDir}/${clip.id}.${Url(clip.sourceUrl).getExt()}`;
        tempPaths.push(path);
        fs.copyFileSync(clip.sourceUrl, path);
    })
    print(`images extraction time ${Date.now() - imageExtractStart} ms`);


    const totalFrames = (config.videoProperties.duration * config.videoProperties.frameRate) / 1000;

    const app = new PIXI.Application({
        width: config.videoProperties.width,
        height: config.videoProperties.height,
        hello: true,
        antialias: true
    });

    app.renderer.background.color = '#ffffff';

    await PIXI.Assets.init({
        basePath: tmpDir,
        skipDetections: true
    });

    const assetLoadStart = Date.now();
    await PIXI.Assets.load(fs.readdirSync(tmpDir))
    print(`Assets loaded in pixi cache took ${Date.now() - assetLoadStart} ms`)


    const inputStream = new Readable();
    const statics = new Map();
    let time = {
        draw: 0,
        extract: 0,
        total: Date.now()
    };
    let currentFrame = 1;

    frame2Video(inputStream, config.videoProperties.frameRate, process.env.OUTPUT ?? `${finalsPath}/output_pixi_60s.mp4`).then(() => {
        print(`Total Time - ${Date.now() - totalTimeStart} ms`)
    });

    while (currentFrame <= totalFrames) {
        const drawStart = Date.now();
        const currentTime = ((currentFrame - 1) * 1000) / config.videoProperties.frameRate;
        const clips = getVisibleObjects(config, currentTime);

        const container = new PIXI.Container();
        app.stage = container;

        for (let clipIndex = 0; clipIndex < clips.length; clipIndex++) { // 5ms
            const clip = clips[clipIndex];
            const clipStartFrame = Math.round((clip.startOffSet * config.videoProperties.frameRate) / 1000);

            switch (clip.type) {
                case 'VIDEO_CLIP': {
                    try {
                        const videoFramePath = getFramePath({
                            frame: currentFrame - clipStartFrame,
                            format: imgType,
                            frameName: clip.id
                        });

                        const img = await PIXI.Assets.get(videoFramePath);

                        const sprite = PIXI.Sprite.from(img);
                        sprite.x = clip.coordinates.x;
                        sprite.y = clip.coordinates.y;
                        sprite.width = clip.coordinates.width;
                        sprite.height = clip.coordinates.height;

                        container.addChild(sprite);
                    } catch (_err) {
                        /**  */
                    }

                    break;
                }

                case 'SHAPE_CLIP': {
                    if (statics.has(clip)) {
                        container.addChild(statics.get(clip));
                    } else {
                        const img = await PIXI.Assets.load(`${clip.id}.png`);

                        const sprite = PIXI.Sprite.from(img);
                        sprite.x = clip.coordinates.x;
                        sprite.y = clip.coordinates.y;
                        sprite.width = clip.coordinates.width;
                        sprite.height = clip.coordinates.height;

                        statics.set(clip, sprite);
                        container.addChild(sprite);
                    }

                    break;
                }

                case 'IMAGE_CLIP': {
                    if (statics.has(clip)) {
                        container.addChild(statics.get(clip));
                    } else {
                        const img = await PIXI.Assets.load(`${clip.id}.${Url(clip.sourceUrl).getExt()}`);

                        const sprite = PIXI.Sprite.from(img);
                        sprite.x = clip.coordinates.x;
                        sprite.y = clip.coordinates.y;
                        sprite.width = clip.coordinates.width;
                        sprite.height = clip.coordinates.height;

                        statics.set(clip, sprite);
                        container.addChild(sprite);
                    }

                    break;
                }
            }
        }

        app.render();
        time.draw += (Date.now() - drawStart);

        const extractStart = Date.now();

        const baseData = app.view.toDataURL('image/jpeg', 1);  // 5ms
        const bufferData = Buffer.from(baseData
            // .split('base64,')[1]
            , 'base64');
        inputStream.push(bufferData); // 0.15ms

        time.extract += (Date.now() - extractStart);

        // fs.writeFileSync(`${rootPath}/pixiFrames/frame_${currentFrame}.jpeg`, baseData.split(';base64,').pop(), {
        //     encoding: 'base64'
        // })

        currentFrame++;
    }

    inputStream.push(null);
    app.destroy();

    time.total = Date.now() - time.total;
    print(`Processed ${totalFrames} frames.`);
    print(`Canvas drawing took ${time.total} ms. (Drawing - ${time.draw} ms) (Extract - ${time.extract} ms)`);

    /** Remove temp files */
    tempPaths.forEach((path) => {
        exec(`rm -rf ${path}`);
    })
})();