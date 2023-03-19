
declare interface Solution {
  expression: string,
  gameplay: string, // url to the gameplay video on cloudinary,
  level: string,
  charCount: number,
  playURL: string,
  T: number
}

declare interface VideoDetails {
  uri: string,
  bytes: number,
  createdAt: string,
  publicId: string,
}

declare module 'puppeteer-video-recorder'
declare module 'puppeteer-mass-screenshots'
