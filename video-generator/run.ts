import getConfig from "#root/utilities/getConfig";
import createVideo from "./createVideo";
(async () => {
  if (!process.env.OUTPUT) {
    throw new ReferenceError("Please provide OUTPUT env variable");
  }

  const { downloadedData: config } = await getConfig("video");

  createVideo(process.env.OUTPUT, config);
})();
