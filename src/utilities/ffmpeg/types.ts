import { type FfprobeStream } from 'fluent-ffmpeg';

export interface FfmpegAudioClip {
  src: string;
  start: number;
  end?: number;
  duration: number;
  trim: number;
  stream: FfprobeStream;
}
