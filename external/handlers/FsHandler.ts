import { promises } from "fs";
const { appendFile, mkdir, readdir, unlink } = promises;
import { openSync, closeSync, existsSync } from 'fs';
import { join } from 'path';

export default class FsHandler {
  public videoFilename: string;
  public outputFolder: string;
  public imagesPath: string;
  public imagesFilename: string;

  constructor(outputFolder: string) {
    this.outputFolder = outputFolder;
    this.videoFilename = join(this.outputFolder, Date.now() + '.mp4');
    this.imagesPath = join(this.outputFolder, 'images');
    this.imagesFilename = join(this.outputFolder, 'images.txt');
  }

  async init() {
    await this.verifyPathExists(this.outputFolder);
    await this.verifyPathExists(this.imagesPath);
    await this.createEmptyFile(this.imagesFilename);
  }

  createEmptyFile(filename: string) {
    return closeSync(openSync(filename, 'w'));
  }

  createPath(pathToCreate: string, type = 'folder') {
    if (type === 'folder') return mkdir(pathToCreate);
    return this.createEmptyFile(pathToCreate);
  }

  verifyPathExists(pathToVerify: string, type = 'folder') {
    return existsSync(pathToVerify) || this.createPath(pathToVerify, type);
  }

  appendToFile(filename: string, data: string) {
    return appendFile(filename, data);
  }

  getVideoFileName() : string {
    return this.videoFilename;
  }
}

