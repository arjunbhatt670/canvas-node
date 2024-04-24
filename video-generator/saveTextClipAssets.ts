import fs from "fs";
import { type Page } from "puppeteer";

import { rootPath } from "#root/path";
import { TimeTracker } from "#root/utilities/grains";
import { getTextAssetPath } from "./utils";

export default async function saveTextClipAssets(
  config: Media,
  puppeteerPage: Page
) {
  const timeTracker = new TimeTracker();

  const textClips = config.tracks
    .map((track) => track.clips.filter((clip) => clip.type === "TEXT_CLIP"))
    .flat(1);

  if (textClips.length) {
    timeTracker.start();

    await puppeteerPage.addStyleTag({
      url: `http://localhost:8000/roboto.css`,
    });
    await puppeteerPage.addStyleTag({
      path: `${rootPath}/utilities/reset.css`,
    });
    await puppeteerPage.addScriptTag({
      path: `${rootPath}/utilities/html2Image.js`,
    });

    await Promise.all(
      textClips.map(async (clip) => {
        const dataUrl = await puppeteerPage.evaluate(
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

        const path = getTextAssetPath(clip.id, config.videoProperties.id);
        fs.writeFileSync(
          path,
          Buffer.from(dataUrl.split("base64,")[1], "base64url")
        );
      })
    );

    if (global.stats) global.stats.processText = timeTracker.now();
    timeTracker.log("Text snapshots extracted to file system");
  }
}
