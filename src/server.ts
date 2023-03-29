import express from "express";
import cors from "cors";
import { getScoresByLevel, saveSolution, getAllScores, saveLevel, getUnplayedLevel } from "./airtable.js";
import { playLevel, getCharCount, generateLevel } from "./main.js";
import { nanoid } from "nanoid";
import { uploadVideo } from "./video.js";
import { accessSync, constants, rmSync, watchFile } from "fs";
import { Response } from "express-serve-static-core";
import fs from 'fs'
import path from 'path'
import os from 'os'
import {v4 as uuidv4} from 'uuid';

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

// will return either a { success: true, id: <ID_OF_RECORD> } if successfully saved
// or { success: false } if failed
app.post("/score", async (req, res) => {
  console.log("Starting scoring...")
  // level is a url to the body to the game from the user
  const { level } = req.body;

  let videoName: string = makeVideoName();
  function makeVideoName(): string {
    let name = `${nanoid(8)}.webm`;
    if (name.startsWith("-")) return makeVideoName();
    return name;
  }

  let solution: Solution;
  console.log("Starting playLevel...")
  
  const tempDir = os.tmpdir()
  const uuid = uuidv4()
  const fullDir = tempDir.endsWith("/") ? tempDir + uuid : tempDir + "/" + uuid
  console.log(`Making directory: ${fullDir}`)
  fs.mkdtemp(fullDir, (err, folder) => {
    if (err) throw err;
    console.log(`Actual temp directory: ${folder}`)    

    playLevel(level, videoName, folder).then((result) => {
      res.json(result);
      //finishWork(videoName, res, solution);    
    });
    
    // Clean up afterwards
    console.log("Attempting to clean up folder: " + folder)
    fs.rmSync(folder, { recursive: true, force: true });
  });

});

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