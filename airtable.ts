import { base } from "./config.js";

export function saveSolution({
  expression,
  level,
  T,
  charCount,
  playURL,
  gameplay,
}: Solution) {
  return new Promise((resolve, reject) => {
    base("Leaderboard").create(
      [
        {
          fields: {
            expression,
            level,
            T: parseFloat(T.toFixed(2)),
            playURL: playURL.split("?")[1],
            charCount,
            gameplay,
          },
        },
      ],
      (error, records) => {
        if (error) {
          reject(error);
        }

        records ? resolve({ id: records[0].getId() }) : console.error("Failed to write to airtable");
      }
    );
  });
}

export function getScoresByLevel(levelName: string) {
  return new Promise((resolve, reject) => {
    const scores: Partial<Solution>[] = [];
    base("Leaderboard")
      .select({
        view: "Grid view",
        sort: [
          { field: "charCount", direction: "asc" },
          { field: "T", direction: "asc" },
        ],
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
              const gameplay = record.get("gameplay") ?? "";

              scores.push({
                expression,
                T,
                playURL,
                charCount,
                gameplay,
              } as Solution);
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
    const scores: Partial<Solution>[] = [];
    base("Leaderboard")
      .select({
        view: "Grid view",
        sort: [
          { field: "charCount", direction: "asc" },
          { field: "T", direction: "asc" },
        ],
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
              level,
            } as Solution);
          });
          nextPage();
        },
        (err: any) => {
          if (err) reject(err);

          resolve(scores);
        }
      );
  });
}
