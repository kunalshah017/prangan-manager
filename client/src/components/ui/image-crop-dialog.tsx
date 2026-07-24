import { useCallback, useEffect, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";

import { Modal } from "./modal";
import { CustomButton } from "./custom-button";

type ImageCropDialogProps = {
  file: File | null;
  onClose: () => void;
  onConfirm: (file: File) => void;
};

const createCroppedFile = async (
  imageSource: string,
  crop: Area,
  originalFile: File,
): Promise<File> => {
  const image = new Image();
  image.src = imageSource;
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error("Unable to prepare image crop"));
  });

  const canvas = document.createElement("canvas");
  canvas.width = crop.width;
  canvas.height = crop.height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Unable to crop image");

  context.drawImage(
    image,
    crop.x,
    crop.y,
    crop.width,
    crop.height,
    0,
    0,
    crop.width,
    crop.height,
  );

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, originalFile.type || "image/jpeg", 0.9),
  );
  if (!blob) throw new Error("Unable to crop image");

  return new File([blob], originalFile.name, {
    type: blob.type || originalFile.type,
    lastModified: Date.now(),
  });
};

export const ImageCropDialog = ({ file, onClose, onConfirm }: ImageCropDialogProps) => {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [cropArea, setCropArea] = useState<Area | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [imageSource, setImageSource] = useState("");

  useEffect(() => {
    if (!file) {
      setImageSource("");
      return;
    }

    const source = URL.createObjectURL(file);
    setImageSource(source);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCropArea(null);

    return () => URL.revokeObjectURL(source);
  }, [file]);

  const handleCropComplete = useCallback((_area: Area, areaPixels: Area) => {
    setCropArea(areaPixels);
  }, []);

  const handleConfirm = async () => {
    if (!file || !cropArea) return;
    setIsSaving(true);
    try {
      onConfirm(await createCroppedFile(imageSource, cropArea, file));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal isOpen={!!file} onClose={onClose} title="Crop profile image" className="max-w-xl">
      <div className="space-y-4">
        <div className="relative h-72 overflow-hidden rounded-md bg-black">
          {imageSource && (
            <Cropper
              image={imageSource}
              crop={crop}
              zoom={zoom}
              aspect={1}
              cropShape="round"
              onCropChange={setCrop}
              onCropComplete={handleCropComplete}
              onZoomChange={setZoom}
            />
          )}
        </div>
        <label className="block text-sm font-medium text-foreground" htmlFor="image-zoom">
          Zoom
        </label>
        <input
          id="image-zoom"
          type="range"
          min="1"
          max="3"
          step="0.05"
          value={zoom}
          onChange={(event) => setZoom(Number(event.target.value))}
          className="w-full"
        />
        <div className="flex justify-end gap-2">
          <CustomButton type="button" variant="outline" onClick={onClose} disabled={isSaving}>
            Cancel
          </CustomButton>
          <CustomButton type="button" onClick={handleConfirm} isLoading={isSaving}>
            Use cropped image
          </CustomButton>
        </div>
      </div>
    </Modal>
  );
};