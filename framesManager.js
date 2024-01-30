class FramesManager {
  constructor({ timeOffset = 0, duration, onTick, onPlay, onPause, onReset }) {
    this.timeStart = null; // ms
    this.timeOffset = timeOffset; // ms
    this.duration = duration; // ms
    this.paused = true;
    this.onTick = onTick;
    this.onPause = onPause;
    this.onPlay = onPlay;
    this.onReset = onReset;
  }

  setTimeOffset(timeOffset) {
    this.timeOffset = timeOffset;

    if (this.timeOffset > this.duration) {
      this.timeOffset = 0;
      this.timeAnchor = this.timeAnchor ? Date.now() : null;
      this.onReset();
    }
  }

  setDuration(duration) {
    this.duration = duration;
    this.setTimeOffset(this.timeOffset);
  }

  play() {
    this.paused = false;
    // set time anchor based on current time and time offset
    this.timeAnchor = Date.now() - this.timeOffset;
    this.onPlay();
  }

  pause() {
    this.paused = true;
    // clear time anchor
    this.timeAnchor = null;
    this.onPause();
  }

  init() {
    const animateFrame = () => {
      console.log("in init");
      if (!this.paused) {
        this.setTimeOffset(Date.now() - this.timeAnchor);
        console.log("tickkk");
        this.tick();
      }
      // window.requestAnimationFrame(animateFrame);
    };
    animateFrame();
  }

  tick() {
    this.onTick(this.timeOffset);
  }
}


module.exports = FramesManager
