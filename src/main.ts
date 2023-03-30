import puppeteer, { TimeoutError } from "puppeteer";
import PuppeteerVideoRecorder from "../external/index.js";

export const playLevel = async (rawLevelUrl: string, videoName: string, folder: string) => {
  const startTime = Date.now()  
  const tickRate = 1000
  const drawModulo = 1
  const defaultTickRate = 30

  const levelUrl = `${rawLevelUrl}&ticksPerSecond=${tickRate}&drawModulo=${drawModulo}`
  console.log(`levelUrl: ${levelUrl}`)

  console.log("Launching puppeteer")
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  console.log("Loading page...")
  const page = await browser.newPage();

  page
  .on('console', message =>
    console.log(`${message.type().substr(0, 3).toUpperCase()} ${message.text()}`))
  .on('pageerror', ({ message }) => console.log(message))
  .on('response', response =>
    console.log(`${response.status()} ${response.url()}`))
  .on('requestfailed', request =>
    console.log(`${request.failure().errorText} ${request.url()}`))

  console.log("Setting viewport")
  await page.setViewport({ width: 512, height: 348 });

  // selectors
  const clickToBeginSelector = "#loading-string"; // will have to wait until page is fully loaded before clicking
  // const victoryLabelSelector = '#victory-label'

  console.log("Loading page and waiting for all assets")

  // goto and wait until all assets are loaded
  await page.goto(levelUrl, { waitUntil: "networkidle0" });

  console.log("Waiting for the click to begin selector...")

  // will be better to page.waitForSelector before doing anything else
  await page.waitForSelector(clickToBeginSelector);
  const clickToBeginCTA = await page.$(clickToBeginSelector);

  console.log("Issuing click to start")

  await clickToBeginCTA?.click();

  // Wait 250ms
  console.log("Waiting 250ms")
  await new Promise(f => setTimeout(f, 250))
  console.log("Continuing...")

  // init page recorder with page
  console.log("Init page recorder")
  const recorder = await new PuppeteerVideoRecorder(folder, page).init()

  // start recording
  console.log("Starting recording...")
  await recorder.start();

  const runStartTime = Date.now()
  await page.evaluate('onClickRunButton (null)');

  // const victoryLabel = await page.$(victoryLabelSelector)

  // const fnResult = await page.waitForFunction('window.world.level.completed')
  try {
    // Adjust our timeout based on the expected time we take given the fps we use
    // 30 seconds is the normal amount of time we want to timeout w/
    // 30 hz is the normal game tick rate
    // thus, the adjusted time (in ms) is 30 sec * defaultTickRate / tickRate * 1000 ms/sec
    const expectedTimeoutMs = 30.0 * (defaultTickRate / tickRate) * 1000.0

    // We will allow 5% extra time to account for anomalies
    const paddedTimeoutMs = expectedTimeoutMs * 5

    console.log(`Note: We will wait ${paddedTimeoutMs} ms (adjusted from 30000 due to tickrate: ${tickRate})`)

    // await page.waitForFunction('document.getElementById("completion-time").value != ""');
    await page.waitForFunction('document.getElementById("completion-time").innerText.length > 0')

    const elapsedRunTimeMs = Date.now() - runStartTime
    console.log(`Had to wait ${elapsedRunTimeMs}ms`)

  } catch (e) {
    if (e instanceof TimeoutError) {
      console.log("Recording timed out!")
      const funnyMsg = "Rut roh!"
      return { message: `${funnyMsg}  Solution not reached within 30 seconds!` }
    }
  }

  // To avoid chopping the end of the video prematurely, we will stop the video 1 second later, adjusted
  // for our tick rate time scaling
  const tailWaitTimeMs = 1 * (defaultTickRate / tickRate) * 1000.0
  console.log(`Waiting ${tailWaitTimeMs}ms`)
  await new Promise(f => setTimeout(f, tailWaitTimeMs))
  console.log("Continuing...")
  
  // stop video recording
  const gamplayVideoUri = await recorder.stop();

  console.log("Grabbing expression...")

  // get results
  const expression = await page.evaluate(
    "world.level.ui.mathField.getPlainExpression()"
  );

  console.log("Grabbing score...")

  const T = await page.evaluate(
    "parseFloat(world.level.ui.completionTime.innerText)"
  );

  console.log("Grabbing level name...")

  const level = await page.evaluate("world.level.name");

  // console.log(expression, T);

  /*
  await page.screenshot({
    path: "finalGame.png"
  })
  */

  console.log("Closing browser...")

  await browser.close();

  console.log("Total runtime: " + ((Date.now() - startTime) / 1000) + " seconds")

  const cnt = getCharCount(expression as string);

  return {
    T: T,
    expression: expression,
    charCount: cnt,
    playURL: level,
    level: level,
    gameplay: gamplayVideoUri
  };
};

// ignores whitespace in expression
// probably makes more sense to count sin, cos as units of their own
export function getCharCount(expression: string) : number {
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

