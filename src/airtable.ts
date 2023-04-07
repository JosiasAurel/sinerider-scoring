import { base } from "./config.js";

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

