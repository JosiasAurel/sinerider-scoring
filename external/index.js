import { FsHandler } from './handlers/index.js';
import { exec } from 'child_process';
import PuppeteerMassScreenshots from 'puppeteer-mass-screenshots';
import { uploadVideo } from "../src/video.js";

export default class PuppeteerVideoRecorder {
  constructor(filename) {
    this.filename = filename
    this.screenshots = new PuppeteerMassScreenshots();
    this.fsHandler = new FsHandler();
  }

  async init(page, outputFolder) {
    this.page = page;
    this.outputFolder = outputFolder;
    await this.fsHandler.init(outputFolder);
    const { imagesPath, imagesFilename, appendToFile } = this.fsHandler;
    await this.screenshots.init(page, imagesPath, {
      afterWritingImageFile: (filename) => appendToFile(imagesFilename, `file '${filename}'\n`)
    });
  }

  start(options = {}) {
    return this.screenshots.start(options);
  }

  async stop() {
    await this.screenshots.stop();
    let gameplayVideoUri = await this.createVideo();
    console.log(`GOTCHA MY BOY -> ${gameplayVideoUri}`);
    return gameplayVideoUri;
  }

  get defaultFFMpegCommand() {
    const { imagesFilename, videoFilename } = this.fsHandler;
    return [
      'ffmpeg',
      '-f concat',
      '-safe 0',
      `-i ${imagesFilename}`,
      '-framerate 60',
      videoFilename
    ].join(' ');
  }

  createVideo(ffmpegCommand = '') {
    return new Promise((resolve, reject) => {
      const _ffmpegCommand = ffmpegCommand || this.defaultFFMpegCommand;
      exec(_ffmpegCommand, (error, stdout, stderr) => {
        if (error) throw new Error(error);
        if (stderr.includes("muxing overhead")) {
          uploadVideo(this.filename)
            .then(result => {
              console.log("GOTCHA FIRST MY BOY -> ", result?.uri);
              resolve(result?.uri);
            })
            .catch(err => reject(err));
        }
        console.log(stdout);
        console.log(stderr);
      });
    })
  }
}

