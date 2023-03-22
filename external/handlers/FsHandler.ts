import { promises } from "fs";
const { appendFile, mkdir, readdir, unlink } = promises;
import { openSync, closeSync, existsSync } from 'fs';
import { join } from 'path';

export default class FsHandler {
  public videoFilename: string;
  public outputFolder: string;
  public imagesPath: string;
  public imagesFilename: string;

  constructor() {
    this.videoFilename = "";
    this.outputFolder = "";
    this.imagesPath = "";
    this.imagesFilename = "";
  }

  async init(outputFolder: string) {
    this.outputFolder = outputFolder;
    this.videoFilename = join(this.outputFolder, Date.now() + '.webm');
    this.imagesPath = join(this.outputFolder, 'images');
    this.imagesFilename = join(this.outputFolder, 'images.txt');
    await this.verifyPathExists(this.outputFolder);
    await this.verifyPathExists(this.imagesPath);
    await this.createEmptyFile(this.imagesFilename);
    await this.clearImagesInPath(this.imagesPath);
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

  async clearImagesInPath(imagesPath: string) {
    const files = await readdir(imagesPath);
    console.log(`Removing files in ${imagesPath}`);
    for (const file of files) {
      const filename = join(imagesPath, file);
      //console.log(`Removing file ${filename}`);
      await unlink(filename);
    }
  }
}

