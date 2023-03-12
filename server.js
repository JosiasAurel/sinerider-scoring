import express from "express";
import cors from "cors";
import { getScoresByLevel, saveSolution, getAllScores } from "./airtable.js";
import { playLevel, getCharCount } from "./main.js";
import { nanoid } from "nanoid";
import { uploadVideo } from "./video.js";
import { accessSync, constants } from "fs";

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
  // level is a url to the body to the game from the user
  const { level } = req.body;

  const videoName = `${nanoid(8)}.gif`;
  let solution;
  let videoDetails;
  playLevel(level, videoName)
    .then((result) => {
      solution = {
        T: result.T,
        expression: result.expression,
        charCount: getCharCount(result.expression),
        playURL: level,
        level: result.level,
      };

      /*
      const fileExistCheck = setInterval(() => {
        try {
          accessSync(videoName, constants.F_OK);
          uploadVideo(videoName).then((result) => (videoDetails = result));
          clearInterval(fileExistCheck);
        } catch {}
      }, 3000);
      */

      setTimeout(() => {
        try {
          accessSync(videoName, constants.F_OK);
          uploadVideo(videoName).then((result) => (videoDetails = result));
          clearInterval(fileExistCheck);
        } catch {}
      }, 10000);
      console.log("videoDetails: ", videoDetails);
    })
    .then(() => {
      saveSolution(solution)
        .then((data) => res.json({ success: true, id: data.id, ...solution }))
        .catch((err) => res.json({ success: false, reason: err }));
    });
});

app.listen(port, () =>
  console.log(`Doing some black magic on port ${port}...`)
);
