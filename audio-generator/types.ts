export interface Clip {
  src: string;
  start: number;
  end?: number;
  duration: number;
  trim: number;
  stream: any;
}

export interface MixAudio {
  (
    audios: { path: string; channels: number }[],
    outputPath: string,
    format: string
  ): Promise<unknown>;
}
