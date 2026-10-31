import { api } from "./api-client";

type UploadSignature = {
  cloudName: string;
  apiKey: string;
  allowed_formats: string;
  folder: string;
  timestamp: number;
  signature: string;
};

// The server signs each upload; the Cloudinary account takes no unsigned ones.
// People registering aren't signed in yet, so they use the public signature.
export const uploadToCloudinary = async (
  file: File,
  { forRegistration = false } = {},
): Promise<string> => {
  try {
    const signed = await api.get<UploadSignature>(
      forRegistration
        ? "/uploads/registration-image-signature"
        : "/uploads/image-signature",
    );
    const formData = new FormData();
    formData.append("file", file);
    formData.append("api_key", signed.apiKey);
    formData.append("allowed_formats", signed.allowed_formats);
    formData.append("folder", signed.folder);
    formData.append("timestamp", String(signed.timestamp));
    formData.append("signature", signed.signature);

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${signed.cloudName}/image/upload`,
      { method: "POST", body: formData },
    );

    if (!response.ok) {
      throw new Error("Upload failed");
    }

    const data = await response.json();
    return data.secure_url;
  } catch (error) {
    console.error("Error uploading to Cloudinary:", error);
    throw new Error("Failed to upload image", { cause: error });
  }
};

// Validate image file
export const validateImageFile = (file: File): string | null => {
  const allowedTypes = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/gif",
    "image/webp",
  ];
  const maxSize = 10 * 1024 * 1024; // 10MB

  if (!allowedTypes.includes(file.type)) {
    return "Please select a valid image file (JPEG, PNG, GIF, or WebP)";
  }

  if (file.size > maxSize) {
    return "Image size must be less than 10MB";
  }

  return null;
};
