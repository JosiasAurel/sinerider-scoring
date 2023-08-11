import puppeteer, { Page, TimeoutError } from "puppeteer";
import PuppeteerVideoRecorder from "../external/index.js";
import { BROWSERLESS_TOKEN } from "./config.js";
import { TICK_RATE, DRAW_MODULO } from "./config.js";
import metrics from "./metrics.js";


export class ScoringTimeoutError extends TimeoutError {
}

// On top of your code
let cache: { [url: string]: CacheEntry } = {};

const USE_BROWSERLESS = true

export async function playLevel(rawLevelUrl: string, folder: string) {
  const tickRate = TICK_RATE
  const fastTickRate = tickRate * 10
  const drawModulo = DRAW_MODULO
  const fastDrawModulo = Number.POSITIVE_INFINITY

  // The general strategy is that we will simulate the game 2 times.
  // The first time, we use a very high tick rate, and do NOT record video.  This is used to determine whether or not the solution is valid or not.
  const result = await simulate(rawLevelUrl, fastTickRate, fastDrawModulo, folder, false)

  console.log(`timing result: ${result.time}`)
  metrics.timing("game.simulate.time", result.time * 1000);

  // If the time is over 30 seconds, we can just return the result immediately as no video is required.
  if (result.time > 30)
    return result;

  // The second time, we use a normal tick rate and we DO record video.  This is only to generate video.
  return await simulate(rawLevelUrl, tickRate, drawModulo, folder, true)
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

async function loadGame(rawLevelUrl: string, tickRate:number, drawModulo:number, folder:string) : Promise<BrowserContext> {

  const startTime = Date.now()
  const levelUrl = `${rawLevelUrl}&ticksPerSecond=${tickRate}&drawModulo=${drawModulo}`
  console.log(`levelUrl: ${levelUrl}`)

  const browser = await getBrowser()
  console.log("Launching puppeteer")

  console.log("Loading page...")
  const page = await browser.newPage();

  var alertPoppedUp = false
  page.on('dialog', async dialog => {
    console.log("Whooooa we got an alert dialog!")
    await dialog.accept();
    alertPoppedUp = true;
  })

  page
    .on('console', message => console.log(`${message.type().substr(0, 3).toUpperCase()} ${message.text()}`))
    .on('pageerror', ({ message }) => console.log(message))
    .on('response', response => console.log(`${response.status()} ${response.url()}`))
    .on('requestfailed', request => console.log(`${request.failure().errorText} ${request.url()}`))

  console.log("Setting viewport")
  await page.setViewport({ width: 1024, height: 768 });

  console.log("Loading page and waiting for all assets")
  await page.goto(levelUrl, { waitUntil: "networkidle0", timeout: 30000 })

  console.log("Waiting for the click to begin selector...")
  const clickToBeginSelector = "#loading-string";
  await page.waitForSelector(clickToBeginSelector, { timeout:10000 });

  const elapsedPageLoadTimeMs = Date.now() - startTime;
  console.log(`Page took ${elapsedPageLoadTimeMs}ms to load`)

  if (alertPoppedUp) throw new ScoringTimeoutError()

  const clickToBeginCTA = await page.$(clickToBeginSelector)

  console.log("Issuing click to start")
  await clickToBeginCTA?.click();

  await pauseMs(3000);

  const expression = await page.evaluate("world.level.currentLatex") as string;
  const level = await page.evaluate("world.level.name") as string;
  const cnt = getCharCount(expression as string) as number;

  return {page:page, browser:browser, beginButton:clickToBeginCTA, expression:expression, level:level, cnt:cnt, folder:folder} as BrowserContext
}

async function destroyGame(cxt: BrowserContext) {
  // It is very important to close the browser - always
  if (cxt.browser != null) {
    await cxt.browser.close()
    cxt.browser = null
  }  
  metrics.increment("game.simulate.destroy", 1);
}

async function pauseMs(ms: number) {
  console.log(`Waiting ${ms}ms`)
  await new Promise(f => setTimeout(f, ms))
  console.log("Continuing...")
}


async function executeGame(cxt: BrowserContext, shouldRecord:boolean = false) {
  var recorder = new PuppeteerVideoRecorder(cxt.folder, cxt.page)
  if (shouldRecord) {
    console.log("Init page recorder")
    await recorder.init()
  
    console.log("Starting recording...")
    await recorder.start();  
  }


  try {
    await cxt.page.evaluate('onClickRunButton (null)')
    await cxt.page.waitForFunction('document.getElementById("completion-time").innerText.length > 0', { timeout: shouldRecord ? 120000 : 15000 })

    if (shouldRecord) {
      await pauseMs(1000)  
    }
    var time = await cxt.page.evaluate('parseFloat(document.getElementById("completion-time").innerText)') as number;

    // Any time over 30 seconds is invalid (not allowed by rules).  Score these as if they are infinitely long
    if (time > 30) {
      time = Number.POSITIVE_INFINITY
    }
  
    var gameplay = ""
    if (shouldRecord) {
      gameplay = await recorder.stop();
    }

    metrics.increment("game.execute.success", 1);  
    return { time: time, expression: cxt.expression, charCount: cxt.cnt, playURL: cxt.rawLevelUrl, level: cxt.level, gameplay: gameplay } as ScoringResult
  }  
  catch (e) {
    metrics.increment("game.execute.error", 1);
    if (e instanceof TimeoutError) {
      return { time: Number.POSITIVE_INFINITY, expression: cxt.expression, charCount: cxt.cnt, playURL: cxt.rawLevelUrl, level: cxt.level, gameplay: "" } as ScoringResult      
    }
    throw e
  }
}

async function getBrowser() {
  if (USE_BROWSERLESS) {
    return await puppeteer.connect({
      browserWSEndpoint: `wss://chrome.browserless.io?token=${BROWSERLESS_TOKEN}`
    });  
  } else {
    return await puppeteer.launch({
      headless: false,
      ignoreDefaultArgs: [
        "--mute-audio",
      ],
      args: [
        "--no-sandbox", "--disable-setuid-sandbox", "--autoplay-policy=no-user-gesture-required",
      ]
    });  
  }
}

async function simulate(rawLevelUrl:string, tickRate:number, drawModulo:number, folder:string, shouldRecord:boolean) {
  var cxt = await loadGame(rawLevelUrl, tickRate, drawModulo, folder);

  try {
    const result = await executeGame(cxt, shouldRecord)
    metrics.increment("game.simulate.success", 1);

    if (result.time == Number.POSITIVE_INFINITY) {
      metrics.increment("game.simulate.timeout", 1);
    } else {
      metrics.timing("game.simulate.time", result.time * 1000);
    }

    return result;
  } catch (e) {
    metrics.increment("game.simulate.error", 1);
    if (e instanceof TimeoutError) {
      return { time: Number.POSITIVE_INFINITY, expression: cxt.expression, charCount: cxt.cnt, playURL: rawLevelUrl, level: cxt.level, gameplay: "" } as ScoringResult
    }
    throw e;
  } finally {
    await destroyGame(cxt)
  }
}

