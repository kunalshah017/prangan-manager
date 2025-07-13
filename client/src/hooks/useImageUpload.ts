import { useState } from "react";
import { uploadToCloudinary, validateImageFile } from "@/lib/cloudinary";

interface UseImageUploadOptions {
  onSuccess?: (url: string) => void;
  onError?: (error: string) => void;
}

export const useImageUpload = (options?: UseImageUploadOptions) => {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const uploadImage = async (file: File): Promise<string | null> => {
    setError(null);

    // Validate file
    const validationError = validateImageFile(file);
    if (validationError) {
      setError(validationError);
      options?.onError?.(validationError);
      return null;
    }

    setIsUploading(true);
    try {
      const imageUrl = await uploadToCloudinary(file);
      options?.onSuccess?.(imageUrl);
      return imageUrl;
    } catch (err) {
      const errorMessage = "Failed to upload image. Please try again.";
      setError(errorMessage);
      options?.onError?.(errorMessage);
      console.error("Upload error:", err);
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  const clearError = () => setError(null);

  return {
    uploadImage,
    isUploading,
    error,
    clearError,
  };
};
