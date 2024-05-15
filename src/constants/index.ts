export const DEFAULT_PORT = 8000;
export const VIDEO_GENERATION_CONFIG = {
  OUTPUT_VIDEO_FORMAT: 'mp4',
  OUTPUT_AUDIO_FORMAT: 'mp3',
  INTERMEDIATE_FRAME_FORMAT: 'jpeg',
  MINIMUM_VIDEO_SEGMENT_SIZE_IN_SECONDS: 5,
};
export const LOCAL_URL = `http://localhost:${process.env.PORT || DEFAULT_PORT}`;
export const PROCESS_FLAGS = {
  CLUSTER: '--cluster',
};
