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

    await Promise.all([
      puppeteerPage.addStyleTag({
        content: `
          @import url('https://fonts.googleapis.com/css2?family=Roboto:ital,wght@0,100;0,300;0,400;0,500;0,700;0,900;1,100;1,300;1,400;1,500;1,700;1,900&display=swap');
          /* add more fonts as needed */
          `,
      }),
      puppeteerPage.addStyleTag({
        content: `
          html, body {
            margin: 0;
            padding: 0;
            border: 0;
            font-size: 100%;
            font: inherit;
            vertical-align: baseline;
          }
        `,
      }),
      puppeteerPage.addScriptTag({
        path: `${rootPath}/utilities/html2Image.js`,
      }),
    ]);

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
