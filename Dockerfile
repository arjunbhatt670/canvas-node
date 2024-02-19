# Set the base image
FROM node:16

# Create and set the working directory
WORKDIR /usr/src/app

# Add dependencies for gl, canvas and xvfb
# Important! These dependencies must be installed before running `npm install`
RUN apt-get update \
    && apt-get install -y node-gyp build-essential libcairo2-dev libgif-dev libglew-dev libglu1-mesa-dev libjpeg-dev libpango1.0-dev librsvg2-dev libxi-dev pkg-config xvfb \
    && rm -rf /var/lib/apt/lists/*

# Install app dependencies


# COPY node-canvas-2.11.2 /usr/src/app/
# WORKDIR node-canvas-2.11.2
# RUN export PKG_CONFIG_PATH="/opt/homebrew/opt/libffi/lib/pkgconfig:/opt/homebrew/opt/zlib/lib/pkgconfig:/opt/homebrew/opt/expat/lib/pkgconfig"
# # RUN npm install
# RUN node-gyp rebuild

# WORKDIR /usr/src/app

# COPY pixi-node ./
# WORKDIR /usr/src/app/pixi-node
# RUN npm link

# WORKDIR /usr/src/app

COPY package*.json ./
# RUN export PKG_CONFIG_PATH="/opt/homebrew/opt/libffi/lib/pkgconfig:/opt/homebrew/opt/zlib/lib/pkgconfig:/opt/homebrew/opt/expat/lib/pkgconfig"
RUN npm install
# RUN npm link @pixi/node

# Bundle app source
COPY . .

# Start the server
EXPOSE 3000
CMD xvfb-run node ./pixi.js



# docker run command
# docker rm hope-linux && docker image rm pixi:1  &&  docker build -t pixi:1 . && docker run -d --name hope-linux pixi:1