import { ResizePlugin } from '@pixi/app';
export * from '@pixi/app';
import { detectMp4, detectOgv, detectWebm, loadTextures, loadWebFont } from '@pixi/assets';
export * from '@pixi/assets';
import { extensions, INSTALLED } from '@pixi/core';
export * from '@pixi/core';
export { settings } from '@pixi/core';
import '@pixi/mixin-cache-as-bitmap';
import '@pixi/mixin-get-child-by-name';
import '@pixi/mixin-get-global-position';
import './adapter/polyfills.mjs';
export { NodeAdapter } from './adapter/adapter.mjs';
export { loadNodeBase64 } from './adapter/loadNodeBase64.mjs';
export { loadNodeFont } from './adapter/loadNodeFont.mjs';
export { loadNodeTexture } from './adapter/loadNodeTexture.mjs';
export { NodeCanvasElement } from './adapter/NodeCanvasElement.mjs';
import { NodeCanvasResource } from './adapter/NodeCanvasResource.mjs';
export { filters } from './filters.mjs';
export * from '@pixi/display';
export * from '@pixi/extract';
export * from '@pixi/filter-alpha';
export * from '@pixi/filter-blur';
export * from '@pixi/filter-color-matrix';
export * from '@pixi/filter-displacement';
export * from '@pixi/filter-fxaa';
export * from '@pixi/filter-noise';
export * from '@pixi/graphics';
export * from '@pixi/mesh';
export * from '@pixi/mesh-extras';
export * from '@pixi/particle-container';
export * from '@pixi/prepare';
export * from '@pixi/sprite';
export * from '@pixi/sprite-animated';
export * from '@pixi/sprite-tiling';
export * from '@pixi/spritesheet';
export * from '@pixi/text';
export * from '@pixi/text-bitmap';

extensions.remove(
  detectMp4,
  detectOgv,
  detectWebm,
  loadTextures,
  loadWebFont,
  ResizePlugin
);
INSTALLED.length = 0;
INSTALLED.push(NodeCanvasResource);

export { NodeCanvasResource };
//# sourceMappingURL=index.mjs.map
