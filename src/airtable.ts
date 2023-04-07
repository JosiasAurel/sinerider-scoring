import { base } from "./config.js";

export function saveLevel(levelUri: string) {
  return new Promise((resolve, reject) => {
    base("Levels").create([{
      fields: {
        url: levelUri,
        played: false
      }
    }], (err, records) => {
      if (err) reject(err);

      records ? resolve({ id: records[0].getId() }) : console.error(err);
    }
    )
  });
}

export function getUnplayedLevel() {
  return new Promise((resolve, reject) => {
    base("Levels").select({
      view: "Grid view",
      filterByFormula: "NOT({played})"
    }).eachPage((records, _) => {
      const randomLevel = records[Math.floor(Math.random() * records.length)];
      base("Levels").update(randomLevel.getId(), {
        played: true
      }).then(() => resolve(randomLevel.get("url")))
        .catch(err => console.log(err));

    }, (err) => reject(err))
  });
}

export function saveSolution({
  expression,
  level,
  time,
  charCount,
  playURL,
  gameplay,
  player,
  timestamp
}: Solution) {
  return new Promise((resolve, reject) => {
    base("Leaderboard").create(
      [
        {
          fields: {
            expression,
            level,
            time: parseFloat(time.toFixed(2)),
            playURL: playURL.split("?")[1],
            charCount,
            gameplay,
            player,
            timestamp,
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
          { field: "time", direction: "asc" },
        ],
      })
      .eachPage(
        (records, nextPage) => {
          records.forEach((record) => {
            const level = record.get("level");
            // console.log(level);
            if (level === levelName) {
              const expression = record.get("expression");
              const time = record.get("time");
              const playURL = record.get("playURL");
              const charCount = record.get("charCount");
              const gameplay = record.get("gameplay") ?? "";
              const player = record.get("player") ?? "";
              const timestamp = record.get("timestamp") ?? 0;

              scores.push({
                expression,
                time,
                playURL,
                charCount,
                gameplay,
                player,
                timestamp
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
          { field: "time", direction: "asc" },
        ],
      })
      .eachPage(
        (records, nextPage) => {
          records.forEach((record) => {
            const level = record.get("level");
            // console.log(level);
            const expression = record.get("expression");
            const time = record.get("time");
            const playURL = record.get("playURL");
            const charCount = record.get("charCount");
            const player = record.get("player") ?? "";
            const timestamp = record.get("timestamp") ?? 0;

            scores.push({
              expression,
              time,
              playURL,
              charCount,
              level,
              timestamp,
              player,
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
