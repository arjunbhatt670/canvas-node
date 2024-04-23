declare interface Media {
  tracks: {
    id: string;
    clips: DataClip[];
  }[];
  videoProperties: {
    duration: number;
    frameRate: number;
    height: number;
    width: number;
  };
}

declare interface DataClip {
  id: string;
  type: "VIDEO_CLIP" | "AUDIO_CLIP" | "SHAPE_CLIP" | "TEXT_CLIP" | "IMAGE_CLIP";
  trimOffset?: number;
  startOffSet: number;
  duration: number;
  endOffSet: number;
  coordinates: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  sourceUrl?: string;
  opacity: number;
  rotationAngle: number;
  crop?: string;
  dynamicVideoEnabled?: boolean;
  shapeInfo?: {
    color: string;
    strokeWeight: number;
    strokeColor: string;
    shapeMediaUrl: string;
    shapeType: string;
    borderRadius?: number;
  };
  dynamicBackgroundColorEnabled?: boolean;
  dynamicBorderColorEnabled?: boolean;
  htmlContent?: string;
  verticalAlignment?: string;
  dynamicImageEnabled?: boolean;
  placeholders?: string[];
  backgroundColor?: string;
  dynamicFillColorEnabled?: boolean;
}

declare interface Window {
  html2Image: any;
}

declare type Stats = {
  puppeteerInit: number;
  processVideo: number;
  processText: number;
  processImage: number;
  processShape: number;
  createCache: number;
  pixiInit: number;
  drawCanvas: number;
  extractCanvas: number;
  streamed: number;
  ffmpeg: number;
  removeCache: number;
  mergeVideos?: number;
  fileSystemCleanup: number;
  total: number;
};
declare namespace global {
  var stats: Stats;
}
