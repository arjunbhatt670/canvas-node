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
  sourceUrl: string;
  opacity: number;
  rotationAngle: number;
  crop: string;
  dynamicVideoEnabled?: boolean;
  shapeInfo?: {
    color: string;
    strokeWeight: number;
    strokeColor: string;
    shapeMediaUrl: string;
    shapeType: string;
  };
  dynamicBackgroundColorEnabled?: boolean;
  dynamicBorderColorEnabled?: boolean;
  htmlContent?: string;
  verticalAlignment?: string;
}

declare interface Window {
  html2Image: any;
}
