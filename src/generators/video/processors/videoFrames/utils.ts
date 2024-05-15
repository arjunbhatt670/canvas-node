import * as PIXI from '@pixi/node';

// types
import type { Texture } from '@pixi/node';
import type { VisualClip } from 'types/videoTemplate.js';

const getTextureFromSrc = async (src: string, clip: VisualClip) => {
  const texture = await PIXI.loadNodeTexture.load!<Texture>(src, {});

  texture.orig.width = clip.coordinates.width;
  texture.orig.height = clip.coordinates.height;

  return texture;
};

const getTextureFromBase64 = async (base64: string, clip: VisualClip) => {
  const texture = await PIXI.loadNodeBase64.load!<Texture>(base64, {});

  texture.orig.width = clip.coordinates.width;
  texture.orig.height = clip.coordinates.height;

  return texture;
};

const getSprite = (texture: Texture, clip: VisualClip) => {
  const sprite = PIXI.Sprite.from(texture);
  sprite.pivot.set(clip.coordinates.width / 2, clip.coordinates.height / 2);
  sprite.width = clip.coordinates.width;
  sprite.height = clip.coordinates.height;
  sprite.position.set(clip.coordinates.x, clip.coordinates.y);
  sprite.angle = clip.rotationAngle;
  sprite.alpha = clip.opacity;

  return sprite;
};

export { getTextureFromSrc, getSprite, getTextureFromBase64 };
