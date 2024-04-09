import looksSame from "looks-same";
import fs from "fs";
import { rootPath } from "#root/path";

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

  if (!fs.existsSync(`${rootPath}/compared`))
    fs.mkdirSync(`${rootPath}/compared`);

  diffImage?.save(
    `${rootPath}/compared/diff(${new Date().toLocaleTimeString()}).jpeg`
  );

  console.log(
    equal ? "Both images are equal" : "Images are not equal",
    "\n",
    !equal ? `Number of different pixels - ${differentPixels}` : ""
  );
}

console.log(process.env.image1, process.env.image2);

if (process.env.image1 && process.env.image2)
  compareImages(process.env.image1, process.env.image2);

// fs.writeFileSync(`${rootPath}/pixiFrames/frame_${currentFrame}.jpeg`, baseData.split(';base64,').pop(), {
//     encoding: 'base64'
// })

// fs.writeFileSync(`${rootPath}/puppeteerFrames/frame_${currentFrame}.jpeg`, url.split(';base64,').pop(), {
//     encoding: 'base64'
// })

// ffmpeg -i abc.mp4 -r 30 pixiFrames/frame%0d.png
// image1=pixiFrames/frame2.png image2=puppeteerFrames/frame2.png ts-node utilities/compareImages.ts
