import getConfig from "#root/utilities/getConfig";
import start from "./start";

(async () => {
  const { downloadedData: config } = await getConfig();

  start(config);
})();
