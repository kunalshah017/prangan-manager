import { v2 as cloudinary } from "cloudinary";

export const REGISTRATION_FOLDER = "prangan-manager/registrations";

export const cloudinaryCredentials = () => {
  const {
    CLOUDINARY_CLOUD_NAME: cloud_name,
    CLOUDINARY_API_KEY: api_key,
    CLOUDINARY_API_SECRET: api_secret,
  } = process.env;
  return cloud_name && api_key && api_secret ? { cloud_name, api_key, api_secret } : null;
};

// The photo sent with a sign-up, as a data URL. The browser already shrinks it;
// the stored copy is limited here too, since anyone can send one.
export const REGISTRATION_PHOTO = /^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/;
export const REGISTRATION_PHOTO_MAX_LENGTH = 1_500_000;

export const uploadRegistrationPhoto = async (dataUrl: string): Promise<string> => {
  const credentials = cloudinaryCredentials();
  if (!credentials) throw new Error("Cloudinary isn't configured.");
  const uploaded = await cloudinary.uploader.upload(dataUrl, {
    ...credentials,
    folder: REGISTRATION_FOLDER,
    allowed_formats: ["jpg", "png", "webp"],
    format: "jpg",
    transformation: [{ width: 1200, height: 1200, crop: "limit", quality: 80 }],
  });
  return uploaded.secure_url;
};

// Only sign-up photos are deleted: a pending request's URL may predate the
// server upload and point at someone else's picture.
const REGISTRATION_IMAGE_URL = new RegExp(
  `^https://res\\.cloudinary\\.com/([^/]+)/image/upload/(?:v\\d+/)?(${REGISTRATION_FOLDER}/[^/.]+)\\.[a-z]+$`,
);

export const deleteRegistrationPhotoInBackground = (url: string | null | undefined) => {
  const credentials = cloudinaryCredentials();
  const match = url?.match(REGISTRATION_IMAGE_URL);
  if (!credentials || !match || match[1] !== credentials.cloud_name) return;
  void cloudinary.uploader
    .destroy(match[2], { ...credentials, invalidate: true })
    .catch((error: unknown) => console.error("Couldn't delete a sign-up photo:", error));
};
