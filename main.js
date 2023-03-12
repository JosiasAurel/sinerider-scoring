import puppeteer from "puppeteer";
import PuppeteerVideoRecorder from "puppeteer-video-recorder";

export const playLevel = async (levelUrl, videoName) => {
  // init page record
  const recorder = new PuppeteerVideoRecorder();

  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  const page = await browser.newPage();

  await page.setViewport({ width: 1280, height: 720 });

  // init page recorder with page
  recorder.init(page, "./");
  recorder.fsHandler.videoFilename = videoName;

  // selectors
  const clickToBeginSelector = "#loading-string"; // will have to wait until page is fully loaded before clicking
  const runButtonSelector = "#run-button";
  // const victoryLabelSelector = '#victory-label'

  // goto and wait until all assets are loaded
  await page.goto(levelUrl, { waitUntil: "networkidle0" });

  // will be better to page.waitForSelector before doing anything else
  await page.waitForSelector(clickToBeginSelector);
  const clickToBeginCTA = await page.$(clickToBeginSelector);
  await clickToBeginCTA.click();

  // start recording
  await recorder.start();

  // wait for selector here, too
  await page.waitForSelector(runButtonSelector);
  const runButton = await page.$(runButtonSelector);
  await runButton.click();

  // const victoryLabel = await page.$(victoryLabelSelector)

  // const fnResult = await page.waitForFunction('window.world.level.completed')
  await page.waitForFunction("world.level.completed === true", { timeout: 0 });

  // stop video recording
  await recorder.stop();

  // get results
  const expression = await page.evaluate(
    "world.level.ui.mathField.getPlainExpression()"
  );
  const T = await page.evaluate(
    "parseFloat(world.level.ui.runButton.innerText.trim().split('=')[1])"
  );
  const level = await page.evaluate("world.level.name");

  // console.log(expression, T);

  /*
  await page.screenshot({
    path: "finalGame.png"
  })
  */

  await browser.close();

  return { expression, T, level };
};

// ignores whitespace in expression
// probably makes more sense to count sin, cos as units of their own
export function getCharCount(expression) {
  let count = 0;
  for (let char of expression) {
    if (char !== " ") count++;
  }

  return count;
}

/*
playLevel(testingLevel2)
  .then(result => {
    const charCount = getCharCount(result.expression);

    console.table(result);
    console.log("Char count = ", charCount);
  })

*/
