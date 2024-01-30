'use strict';

var core = require('@pixi/core');
var filterAlpha = require('@pixi/filter-alpha');
var filterBlur = require('@pixi/filter-blur');
var filterColorMatrix = require('@pixi/filter-color-matrix');
var filterDisplacement = require('@pixi/filter-displacement');
var filterFxaa = require('@pixi/filter-fxaa');
var filterNoise = require('@pixi/filter-noise');

const filters = {
  /** @deprecated */
  AlphaFilter: filterAlpha.AlphaFilter,
  /** @deprecated */
  BlurFilter: filterBlur.BlurFilter,
  /** @deprecated */
  BlurFilterPass: filterBlur.BlurFilterPass,
  /** @deprecated */
  ColorMatrixFilter: filterColorMatrix.ColorMatrixFilter,
  /** @deprecated */
  DisplacementFilter: filterDisplacement.DisplacementFilter,
  /** @deprecated */
  FXAAFilter: filterFxaa.FXAAFilter,
  /** @deprecated */
  NoiseFilter: filterNoise.NoiseFilter
};
Object.entries(filters).forEach(([key, FilterClass]) => {
  Object.defineProperty(filters, key, {
    get() {
      core.utils.deprecation("7.1.0", `filters.${key} has moved to ${key}`);
      return FilterClass;
    }
  });
});

exports.filters = filters;
//# sourceMappingURL=filters.js.map
