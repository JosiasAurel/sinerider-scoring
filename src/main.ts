import puppeteer, { Page, TimeoutError } from "puppeteer";
import PuppeteerVideoRecorder from "../external/index.js";


export class ScoringTimeoutError extends TimeoutError {
}

// On top of your code
let cache: { [url: string]: CacheEntry } = {};

export async function playLevel(rawLevelUrl: string, videoName: string, folder: string) {
  const startTime = Date.now()
  const tickRate = 30 * 5
  const drawModulo = 3
  const defaultTickRate = 30

  const levelUrl = `${rawLevelUrl}&ticksPerSecond=${tickRate}&drawModulo=${drawModulo}`
  console.log(`levelUrl: ${levelUrl}`)

  console.log("Launching puppeteer")
  const browser = await puppeteer.launch({
    headless: true,
    ignoreDefaultArgs: [
      "--mute-audio",
    ],
    args: [
      "--no-sandbox", "--disable-setuid-sandbox", "--autoplay-policy=no-user-gesture-required",
    ]
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

    await page.setRequestInterception(true);
  
    console.log("Registering page hooks")
    setupPageHooks(page)
  
    console.log("Setting viewport")
    await page.setViewport({ width: 512, height: 348 });
  
  
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
  
    const expression = await page.evaluate("world.level.ui.mathField.getPlainExpression()") as string;
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
  
    // We will allow 10% extra time to account for anomalies
    const paddedGameProcessingTimeMs = expectedGameProcessingTimeMs * 1.1
  
    console.log(`Note: maximum wait time ${paddedGameProcessingTimeMs}ms with a tick rate of ${tickRate} (default: ${defaultTickRate})`)
  
    try {
      await page.waitForFunction('document.getElementById("completion-time").innerText.length > 0', { timeout: paddedGameProcessingTimeMs })
    } catch (e) {
      if (e instanceof TimeoutError) {
        // It is very important to close the browser - always
        await browser.close()
  
        return { time: Number.POSITIVE_INFINITY, expression: expression, charCount: cnt, playURL: rawLevelUrl, level: level, gameplay: "" } as ScoringResult
      }
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

    // Grab all relevant data from the browser & recorder before stopping them both
    const gamplayVideoUri = await recorder.stop() as string;
    console.log("Total runtime: " + ((Date.now() - startTime) / 1000) + " seconds")
    return { time: time, expression: expression, charCount: cnt, playURL: rawLevelUrl, level: level, gameplay: gamplayVideoUri } as ScoringResult
    } finally {
    console.log("Closing browser...")
    await browser.close()
  }
}

function setupPageHooks(page: Page) {
  page.on('request', async (request) => {
    const url = request.url();

    if (url.endsWith(".mp3") && cache["fakemp3"]) {
      await request.respond(cache["fakemp3"])
      return;
    }

    if (cache[url] /*&& cache[url].expires > Date.now()*/) {
      console.log("using cache for url: " + url)
      await request.respond(cache[url]);
      return;
    }
    request.continue();
  });

  page.on('response', async (response) => {
    const url = response.url();
    const headers = response.headers();
    const cacheControl = headers['cache-control'] || '';
    const maxAgeMatch = cacheControl.match(/max-age=(\d+)/);
    const maxAge = maxAgeMatch && maxAgeMatch.length > 1 ? parseInt(maxAgeMatch[1], 10) : 0;
    if (true || maxAge) { // NOTE - forcing caching
      if (cache[url] /*|| cache[url].expires > Date.now()*/) return;

      let buffer;
      try {
        buffer = await response.buffer();
      } catch (error) {
        // some responses do not contain buffer and do not need to be catched
        return;
      }

      console.log("caching url: " + url)
      const resp = {
        status: response.status(),
        headers: response.headers(),
        body: buffer,
        expires: Date.now() + (maxAge * 1000),
      };
      cache[url] = resp

      if (url.endsWith(".mp3") && !cache["fakemp3"]) {
        cache["fakemp3"] = resp
      }
    }
  });

  page
    .on('console', message =>
      console.log(`${message.type().substr(0, 3).toUpperCase()} ${message.text()}`))
    .on('pageerror', ({ message }) => console.log(message))
    .on('response', response =>
      console.log(`${response.status()} ${response.url()}`))
    .on('requestfailed', request =>
      console.log(`${request.failure().errorText} ${request.url()}`))

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

export async function generateLevel() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  const page = await browser.newPage();

  await page.setViewport({ width: 1280, height: 720 });

  // selectors
  const clickToBeginSelector = "#loading-string"; // will have to wait until page is fully loaded before clicking
  const runButtonSelector = "#run-button";
  // const victoryLabelSelector = '#victory-label'

  const gameUrl = "https://sinerider.hackclub.dev/#random";

  // goto and wait until all assets are loaded
  await page.goto(gameUrl, { waitUntil: "networkidle0" });

  // will be better to page.waitForSelector before doing anything else
  await page.waitForSelector(clickToBeginSelector);
  const clickToBeginCTA = await page.$(clickToBeginSelector);
  await clickToBeginCTA?.click();

  // wait for selector here, too
  await page.waitForSelector(runButtonSelector);
  const runButton = await page.$(runButtonSelector);
  await runButton?.click();

  // sleep for 3s
  setTimeout(() => undefined, 3000);

  const levelURl = await page.evaluate("location.href");

  await browser.close();

  return levelURl as string;

}