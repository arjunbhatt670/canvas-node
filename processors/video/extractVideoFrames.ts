async function extractVideoFrames(videoUrl, fps = 25) {
  const videoBlob = await fetch(videoUrl)
    .then((r) => r.blob())
    .catch((error) => {
      console.error("Network error: ", error);
      throw error;
    });
  const videoObjectUrl = URL.createObjectURL(videoBlob);

  const video = document.createElement("video");
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("No canvas found");
  }

  return await new Promise((resolve, reject) => {
    video.addEventListener("canplaythrough", function () {
      const [w, h] = [video.videoWidth, video.videoHeight];
      canvas.width = w;
      canvas.height = h;

      const frames = [];
      const interval = 1 / fps;
      let currentTime = 0;

      const drawFrame = (time) => {
        video.currentTime = time;
        context.drawImage(video, 0, 0, w, h);
        const base64ImageData = canvas.toDataURL();
        frames.push(base64ImageData);
      };

      const extractFrames = (time) => {
        if (time < video.duration) {
          drawFrame(time);
          setTimeout(() => extractFrames(time + interval), 0);
        } else {
          URL.revokeObjectURL(videoObjectUrl);
          resolve(frames);
        }
      };

      extractFrames(currentTime);
    });

    video.addEventListener("error", function () {
      reject(new Error("Failed to load video"));
    });

    video.src = videoObjectUrl;
  });
}
