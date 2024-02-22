declare interface Clip {
  src: string;
  start: number;
  end?: number;
  duration: number;
  trim: number;
}

declare function MixAudio(audios: any, duration: string): void;
