declare interface Window {
  isHeadLess: boolean;
  onFrameChange: (frame: number) => void;
  onPayload: (config: Media) => void;
  pixiApp: any;
}
