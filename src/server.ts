import express from "express";
import cors from "cors";
import { playLevel, ScoringTimeoutError } from "./main.js";
import { nanoid } from "nanoid";
import fs from 'fs'
import os from 'os'
import { v4 as uuidv4 } from 'uuid';
import PQueue from 'p-queue';
import { RATE_LIMIT_MAX_REQUESTS, RATE_LIMIT_WINDOW_MS } from "./config.js";
import http from 'http'
import rateLimiter from "express-rate-limit"

const app = express();

app.use(express.json());
app.use(cors());

const port = process.env.PORT ?? 3000;

app.get("/", (req, res) => {
  res.send("SineRider is cool!");
});

let scoringRateLimiter = rateLimiter({
  max: RATE_LIMIT_MAX_REQUESTS,
  windowMs: RATE_LIMIT_WINDOW_MS,
  message: "You can't make any more requests at the moment. Try again later",
});

app.post("/score", scoringRateLimiter, async (req, res) => {
  const { level } = req.body;

  console.log("/score begin")

  score(level).then(result => {
    console.log("success")
    res.status(200).json(result);
  }).catch(e => {
    if (e instanceof ScoringTimeoutError) {
      console.log("timeout")
      res.status(408).json({ message: "Failed scoring due to timeout" })
    } else {
      console.log("Error: ", e)
      res.status(500).json({ message: "Internal server error" })
    }
  })
  console.log("/score complete")
});

async function score(level: string) {
  let videoName: string = makeVideoName();

  console.log("Starting playLevel...")
  const folder = await new Promise<string>((resolve, reject) => {
    fs.mkdtemp(os.tmpdir().endsWith("/") ? os.tmpdir() + uuidv4() : os.tmpdir() + "/" + uuidv4(), async (err, f) => {
      if (err) reject(err.message)
      console.log(`Temp directory: ${f}`)
      resolve(f)
    });
  });

  return await playLevel(level, folder);
}

http
  .createServer(app)
  .listen(port, () => {
    console.log(`Doing some black magic on port ${port}...`)
  });

function cleanup(folder: string) {
  try {
    // Clean up afterwards
    console.log("Cleaning up temp directory: " + folder)
    fs.rmSync(folder, { recursive: true, force: true });
  } catch (e) {
    console.log("Failed to clean up temp directory")
  }
}
function makeVideoName(): string {
  let name = `${nanoid(8)}.mp4`;
  if (name.startsWith("-")) return makeVideoName();
  return name;
}
