import looksSame from "looks-same";
import fs from "fs";
import { rootPath } from "#root/path";
import { Url } from "./grains";

if (!fs.existsSync(`${rootPath}/compared`))
  fs.mkdirSync(`${rootPath}/compared`);

export default async function compareImages(image1: string, image2: string) {
  const { equal, diffImage, differentPixels } = await looksSame(
    image1,
    image2,
    {
      createDiffImage: true,
      ignoreAntialiasing: true,
      antialiasingTolerance: 10,
    }
  );

  diffImage?.save(`${rootPath}/compared/diff(${Url(image1).getFile()}).jpeg`);

  console.log(
    image1,
    image2,
    equal ? "Both images are equal" : "Images are not equal",
    "\n",
    !equal ? `Number of different pixels - ${differentPixels}` : ""
  );
}

// console.log(process.env.image1, process.env.image2);

// if (process.env.image1 && process.env.image2)
//   compareImages(process.env.image1, process.env.image2);

for (let i = 1; i <= 20; i++) {
  compareImages(
    `${rootPath}/pixiFrames/frame${i}.png`,
    `${rootPath}/puppeteerFrames/frame${i}.png`
  );
}

// fs.writeFileSync(`${rootPath}/pixiFrames/frame_${currentFrame}.jpeg`, baseData.split(';base64,').pop(), {
//     encoding: 'base64'
// })

// fs.writeFileSync(`${rootPath}/puppeteerFrames/frame_${currentFrame}.jpeg`, url.split(';base64,').pop(), {
//     encoding: 'base64'
// })

// ffmpeg -i finals/merge.mp4 -r 30 pixiFrames/frame%0d.png
// image1=pixiFrames/frame2.png image2=puppeteerFrames/frame2.png ts-node utilities/compareImages.ts
