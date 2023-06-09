
declare interface Solution {
  expression: string,
  gameplay: string, // url to the gameplay video on cloudinary,
  level: string,
  charCount: number,
  playURL: string,
  time: number,
  timestamp: number;
}

declare interface CacheEntry {
  status: number
  headers: Record<string, string>,
  body: Buffer,
  expires: number
}

declare type ScoringResult = Solution;

declare interface VideoDetails {
  uri: string,
  bytes: number,
  createdAt: string,
  publicId: string,
}

declare interface BrowserContext {
  browser:Browser
  page:Page
  beginButton:ElementHandle
  tickRate:number
  rawLevelUrl:string
  expression:string,
  cnt:number,
  level:string,
  folder:string
}
declare module 'puppeteer-video-recorder'
declare module 'puppeteer-mass-screenshots'
