import puppeteer, { Page, TimeoutError } from "puppeteer";
import PuppeteerVideoRecorder from "../external/index.js";
import { BROWSERLESS_TOKEN } from "./config.js";


export class ScoringTimeoutError extends TimeoutError {
}

// On top of your code
let cache: { [url: string]: CacheEntry } = {};

export async function playLevel(rawLevelUrl: string, videoName: string, folder: string) {
  const startTime = Date.now()
  const tickRate = 120
  const drawModulo = 3
  const defaultTickRate = 60

  const levelUrl = `${rawLevelUrl}&ticksPerSecond=${tickRate}&drawModulo=${drawModulo}`
  console.log(`levelUrl: ${levelUrl}`)

  console.log("Launching puppeteer")
  const browser = await puppeteer.connect({
    browserWSEndpoint: `wss://chrome.browserless.io?token=${BROWSERLESS_TOKEN}`
  });


  try {
    console.log("Loading page...")
    const page = await browser.newPage();

    var alertPoppedUp = false
    page.on('dialog', async dialog => {
      console.log("Whooooa we got an alert dialog!")
      await dialog.accept();
      alertPoppedUp = true;
    })

    page
    .on('console', message =>
      console.log(`${message.type().substr(0, 3).toUpperCase()} ${message.text()}`))
    .on('pageerror', ({ message }) => console.log(message))
    .on('response', response =>
      console.log(`${response.status()} ${response.url()}`))
    .on('requestfailed', request =>
      console.log(`${request.failure().errorText} ${request.url()}`))

    console.log("Setting viewport")
    await page.setViewport({ width: 1024, height: 768 });


    console.log("Loading page and waiting for all assets")
    await page.goto(levelUrl, { waitUntil: "networkidle0", timeout: 60000 })

    console.log("Waiting for the click to begin selector...")
    const clickToBeginSelector = "#loading-string";
    await page.waitForSelector(clickToBeginSelector);

    const elapsedPageLoadTimeMs = Date.now() - startTime;
    console.log(`Page took ${elapsedPageLoadTimeMs}ms to load`)

    if (alertPoppedUp) throw new ScoringTimeoutError()

    const clickToBeginCTA = await page.$(clickToBeginSelector)

    console.log("Issuing click to start")
    await clickToBeginCTA?.click();

    const wait = 3000
    console.log(`Waiting ${wait}ms`)
    await new Promise(f => setTimeout(f, wait))
    console.log("Continuing...")

    console.log("Init page recorder")
    const recorder = await new PuppeteerVideoRecorder(folder, page).init()

    const expression = await page.evaluate("world.level.currentLatex") as string;
    const level = await page.evaluate("world.level.name") as string;
    const cnt = getCharCount(expression as string) as number;

    console.log("Starting recording...")
    await recorder.start();

    const runStartTime = Date.now()
    await page.evaluate('onClickRunButton (null)');

    // Adjust our expectations based target faster-than-realtime tickRate
    // 30 seconds is the normal amount of time we want to timeout w/
    // 30 hz is the normal game tick rate
    // thus, the adjusted time (in ms) is 30 sec * defaultTickRate / tickRate * 1000 ms/sec
    const expectedGameProcessingTimeMs = 30.0 * (defaultTickRate / tickRate) * 1000.0

    // We will allow 25% extra time to account for anomalies
    const paddedGameProcessingTimeMs = expectedGameProcessingTimeMs * 1.25

    console.log(`Note: maximum wait time ${paddedGameProcessingTimeMs}ms with a tick rate of ${tickRate} (default: ${defaultTickRate})`)

    try {
      await page.waitForFunction('document.getElementById("completion-time").innerText.length > 0', { timeout: paddedGameProcessingTimeMs })
    } catch (e) {
      if (e instanceof TimeoutError) {
        // It is very important to close the browser - always
        await browser.close()

        return { time: Number.POSITIVE_INFINITY, expression: expression, charCount: cnt, playURL: rawLevelUrl, level: level, gameplay: "" } as ScoringResult
      } else console.log("Error: ", e);
    }

    const elapsedRunTimeMs = Date.now() - runStartTime
    console.log(`actual wait time: ${elapsedRunTimeMs}ms`)

    // To avoid chopping the end of the video prematurely, we will stop the video 1 second later, adjusted
    // for our tick rate time scaling
    const tailWaitTimeMs = 2.5 * (defaultTickRate / tickRate) * 1000.0
    console.log(`Waiting ${tailWaitTimeMs}ms`)
    await new Promise(f => setTimeout(f, tailWaitTimeMs))
    console.log("Continuing...")

    const time = await page.evaluate('parseFloat(document.getElementById("completion-time").innerText)') as number;

    if (time > 30) {
      return { time: Number.POSITIVE_INFINITY, expression: expression, charCount: cnt, playURL: rawLevelUrl, level: level, gameplay: "" } as ScoringResult
    }

    // Grab all relevant data from the browser & recorder before stopping them both
    const gamplayVideoUri = await recorder.stop() as string;
    console.log("Total runtime: " + ((Date.now() - startTime) / 1000) + " seconds")
    return { time: time, expression: expression, charCount: cnt, playURL: rawLevelUrl, level: level, gameplay: gamplayVideoUri } as ScoringResult
  } catch (e) {
    console.log("got exception: " + e)
    throw e
  } finally {
    console.log("Closing browser...")
    await browser.close()
  }
}

// ignores whitespace in expression
// probably makes more sense to count sin, cos as units of their own
export function getCharCount(expression: string): number {
  let count = 0;
  for (let char of expression) {
    if (char !== " ") count++;
  }

  return count;
}