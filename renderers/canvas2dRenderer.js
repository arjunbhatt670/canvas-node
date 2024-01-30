// const image = new Image();
// image.width = 1600;
// image.height = 900;
// image.src =
//   "https://cdn.pixabay.com/photo/2015/03/17/02/01/cubes-677092_1280.png";
const getPreLoadedVideoSrcFromURL = async (url) => {
  const resp = await fetch(url);

  return await resp.blob()
};
// const videoPromise = ;
let video = {}
// videoPromise.then((mediaSrc) => {
//   console.log("VIDEO LOADED");
//   video = mediaSrc;
//   // video.width = 800;
//   // video.height = 500;
//   // video.src = mediaSrc;
//   // video.controls = true;
//   // video.isPlaying = false;
//   // video.play();
//   // video.style = "visibility: hidden;";
//   // document.body.appendChild(video);

//   // audio = document.createElement("audio");
//   // audio.src = mediaSrc;
//   // audio.controls = true;
//   // audio.play();
//   // audio.style = "visibility: hidden;";
//   // document.body.appendChild(audio);
// });
function interpolate(t, [t1, t2], [v1, v2]) {
  const slope = (v2 - v1) / (t2 - t1);
  return v1 + slope * (t - t1);
}
const updateVideoCurrentTime = async (video, newTime) => {
  let seekResolve;
  video.addEventListener("seeked", async function onSeeked() {
    video.removeEventListener(onSeeked);
    if (seekResolve) seekResolve();
  });
  video.currentTime = newTime;
  await new Promise((r) => {
    seekResolve = r;
  });
};
class Canvas2DRenderer {
  constructor({ canvas, layers }) {
    this.ctx = canvas.getContext("2d");
    this.width = canvas.width;
    this.height = canvas.height;
  }
  updateLayers() { }
  async renderBackground(cTime) {
    // render background
    this.ctx.fillStyle = `hsl(${(cTime / 100 / 15) * 360}, 80%, 70%)`;
    this.ctx.fillRect(0, 0, this.width, this.height);
    // render text layer - TextLayerRenderer.draw(textLayer) or textLayer.draw()
    // 1) UI + Tracks/Clips data models
    // apps/spr-main-web/core/components/videoTemplateEditor
    // 2) CONVERTER
    // Converts TRACKS/CLIPS to CANVAS_ATOMS
    // packages/modules/infra/canvas/utils/text.ts
    // packages/modules/infra/canvas/utils/audio.ts
    // packages/modules/infra/canvas/utils/video.ts
    // packages/modules/infra/canvas/utils/rectangle.ts
    // packages/modules/infra/canvas/utils/ellipse.ts
    /**
     * FROM <PropertiesInput propertiesToInput={['VERTICAL_ALIGN','HORIZONTAL_ALIGN']} />
      {
        type:'TEXT',
        verticalAlign:'left',
        horizontalAlign:'right'
      }
      TO
      {
        type:'TEXT',
        x: 500,
        y: 600,
      }
     */
    const start = 0;
    const end = 5000;
    // 3) Canvas Atom Renderer
    // Renders canvas atoms to a canvas
    // 3 renderers - canvas2d, webgl2, webgpu
    // packages/modules/infra/canvas/engines/canvas2d
    // packages/modules/infra/canvas/engines/webgl2
    // packages/modules/infra/canvas/engines/webgpu
    // packages/modules/infra/canvas/engines/factory
    // engine.draw({ canvas, canvasAtom })
    // TEXT LAYER RENDERING
    // this.ctx.fillStyle = "black";
    // this.ctx.font = "48px serif";
    // this.ctx.fillText(cTime / 1000, 10, 50);
    // render image layer - ImageLayerRenderer.draw(imageLayer) or imageLayer.draw()
    // if (5 <= cTime / 1000 && cTime / 1000 <= 8) {


    const mediaSrc = await getPreLoadedVideoSrcFromURL(
      "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4"
    );

    console.log('mediaSrc', mediaSrc)


    this.ctx.drawImage(mediaSrc, 100, 100, 300, 300);
    // }
    // render video layer - VideoLayerRenderer.draw(videoLayer) or videoLayer.draw()
    // if (0 <= cTime && cTime <= 5000) {
    //   if (video) {
    //     // if (!video.isPlaying) {
    //     await updateVideoCurrentTime(video, cTime / 1000);
    //     // }
    //     // video.isPlaying = true;
    //     const n = 5;
    //     for (let index = 0; index < n * n; index++) {
    //       const i = index % n;
    //       const j = Math.floor(index / n);
    //       let newi = i;
    //       let newj = j;
    //       newi = j;
    //       newj = n - 1 - i;
    //       const interpolatedI = interpolate(cTime, [0, 5000], [i, newi]);
    //       const interpolatedJ = interpolate(cTime, [0, 5000], [j, newj]);
    //       const w = this.width;
    //       const h = this.height;
    //       const x = (interpolatedJ * w) / n;
    //       const y = (interpolatedI * h) / n;
    //       this.ctx.drawImage(
    //         video,
    //         0,
    //         0,
    //         video.width,
    //         video.height,
    //         x,
    //         y,
    //         w / n,
    //         h / n
    //       );
    //     }
    //   }
    // }
    // } else {
    //   if (video && video.isPlaying) {
    //     video.isPlaying = false;
    //     video.pause();
    //   }
    // }
    // render audio layer - TODO based on req
  }
  renderLayers({ layers, cTime }) { }
  async renderFrame(cTime, layers = []) {
    console.log("cTimee");
    await this.renderBackground(cTime);
    this.renderLayers({ layers, cTime });
  }
  pause() {
    video?.pause();
    if (video) {
      video.isPlaying = false;
      video.currentTime = 0;
    }
  }
  play() {
    console.log("video", video);
    video?.play?.();
    if (video) {
      video.isPlaying = true;
    }
  }
  reset() {
    this.pause();
  }
}


module.exports = Canvas2DRenderer

// ASSET => PROPERTIES => f(time)
// LAYERS
// OVERLAY
// CONTROLS => time

// play, pause => 2-4 ms on average, 15 ms worst case
// (video.currentTime = t) => 16 ms on average, 30 ms worst case

// preseek
// before setting playing to true

// requestIdleCallback( () => {} )
