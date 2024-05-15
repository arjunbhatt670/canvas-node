import { VideoTemplate } from './videoTemplate.js';

export interface VideoGenerationConfig {
  template: VideoTemplate;
  tmpDirPath: string;
  canCluster?: boolean;
  videoWithoutAudioPath: string;
  finalAudioPath: string;
  segments: {
    start: number;
    duration: number;
    path: string;
  }[];
}
