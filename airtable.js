import { base } from "./config.js";

export function saveSolution({ expression, level, T, charCount, playURL }) {
  return new Promise((resolve, reject) => {
    base("Leaderboard").create(
      [
        {
          fields: {
            expression,
            level,
            T: parseFloat(T),
            playURL: playURL.split("?")[1],
            charCount
          },
        },
      ],
      (error, records) => {
        if (error) {
          reject(error);
        }

        resolve({ id: records[0].getId() });
      }
    );
  }
  );
}

export function getScoresByLevel(levelName) {
  return new Promise((resolve, reject) => {
    const scores = [];
    base("Leaderboard")
      .select({
        view: "Grid view",
        sort: [{ field: "charCount", direction: "asc" }, { field: "T", direction: "asc" }]
      })
      .eachPage(
        (records, nextPage) => {
          records.forEach((record) => {
            const level = record.get("level");
            // console.log(level);
            if (level === levelName) {
              const expression = record.get("expression");
              const T = record.get("T");
              const playURL = record.get("playURL");
              const charCount = record.get("charCount");

              scores.push({
                expression,
                T,
                playURL,
                charCount
              });
            }
          });
          nextPage();
        },
        (err) => {
          if (err) reject(err);

          resolve(scores);
        }
      );
  });
}

export function getAllScores() {
  return new Promise((resolve, reject) => {
    const scores = [];
    base("Leaderboard")
      .select({
        view: "Grid view",
        sort: [{ field: "charCount", direction: "asc" }, { field: "T", direction: "asc" }]
      })
      .eachPage(
        (records, nextPage) => {
          records.forEach((record) => {
            const level = record.get("level");
            // console.log(level);
            const expression = record.get("expression");
            const T = record.get("T");
            const playURL = record.get("playURL");
            const charCount = record.get("charCount");

            scores.push({
              expression,
              T,
              playURL,
              charCount,
              level
            });
          });
          nextPage();
        },
        (err) => {
          if (err) reject(err);

          resolve(scores);
        }
      );
  });
}