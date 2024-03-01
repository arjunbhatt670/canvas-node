## For MAC

Run

```s
brew install pkg-config cairo pango libpng jpeg giflib librsvg pixman
```

and then run

```
export PKG_CONFIG_PATH="/opt/homebrew/opt/libffi/lib/pkgconfig:/opt/homebrew/opt/zlib/lib/pkgconfig:/opt/homebrew/opt/expat/lib/pkgconfig"
```

before installing `canvas` package as used by `@pixi/node` or independently
