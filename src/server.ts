import express from "express";
import cors from "cors";
import { playLevel, ScoringTimeoutError } from "./main.js";
import { nanoid } from "nanoid";
import fs from 'fs'
import os from 'os'
import { v4 as uuidv4 } from 'uuid';
import PQueue from 'p-queue';
import { MAX_CONCURRENT_REQUESTS } from "./config.js";
import http from 'https'

const app = express();

app.use(express.json());
app.use(cors());

const port = process.env.PORT ?? 3000;

app.get("/", (req, res) => {
  res.send("SineRider is cool!");
});

app.post("/score", async (req, res) => {
  const { level } = req.body;

  addScoringJob(level).then(result => {
    console.log("success")
    res.status(200).json(result);
  }).catch(e => {
    if (e instanceof ScoringTimeoutError) {
      console.log("timeout")
      res.status(408).json({ message: "Failed scoring due to timeout" })
    } else {
      console.log("error")
      res.status(500).json({ message: "Internal server error" })
    }
  })
});

// Process scoring jobs one at a time.
const queue = new PQueue({ concurrency: MAX_CONCURRENT_REQUESTS });
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

  return await playLevel(level, videoName, folder);
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
