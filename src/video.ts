import _cloudinary from "cloudinary";
import {
  CLOUD_NAME,
  CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET,
} from "./config.js";
const cloudinary = _cloudinary.v2;

// Configuration
cloudinary.config({
  cloud_name: CLOUD_NAME,
  api_key: CLOUDINARY_API_KEY,
  api_secret: CLOUDINARY_API_SECRET,
});

export async function uploadVideo(filename: string) {
  try {
    const uploadRes = await cloudinary.uploader.upload(`${filename}`, {
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
