const looksSame = require('looks-same');

(async () => {
    let i = 1;

    while (i <= 50) {

        const { equal, diffImage, differentPixels } = await looksSame(`./puppeteerFrames/frame_${i + 1}.jpeg`, `./pixiFrames/frame_${i}.jpeg`, {
            createDiffImage: true,
            ignoreAntialiasing: true,
            antialiasingTolerance: 10,
        });

        diffImage?.save(`./compared/diff_custom_pixi_react${i}.jpeg`)
        console.log('for i = ', i, 'is both images equal?', equal, 'number of different pixels - ', differentPixels);

        i++;

    }
})();

// looksSame(`./puppeteerFrames/frame_2.jpeg`, `./puppeteerFrames/frame_3.jpeg`, {
//   createDiffImage: true,
// }).then(res => {
//   console.log(res.equal);
//   res.diffImage?.save(`./compared/diff_2.jpeg`)
// });


// fs.writeFileSync(`${rootPath}/pixiFrames/frame_${currentFrame}.jpeg`, baseData.split(';base64,').pop(), {
//     encoding: 'base64'
// })

// fs.writeFileSync(`${rootPath}/puppeteerFrames/frame_${currentFrame}.jpeg`, url.split(';base64,').pop(), {
//     encoding: 'base64'
// })