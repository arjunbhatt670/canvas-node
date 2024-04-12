import fs from "fs";

import { rootPath, tmpDir } from "#root/path";
import Puppeteer from "#root/puppeteer/index";
import { TimeTracker } from "#root/utilities/grains";

export default async function saveTextClipAssets(config: Media) {
  const timeTracker = new TimeTracker();

  const textClips = config.tracks
    .map((track) => track.clips.filter((clip) => clip.type === "TEXT_CLIP"))
    .flat(1);

  if (textClips.length) {
    timeTracker.start();
    const puppeteer = new Puppeteer();
    const page = await puppeteer.init();
    timeTracker.log("\n\nPuppeteer loaded");

    timeTracker.start();
    await page.addStyleTag({
      url: `http://localhost:5173/roboto.css`,
    });
    await page.addStyleTag({
      path: `${rootPath}/utilities/reset.css`,
    });
    await page.addScriptTag({
      path: `${rootPath}/utilities/html2Image.js`,
    });
    timeTracker.log("Text clip dependencies loaded");

    timeTracker.start();
    const paths = await Promise.all(
      textClips.map(async (clip) => {
        const dataUrl = await page.evaluate(
          function (htmlString, w, h) {
            document.body.innerHTML = htmlString;

            return window.html2Image.toPng(document.body, {
              width: w,
              height: h,
              quality: 1,
            });
          },
          clip.htmlContent!,
          clip.coordinates.width,
          clip.coordinates.height
        );

        const path = `${tmpDir}/${clip.id}.png`;
        fs.writeFileSync(
          path,
          Buffer.from(dataUrl.split("base64,")[1], "base64url")
        );

        return path;
      })
    );

    timeTracker.log("Text snapshots extracted to file system");

    puppeteer.exit();

    return paths;
  }
}
