import { config } from "dotenv";

config()

// cloudflare stuff
export const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;
export const CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY;
export const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET;
export const SINERIDER_URL_PREFIX = process.env.SINERIDER_URL_PREFIX;
export const SINERIDER_SCORING_PUBLIC_SSL_CERT = Buffer.from(process.env.SINERIDER_SCORING_PUBLIC_SSL_CERT as string, 'base64').toString('ascii');
export const SINERIDER_SCORING_PRIVATE_SSL_KEY = Buffer.from(process.env.SINERIDER_SCORING_PRIVATE_SSL_KEY as string, 'base64').toString('ascii');