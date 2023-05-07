import { FsHandler } from './handlers/index.js';
import { exec } from 'child_process';
import PuppeteerMassScreenshots from 'puppeteer-mass-screenshots';
import { uploadVideo } from "../src/video.js";
import puppeteer from "puppeteer";

export default class PuppeteerVideoRecorder {
  public screenshots: any;
  public fsHandler: FsHandler;
  public page: puppeteer.Page;
  public outputFolder: string;

  constructor(folder: string, page:puppeteer.Page) {
    this.screenshots = new PuppeteerMassScreenshots();
    this.fsHandler = new FsHandler(folder);
    this.outputFolder = folder;
    this.page = page
  }

  async init() {
    await this.fsHandler.init();
    const { imagesPath, imagesFilename, appendToFile } = this.fsHandler;
    await this.screenshots.init(this.page, imagesPath, {
      afterWritingImageFile: (filename: string) => appendToFile(imagesFilename, `file '${filename}'\n`)
    });
    return this
  }

  start(options = {
    maxWidth: 1024,
    maxHeight: 768,
    quality: 60,
    everyNthFrame: 4
  }) {
    return this.screenshots.start(options);
  }

  async stop() {
    await this.screenshots.stop();
    let gameplayVideoUri = await this.createVideo(this.fsHandler.getVideoFileName());
    console.log(`Gameplay video uri: ${gameplayVideoUri}`);
    return gameplayVideoUri;
  }

  get defaultFFMpegCommand() {
    const { imagesFilename, videoFilename } = this.fsHandler;
    return [
      'ffmpeg',
      '-f concat',
      '-safe 0',
      `-i ${imagesFilename}`,
      '-framerate 30',
      '-hide_banner',
      '-profile:v high',
      videoFilename,
    ].join(' ');
  }

  createVideo(videoFilePath: string, ffmpegCommand = '') {
    return new Promise((resolve, reject) => {
      const _ffmpegCommand = ffmpegCommand || this.defaultFFMpegCommand;
      console.log("Executing ffmpeg command: " + _ffmpegCommand)
      exec(_ffmpegCommand, (error, stdout, stderr) => {
        if (error) throw new Error(error.message);
        if (stderr.includes("muxing overhead")) {
          uploadVideo(this.fsHandler.getVideoFileName())
            .then(result => {
              console.log("Uploaded video result: ", result?.uri);
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

