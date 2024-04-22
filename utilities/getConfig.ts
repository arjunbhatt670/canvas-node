import { downloadMedia, TimeTracker } from "./grains";

const apiURL = "http://localhost:8000";

export default async function getConfig(configName: string) {
  const timeTracker = new TimeTracker();
  timeTracker.start();
  const data = await fetch(`${apiURL}/config?fileName=${configName}`).then(
    (value) => value.json()
  );

  const downloadedData = await downloadMedia(data);
  timeTracker.log("Fetched media assets");

  return { data, downloadedData };
}
