import * as PIXI from '@pixi/node';
import { getVideoClipFramePath, getVisibleClips } from 'generators/utils.js';
import { getSprite, getTextureFromBase64, getTextureFromSrc } from './utils.js';
import { ClipType } from 'constants/videoTemplate.js';

// types
import type { Sprite, IRenderer } from '@pixi/node';
import { type VideoGenerationConfig } from 'types/index.js';

export default function composeFrameContent(options: {
  videoGenerationConfig: VideoGenerationConfig;
  renderer: IRenderer;
}) {
  const { renderer, videoGenerationConfig } = options;
  const { template, tmpDirPath } = videoGenerationConfig;
  const statics = new Map<string, Sprite>();

  return async (currentFrame: number) => {
    const currentTime =
      ((currentFrame - 1) * 1000) / template.videoProperties.frameRate;
    const visibleClipsInFrame = getVisibleClips(template, currentTime);

    const container = new PIXI.Container();

    for (
      let clipIndex = 0;
      clipIndex < visibleClipsInFrame.length;
      clipIndex++
    ) {
      const clip = visibleClipsInFrame[clipIndex];
      const clipStartFrame = Math.round(
        (clip.startOffSet * template.videoProperties.frameRate) / 1000,
      );

      switch (clip.type) {
        case ClipType.VIDEO_CLIP: {
          const videoFramePath = getVideoClipFramePath({
            frame: currentFrame - clipStartFrame,
            clipName: clip.id,
            dir: tmpDirPath,
          });
          const texture = await getTextureFromSrc(videoFramePath, clip);
          const sprite = getSprite(texture, clip);
          container.addChild(sprite);

          break;
        }

        case ClipType.SHAPE_CLIP: {
          if (statics.has(clip.id)) {
            container.addChild(statics.get(clip.id)!);
          } else {
            const texture = await getTextureFromBase64(
              clip.shapeInfo?.shapeMediaUrl,
              clip,
            );
            const sprite = getSprite(texture, clip);
            statics.set(clip.id, sprite);
            container.addChild(sprite);
          }

          break;
        }

        case ClipType.IMAGE_CLIP: {
          if (statics.has(clip.id)) {
            container.addChild(statics.get(clip.id)!);
          } else {
            const texture = await getTextureFromSrc(clip.sourceUrl, clip);
            const sprite = getSprite(texture, clip);
            statics.set(clip.id, sprite);
            container.addChild(sprite);
          }

          break;
        }

        // TODO - Handle text clips later when text source (base64) is provided in template
        case ClipType.TEXT_CLIP: {
          // if (statics.has(clip.id)) {
          //   container.addChild(statics.get(clip.id)!);
          // } else {
          //   const texture = await getTextureFromBase64(
          //     '', // base 64 url
          //     clip,
          //   );
          //   const sprite = getSprite(texture, clip);
          //   statics.set(clip.id, sprite);
          //   container.addChild(sprite);
          // }

          break;
        }
      }
    }

    renderer.render(container);

    const baseData =
      renderer.view.toDataURL?.('image/jpeg', 1)?.split(';base64,')[1] || '';
    const bufferData = Buffer.from(baseData, 'base64');

    return bufferData;
  };
}
