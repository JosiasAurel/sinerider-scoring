import express from "express";
import cors from "cors";
import { getScoresByLevel, saveSolution, getAllScores, saveLevel, getUnplayedLevel } from "./airtable.js";
import { playLevel, generateLevel, ScoringResult } from "./main.js";
import { nanoid } from "nanoid";
import { uploadVideo } from "./video.js";
import { accessSync, constants, rmSync, watchFile } from "fs";
import { Response } from "express-serve-static-core";
import fs from 'fs'
import path from 'path'
import os from 'os'
import {v4 as uuidv4} from 'uuid';
import PQueue from 'p-queue';
import { TimeoutError } from "puppeteer";
import { SINERIDER_URL_PREFIX } from "./config.js";

const app = express();

// setup json
app.use(express.json());
// should fix cors issues
app.use(cors());

const port = process.env.PORT ?? 3000;

app.get("/", (req, res) => {
  res.send("SineRider is cool!");
});

app.get("/level/:name", (req, res) => {
  const levelName = req.params.name;

  getScoresByLevel(levelName)
    .then((scores) => res.json({ success: true, scores }))
    .catch((err) => res.json({ success: false, reason: err }));
});

app.get("/all", (req, res) => {
  getAllScores()
    .then((scores) => res.json({ success: true, scores }))
    .catch((err) => res.json({ success: false, reason: err }));
});

// Process scoring jobs one at a time.
const queue = new PQueue({ concurrency: 1 });
async function addScoringJob(level: string) {
  return await new Promise<ScoringResult>(async (resolve, reject) => {
    return await queue.add(async () => {
      try {
        resolve(await score(level));
      } catch (e) {
        reject(e);
      }
    });
  });  
}

app.post("/score", async (req, res) => {
  try {
    const level = req.body.level;

    if (!level.startsWith(SINERIDER_URL_PREFIX)) {
      res.status(400).json({message:`Invalid level URL (must start with ${SINERIDER_URL_PREFIX})`})
      return
    }

    const result = await addScoringJob(level);
    res.status(200).json(result);  
  } catch (e) {
    if (e instanceof TimeoutError) {
      res.status(408).json({message:"Failed scoring due to timeout"})
    } else {
      res.status(500).json({message:"Internal server error"})
    }
  }
});

async function score(level:string) {
  let videoName: string = makeVideoName();
  function makeVideoName(): string {
    let name = `${nanoid(8)}.webm`;
    if (name.startsWith("-")) return makeVideoName();
    return name;
  }

  console.log("Starting playLevel...")
  
  const tempDir = os.tmpdir()
  const uuid = uuidv4()
  const fullDir = tempDir.endsWith("/") ? tempDir + uuid : tempDir + "/" + uuid
  console.log(`Making directory: ${fullDir}`)
  var results = null

  const folder = await new Promise<string>((resolve, reject) => {
    fs.mkdtemp(fullDir, async (err, f) => {
      if (err) reject(err.message)
      console.log(`Actual temp directory: ${f}`)
      resolve(f)    
    });  
  });
  results = await playLevel(level, videoName, folder)

  // Clean up afterwards
  console.log("Attempting to clean up folder: " + folder)
  fs.rmSync(folder, { recursive: true, force: true });

  return results
}

app.get("/daily", (_, res) => {
  getUnplayedLevel()
    .then(level => res.json({ level, success: true }))
    .catch((err) => res.json({ success: false }));
});

app.get("/generate", async (req, res) => {
  const newLevel = await generateLevel();
  saveLevel(newLevel)
    .then(() => res.json({ success: true }))
    .catch(() => res.json({ success: false }));
});

app.listen(port, () =>
  console.log(`Doing some black magic on port ${port}...`)
);


function finishWork(res: Response<any, Record<string, any>, number>, solution: Solution) {
  const videoName = "PLEASE_FIX_ME";
  uploadVideo(videoName)
    .then((result) => (solution.gameplay = result?.uri ?? ""))
    .then(() => {
      saveSolution(solution)
        .then((data: any) => // string ? { id: string }
          res.json({ success: true, id: data.id, ...solution })
        )
        .then(() => {
          // rmSync(videoName); // remove video after upload
        })
        .catch((err) => res.json({ success: false, reason: err }));
    });
  const fileExistCheck = setInterval(() => {
    try {
      accessSync(videoName, constants.F_OK);
      watchFile(videoName, { bigint: false, persistent: true, interval: 1000 }, (curr, prev) => {
        const diffSeconds = (curr.mtimeMs - prev.mtimeMs) / 1000;
        if (diffSeconds >= 5) {

        }
      });

      clearInterval(fileExistCheck);
    } catch { }
  }, 1000);

  /*
  setTimeout(() => {
    try {
      accessSync(videoName, constants.F_OK);
      uploadVideo(videoName)
        .then((result) => (solution.gameplay = result.uri))
        .then(() => {
          saveSolution(solution)
            .then((data) =>
              res.json({ success: true, id: data.id, ...solution })
            )
            .catch((err) => res.json({ success: false, reason: err }));
        });

      // clearInterval(fileExistCheck);
    } catch { }
  }, 10000);
  */
}