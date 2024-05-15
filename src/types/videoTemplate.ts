import type {
  ClipType,
  ShapeType,
  DynamicPlaceholderType,
  CropType,
  TransitionPhase,
  TransitionSpeed,
} from 'constants/videoTemplate.js';

type TransitionTiming = {
  id: TransitionSpeed;
  startTime?: number;
  duration?: number;
};

type TransitionKeyframes = Array<{
  progress: number;
  transitionProperties: Record<string, number>;
}>;

export type Transition = {
  type: string;
  phase: TransitionPhase;
  interpolation?: Record<string, unknown>;
  timing: TransitionTiming;
  keyframes?: TransitionKeyframes;
};

export interface Coordinates {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface BaseClip {
  id: string;
  name?: string;
  startOffSet: number;
  duration: number;
  endOffSet: number;
}

export interface VisualClip extends BaseClip {
  coordinates: Coordinates;
  opacity: number;
  rotationAngle: number;
  clipTransitions?: Transition[];
}

export interface ImageClip extends VisualClip {
  sourceUrl: string;
  crop: CropType;
  dynamicImageEnabled: boolean;
  type: ClipType.IMAGE_CLIP;
}
export interface VideoClip extends VisualClip {
  sourceUrl: string;
  crop: CropType;
  dynamicVideoEnabled: boolean;
  dynamicAudioEnabled: boolean;
  audioProperties: {
    fadeIn: number;
    fadeOut: number;
    volume: number;
  };
  type: ClipType.VIDEO_CLIP;
  previewUrl?: string;
  trimOffset?: number;
}

export interface DynamicPlaceholder {
  index: number;
  type: DynamicPlaceholderType;
  placeholderText: string;
  options: string[];
}

export interface TextClip extends VisualClip {
  htmlContent: string;
  backgroundColor: string;
  dynamicBackgroundColorEnabled: boolean;
  verticalAlignment: 'TOP' | 'CENTER' | 'BOTTOM';
  placeholders: Array<DynamicPlaceholder>;
  type: ClipType.TEXT_CLIP;
}

interface BaseShapeInfo {
  shapeMediaUrl: string;
  strokeWeight: number;
  strokeColor: string;
  color: string;
}
interface RectangleShapeInfo extends BaseShapeInfo {
  shapeType: ShapeType.RECTANGLE;
  borderRadius: number;
}
interface CircleShapeInfo extends BaseShapeInfo {
  shapeType: ShapeType.CIRCLE;
}
export type ShapeInfo = RectangleShapeInfo | CircleShapeInfo;

export interface ShapeClip extends VisualClip {
  shapeInfo: ShapeInfo;
  dynamicFillColorEnabled: boolean;
  dynamicBorderColorEnabled: boolean;
  type: ClipType.SHAPE_CLIP;
}

export interface AudioClip extends BaseClip {
  type: ClipType.AUDIO_CLIP;
  sourceUrl: string;
  fadeIn: number;
  fadeOut: number;
  volume: number;
  dynamicAudioEnabled: boolean;
  trimOffset?: number;
}

export type Clip = ImageClip | VideoClip | AudioClip | TextClip | ShapeClip;

export interface Track {
  id: string;
  clips: Clip[];
}

export interface VideoProperties {
  duration: number;
  frameRate: number;
  height: number;
  width: number;
  backgroundColor: string;
}

export interface VideoTemplate {
  variationId: string;
  tracks: Track[];
  videoProperties: VideoProperties;
  variationName: string;
  variationAspectRatio?: string;
  channelType?: string;
}
