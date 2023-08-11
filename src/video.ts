import _cloudinary from "cloudinary";
import {
  CLOUD_NAME,
  CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET,
} from "./config.js";
import metrics from "./metrics.js";

const cloudinary = _cloudinary.v2;

// Configuration
cloudinary.config({
  cloud_name: CLOUD_NAME,
  api_key: CLOUDINARY_API_KEY,
  api_secret: CLOUDINARY_API_SECRET,
});

export async function uploadVideo(filename: string) {
  try {
    const startTimeMs = Date.now()
    const uploadRes = await cloudinary.uploader.upload(`${filename}`, {
      resource_type: "auto",
    });
    const elapsedTimeMs = startTimeMs - Date.now();

    metrics.timing(`cloudinary.upload.${filename}.time`, elapsedTimeMs);
    metrics.increment(`cloudinary.upload.${filename}.success`, 1);
    return {
      uri: uploadRes.secure_url,
      bytes: uploadRes.bytes,
      createdAt: uploadRes.created_at,
      publicId: uploadRes.public_id,
    };
  } catch (err) {
    metrics.increment(`cloudinary.upload.${filename}.failure`, 1);
    console.log(err);
  }
}
