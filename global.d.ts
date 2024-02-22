declare interface Clip {
  src: string;
  start: number;
  end?: number;
  duration: number;
}

declare function MixAudio(audios: any, duration: string): void;
