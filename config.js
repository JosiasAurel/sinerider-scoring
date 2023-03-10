import Airtable from "airtable";

const SINERIDER_AIRTABLE_API_KEY =
  "patTxWepK5IF1rtaM.bc9020cdcf682c2c9cac19fde90a4b2e502f121c8e2f9fbf17257c84054b17d5";

Airtable.configure({
  endpointUrl: "https://api.airtable.com",
  apiKey: SINERIDER_AIRTABLE_API_KEY,
});

const base = Airtable.base("appRrAVVwcQpvGBnR");

export { base };