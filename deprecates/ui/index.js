const { createCanvas, loadImage } = require('canvas');
const { exec } = require('child_process');
const fs = require('fs');
const { downloadResource } = require('../../utilities/grains');

// Canvas setup
const canvas = createCanvas(800, 600);
const ctx = canvas.getContext('2d');


const videoUrl = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4';
const outputVideoPath = 'output.mp4';
const frameRate = 30; // Frames per second
const numFrames = 300; // Number of frames in the video
const receivedVideoPath = 'inputVideo.mp4';

// // Function to draw on the canvas
// function drawFrame(frameNumber) {
//   // Clear canvas
//   ctx.clearRect(0, 0, canvas.width, canvas.height);

//   // Draw something on the canvas (example: a red rectangle)
//   ctx.fillStyle = 'red';
//   ctx.fillRect(frameNumber % canvas.width, 0, 50, 50);

//   // Draw text (uncomment if using text)
//   // ctx.font = '20px YourFontName';
//   // ctx.fillStyle = 'white';
//   // ctx.fillText('Frame ' + frameNumber, 10, 30);
// }

// // Function to save each frame as an image
// function saveFrame(frameNumber) {
//   const outputImagePath = `frame_${frameNumber}.png`;
//   const imageBuffer = canvas.toBuffer('image/png');
//   fs.writeFileSync(outputImagePath, imageBuffer);
//   return outputImagePath;
// }

// Extract frames from video function
async function extractFrames(inputVideo, outputPattern, numFrames) {
  return new Promise((resolve, reject) => {
    const ffmpegCommand = `ffmpeg -i ${inputVideo} -vf fps=${frameRate} -vframes ${numFrames} ${outputPattern}`;

    exec(ffmpegCommand, (error, stdout, stderr) => {
      if (error) {
        reject(error);
      } else {
        resolve();
      }
    });
  });
}

// Render frame function
async function renderFrame(frameNumber) {
  // Clear canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Draw video frame on canvas
  const videoFrame = await loadImage(`frame_${frameNumber}.png`); // Use the input video file directly
  ctx.drawImage(videoFrame, 0, 0, canvas.width, canvas.height);

  // Draw something on the canvas (example: a red rectangle)
  ctx.fillStyle = 'red';
  ctx.fillRect(frameNumber % canvas.width, 0, 50, 50);

  // Save the canvas as an image
  const outputImagePath = `frame_${frameNumber}.png`;
  const imageBuffer = canvas.toBuffer('image/png');
  fs.writeFileSync(outputImagePath, imageBuffer);

  return outputImagePath;
}

// Generate frames function
async function generateFrames() {
  // Download the video file
  await downloadResource(videoUrl, receivedVideoPath);

  await extractFrames(receivedVideoPath, 'frame_%d.png', numFrames);

  // Render each frame and store the path
  const framePaths = [];
  for (let i = 1; i <= numFrames; i++) {
    const framePath = await renderFrame(i);
    framePaths.push(framePath);

    // drawFrame(i);
    // const framePath = saveFrame(i);
    // framePaths.push(framePath);
  }

  await new Promise((resolve) => {
    let i = numFrames;
    var tid = setInterval(() => {
      if (i++ > (numFrames + 20)) {
        // draw 20 lines
        clearInterval(tid);
        resolve('pop');
      }
      ctx.beginPath();
      ctx.strokeStyle = 'green';
      ctx.moveTo(Math.random() * 100, Math.random() * 100);
      ctx.lineTo(Math.random() * 100, Math.random() * 100);
      ctx.stroke();

      const outputImagePath = `frame_${i}.png`;
      const imageBuffer = canvas.toBuffer('image/png');
      fs.writeFileSync(outputImagePath, imageBuffer);

      framePaths.push(outputImagePath);
    }, 200);
  });

  // console.log('pop', pop)

  return framePaths;
}

// Generate video function
async function generateVideo() {
  // Generate frames
  const framePaths = await generateFrames();

  // Use ffmpeg to create a video from the frames and include audio
  // const ffmpegCommand = `ffmpeg -framerate ${frameRate} -i frame_%d.png -i inputVideo.mp4 -c:v libx264 -c:a aac -strict experimental -pix_fmt yuv420p ${outputVideoPath}`;

  const ffmpegCommand = `ffmpeg -framerate ${frameRate} -i frame_%d.png -c:v libx264 -pix_fmt yuv420p ${outputVideoPath}`;

  exec(ffmpegCommand, (error, stdout, stderr) => {
    if (error) {
      console.error(`Error: ${error.message}`);
      return;
    }
    // Optionally, clean up the individual frame images and downloaded video
    framePaths.forEach((framePath) => {
      console.log('deleting', framePath);
      fs.unlinkSync(framePath);
    });

    console.log('deleting', receivedVideoPath);
    fs.unlinkSync(receivedVideoPath);
  });
}

// Generate the video
generateVideo();
