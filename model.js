const state = {};
const stateHistory = {};

// ACTIONS
// 1) TABS => Change Active Tab, Reorder Tabs, Add new Tab, Delete Tab, Change resolution for Tab ?
state.tabs = [
  {
    resolution: { width: 1600, height: 900 },
    active: true,
    title: "High Res",
  },
  {
    resolution: { width: 1280, height: 720 },
    active: false,
    title: "Low Res",
  },
];

// 2) HISTORY => Undo, Redo, Reset
stateHistory = {
  states: [state0, state1, state2],
  currentStateIndex: 0,
};

// 3) TIMELINE.CONTROLS => Change Duration, Play, Pause, Change Time Offset
state.controls = {
  timeOffset: 0,
  duration: 15,
  playing: true,
  activeClips: [],
  // What other things can be clicked and become active ? - None for now
};

state.currentTemplateIndex = 0;

// 4) TIMELINE.TRACKS => Lock Track, Hide Track, Clips CRUD
state.templates[0].tracks = [
  {
    clips: [],
    locked: true,
    visible: true,
    muted: true,
  },
  {
    clips: [],
    locked: true,
    visible: true,
  },
];

// 5) TIMELINE.TRACKS.CLIPS - Change startTime, Change endTime, Loading state
state.templates[0].tracks[0].clips = [
  {
    type: "PHOTO",
    source: "https://sprinklr.com/photo.png",
    loaded: false,
    properties: {
      position: { x: 0, y: 0, width: 100, height: 100 },
      objectFit: "fill",
    },
    entryAnimation: {
      preset: "FADE_IN_LEFT",
      delay: 0.1,
      duration: 0.4,
      crossfade: true, // EXPLORE MORE HERE
    },
    exitAnimation: {
      preset: "FADE_IN_LEFT",
      delay: 0.1,
      duration: 0.4,
    },
  },
  {
    type: "VIDEO",
    source: "https://sprinklr.com/video.mp4",
    loaded: false,
    properties: {
      position: { x: 0, y: 0, width: 100, height: 100 },
      gain: 1.5,
      objectFit: "fill",
    },
  },
  {
    type: "AUDIO",
    source: "https://sprinklr.com/audio.mp3",
    loaded: false,
    properties: {
      gain: 1.5,
    },
  },
  {
    type: "TEXT",
    text: "Sample Text",
    loaded: false,
    properties: {
      position: { x: 0, y: 0, width: 100, height: 100 }, // What does it mean to resize text?
      fontFamily: "Helvetica",
      fontSize: 53,
      lineHeight: 14,
      lineSpacing: 1,
      letterSpacing: 5,
      textAlign: "center",
    },
    keyframes: { 0: {}, 200: {} }, // What happens if you reduce the duration of a clip, do keyframes move ?
  },
];
