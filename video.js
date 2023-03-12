import _cloudinary from "cloudinary";
import { CLOUD_NAME } from "./config.js";
const cloudinary = _cloudinary.v2;

// Configuration
cloudinary.config({
  cloud_name: CLOUD_NAME,
  api_key: process.env.CLOUDFLARE_API_KEY,
  api_secret: process.env.CLOUDFLARE_API_SECRET,
});

export async function uploadVideo(filename) {
  try {
    const uploadRes = await cloudinary.uploader.upload(`./${filename}`, {
      resource_type: "auto",
    });

    return {
      uri: uploadRes.secure_url,
      bytes: uploadRes.bytes,
      createdAt: uploadRes.created_at,
      publicId: uploadRes.public_id,
    };
  } catch (err) {
    console.log(err);
  }
}
