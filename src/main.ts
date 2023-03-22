import puppeteer from "puppeteer";
import PuppeteerVideoRecorder from "../external/index.js";

export const playLevel = async (levelUrl: string, videoName: string) => {
  // init page record
  const recorder = new PuppeteerVideoRecorder(videoName);

  console.log("Launching puppeteer")
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  console.log("Loading page...")
  const page = await browser.newPage();

  console.log("Setting viewport")
  await page.setViewport({ width: 1280, height: 720 });

  console.log("Init page recorder")

  // init page recorder with page
  recorder.init(page, "./");
  recorder.fsHandler.videoFilename = videoName;

  // selectors
  const clickToBeginSelector = "#loading-string"; // will have to wait until page is fully loaded before clicking
  const runButtonSelector = "#run-button";
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

  console.log("Starting recording...")

  // start recording
  await recorder.start();

  // wait for selector here, too
  await page.waitForSelector(runButtonSelector);
  const runButton = await page.$(runButtonSelector);
  await runButton?.click();

  // const victoryLabel = await page.$(victoryLabelSelector)

  // const fnResult = await page.waitForFunction('window.world.level.completed')
  await page.waitForFunction("world.level.completed === true", { timeout: 0 });

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

  const ret = { expression, T, level, gameplay: gamplayVideoUri } as { expression: string, T: number, level: string, gameplay: string };
  console.log(ret);

  return ret;
};

// ignores whitespace in expression
// probably makes more sense to count sin, cos as units of their own
export function getCharCount(expression: string) {
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

