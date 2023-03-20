# SineRider scoring server

The SineRider scoring API

## How to use (endpoints)

- Send a `POST` request to `/score` with body containing a link to the level (like { level: "http://localhost:7000/?N4IgbiBcAMB0CMAaEA7AlgYwNZRAZQEkA5EZAZwEMwBTAEwBkKAXagD1wFoAdLstFHgBtqAMyYAKVjwBOaAOYALJgEpSIOQHsKgslBQBXQYIC+QA" }) 

It will return an object of the form
```json
{
  "id": "id of record in airtable",
  "expression": "the-math-expression",
  "T": 3.5,
  "level": "levelName",
  "charCount": 5,
  "gameplay": "URL to a video of the gameplay using submitted solution"
}
```

- Send a `GET` request to `/all` to get all the scores that have been saved. The scores have been sorted by `charCount` and `T` both in ascending order.

- Send a `GET` request to `/level/<LEVEL_NAME>` (e.g `/level/HELLO_WORLD`) to get all scores for that specific level sorted by `charCount` and `T`.

- Send a `GET` request to `/generate` to generate a new level and store it in airtable. Does not return the URL to the generated game

- Send a `GET` request to `/daily` to get a random level from the airtable to play. Once the level is returned, the game url will be marked as *played* and may not be returned in the future.

