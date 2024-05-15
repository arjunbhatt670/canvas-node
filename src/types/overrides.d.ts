declare namespace NodeJS {
  declare interface ProcessEnv {
    TEMPLATE_PATH?: string;
    OUTPUT?: string;
    HTTP_PORT: string;
    CONCURRENCY: string;
    TEMP_DIR_PREFIX: string;
    FFMPEG_PATH: string;
    FFPROBE_PATH: string;
    DEBUG_MODE?: string;
  }
}
