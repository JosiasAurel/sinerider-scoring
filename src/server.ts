import express from "express";
import cors from "cors";
import { getScoresByLevel, saveSolution, getAllScores, saveLevel, getUnplayedLevel } from "./airtable.js";
import { playLevel, generateLevel, ScoringResult, ScoringTimeoutError } from "./main.js";
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
import { SINERIDER_URL_PREFIX, SINERIDER_SCORING_PRIVATE_SSL_KEY, SINERIDER_SCORING_PUBLIC_SSL_CERT } from "./config.js";
import https from 'https'

const app = express();

app.use(express.json());
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

app.post("/score", async (req, res) => {
  const level = req.body.level;

  if (!level.startsWith(SINERIDER_URL_PREFIX)) {
    res.status(400).json({message:`Invalid level URL (must start with ${SINERIDER_URL_PREFIX})`})
    return
  }

  addScoringJob(level).then(result => {
    console.log("success")
    res.status(200).json(result);  
  }).catch(e => {
    if (e instanceof ScoringTimeoutError) {
      console.log("timeout")
      res.status(408).json({message:"Failed scoring due to timeout"})
    } else {
      console.log("error")
      res.status(500).json({message:"Internal server error"})
    }
  })
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

async function score(level:string) {
  let videoName: string = makeVideoName();

  console.log("Starting playLevel...")
  const folder = await new Promise<string>((resolve, reject) => {
    fs.mkdtemp(os.tmpdir().endsWith("/") ? os.tmpdir() + uuidv4() : os.tmpdir() + "/" + uuidv4(), async (err, f) => {
      if (err) reject(err.message)
      console.log(`Temp directory: ${f}`)
      resolve(f)    
    });  
  });

  return await playLevel(level, videoName, folder);  
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

https
  .createServer({ key: SINERIDER_SCORING_PRIVATE_SSL_KEY, cert: SINERIDER_SCORING_PUBLIC_SSL_CERT}, app)
  .listen(port, () => {
    console.log(`Doing some black magic on port ${port}...`)
  });

function cleanup(folder:string) {
  try {
    // Clean up afterwards
    console.log("Cleaning up temp directory: " + folder)
    fs.rmSync(folder, { recursive: true, force: true });
  } catch (e) {
    console.log("Failed to clean up temp directory")
  }
}
function makeVideoName(): string {
  let name = `${nanoid(8)}.webm`;
  if (name.startsWith("-")) return makeVideoName();
  return name;
}
