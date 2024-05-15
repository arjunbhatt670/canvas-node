# video-generator

A Node.js service that generate videos based on provided configuration.

## Setup steps

1. Upgrade to the required node version using `nvm install <version>` or `nvm install`
2. `yarn install`
   - If there is an error while installing `canvas` package which is a dependency of `@pixi/node`, refer [here][error-installing-canvas]
   - If `canvas` package is source compiled using node-gyp and encounter environment variable errors of `zlib`, `libffi` and `expat` package, follow below sub steps
     - `brew install zlib libffi expat`
     - `export PKG_CONFIG_PATH="/opt/homebrew/opt/libffi/lib/pkgconfig:/opt/homebrew/opt/zlib/lib/pkgconfig:/opt/homebrew/opt/expat/lib/pkgconfig"`
3. Copy `.env.local` file content to `.env` file.
4. If you want to use your own `ffmpeg` build, add path to the binaries in `.env` file. **Note** - please use v6 of ffmpeg
5. Create build of the typescript repo using `yarn run build` and for development purpose run `yarn run build:watch`
6. Start the mandatory express/file server by running `yarn run dev`
7. Start generating videos using video scripts `generate-video` or using express routes

## Available Scripts

- `clean` - remove transpiled files,
- `prebuild` - lint source files before building,
- `build` - transpile TypeScript to ES6,
- `build:watch` - interactive watch mode to automatically transpile source files,
- `lint` - lint source files,
- `prettier` - reformat files,

- `dev` - Start the express server
- `generate-video` - Create a single video using the variables provided in `.env`
- `bench` - Benchmarks report.

### Create directory list

`mddir <folder name>`

## References

- [TypeScript][typescript] [5.4][typescript-5-4]
- [ESM][esm]
- [ESLint][eslint] with some initial rules recommendation
- Type definitions for Node.js
- [Prettier][prettier] to enforce consistent code style
- Yarn [scripts](#available-scripts) for common operations
- [EditorConfig][editorconfig] for consistent coding style

[typescript]: https://www.typescriptlang.org/
[typescript-5-4]: https://devblogs.microsoft.com/typescript/announcing-typescript-5-4/
[eslint]: https://github.com/eslint/eslint
[prettier]: https://prettier.io
[esm]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules
[editorconfig]: https://editorconfig.org
[error-installing-canvas]: https://github.com/pixijs/node?tab=readme-ov-file#error-installing-canvas-package
