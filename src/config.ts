import { config } from "dotenv";

// Assume if this environment variable isn't set, we're not in production, and we should load our environment variables from .env
if (!process.env.CLOUDINARY_CLOUD_NAME)
    config()

// cloudflare stuff
export const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;
export const CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY;
export const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET;
export const SINERIDER_URL_PREFIX = process.env.SINERIDER_URL_PREFIX;
export const SINERIDER_DEV_URL_PREFIX = process.env.SINERIDER_DEV_URL_PREFIX;
export const BROWSERLESS_TOKEN = process.env.BROWSERLESS_TOKEN;
export const MAX_CONCURRENT_REQUESTS = Number(process.env.MAX_CONCURRENT_REQUESTS);