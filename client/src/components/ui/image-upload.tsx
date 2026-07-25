import React, { useState, useRef } from 'react';
import { Upload, X, Image as ImageIcon, Camera, FolderOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import { uploadToCloudinary, validateImageFile } from '@/lib/cloudinary';
import LoadingButterfly from '@/components/LoadingButterfly';
import { Modal } from './modal';
import { ImageCropDialog } from './image-crop-dialog';

interface ImageUploadProps {
    value?: string;
    fallbackValue?: string;
    fallbackLabel?: string;
    onChange: (url: string) => void;
    onRemove?: () => void;
    disabled?: boolean;
    className?: string;
    label?: string;
    required?: boolean;
    placeholder?: string;
    variant?: 'default' | 'rounded';
}

const ImageUpload: React.FC<ImageUploadProps> = ({
    value,
    fallbackValue,
    fallbackLabel = "Default image",
    onChange,
    onRemove,
    disabled = false,
    className,
    label = "Image",
    required = false,
    placeholder = "Click to upload or drag and drop",
    variant = 'default'
}) => {
    const [isUploading, setIsUploading] = useState(false);
    const [dragActive, setDragActive] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showOptions, setShowOptions] = useState(false);
    const [pendingCropFile, setPendingCropFile] = useState<File | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const cameraInputRef = useRef<HTMLInputElement>(null);
    const previewValue = value || fallbackValue;
    const accessibleLabel = label || "Image";
    const isRounded = variant === 'rounded';

    const uploadFile = async (file: File) => {
        setError(null);

        // Validate file
        const validationError = validateImageFile(file);
        if (validationError) {
            setError(validationError);
            return;
        }

        setIsUploading(true);
        try {
            const imageUrl = await uploadToCloudinary(file);
            onChange(imageUrl);
        } catch (err) {
            setError('Failed to upload image. Please try again.');
            console.error('Upload error:', err);
        } finally {
            setIsUploading(false);
        }
    };

    const handleFile = (file: File) => {
        const validationError = validateImageFile(file);
        if (validationError) {
            setError(validationError);
            return;
        }
        setError(null);
        setPendingCropFile(file);
    };

    const handleClick = () => {
        if (disabled || isUploading) return;

        // Check if device supports camera
        const isMobile = /Mobi|Android/i.test(navigator.userAgent);
        if (isMobile) {
            setShowOptions(true);
        } else {
            // On desktop, directly open file picker
            fileInputRef.current?.click();
        }
    };

    const handleCameraClick = () => {
        if (disabled || isUploading) return;
        cameraInputRef.current?.click();
        setShowOptions(false);
    };

    const handleGalleryClick = () => {
        if (disabled || isUploading) return;
        fileInputRef.current?.click();
        setShowOptions(false);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            handleFile(file);
        }
    };

    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (disabled || isUploading) return;

        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        if (disabled || isUploading) return;

        const file = e.dataTransfer.files?.[0];
        if (file) {
            handleFile(file);
        }
    };

    const handleRemove = (e: React.SyntheticEvent) => {
        e.stopPropagation();
        if (onRemove) {
            onRemove();
        } else {
            onChange('');
        }
        setError(null);
    };

    return (
        <div className={cn("space-y-2", className)}>
            {label && (
                <label className="block text-sm font-medium mb-1">
                    {label}
                    {required && (
                        <span className="ml-1 text-destructive" aria-hidden="true">*</span>
                    )}
                </label>
            )}

            <div
                data-slot="image-preview-frame"
                className={cn(
                    "image-preview-frame relative border-2 border-dashed transition-colors",
                    variant === 'rounded'
                        ? "rounded-full w-32 h-32 mx-auto"
                        : "rounded-lg",
                    "hover:border-orange-400 focus-within:border-orange-500",
                    dragActive && "border-orange-500 bg-orange-50",
                    disabled && "cursor-not-allowed opacity-50",
                    error && "border-red-300",
                    value && !error && "border-green-300"
                )}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
            >
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    disabled={disabled || isUploading}
                    className="hidden"
                    aria-label={`Upload ${accessibleLabel.toLowerCase()}`}
                    title={`Upload ${accessibleLabel.toLowerCase()}`}
                />

                <input
                    ref={cameraInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleFileChange}
                    disabled={disabled || isUploading}
                    className="hidden"
                    aria-label={`Camera capture ${accessibleLabel.toLowerCase()}`}
                    title={`Camera capture ${accessibleLabel.toLowerCase()}`}
                />

                {isUploading ? (
                    <div className={cn(
                        "flex flex-col items-center justify-center",
                        variant === 'rounded' ? "p-6 h-full" : "p-8 space-y-4"
                    )}>
                        <LoadingButterfly size="sm" />
                        {variant !== 'rounded' && (
                            <p className="text-sm text-gray-600 mt-4">Uploading image...</p>
                        )}
                    </div>
                ) : previewValue ? (
                    <div className={cn("p-3", variant === 'rounded' && "p-0")}>
                        <div className="relative">
                            <img
                                src={previewValue}
                                alt={isRounded ? `${accessibleLabel} preview` : value ? `${accessibleLabel} custom preview` : `${accessibleLabel} default preview`}
                                className={cn(
                                    "w-full object-cover",
                                    variant === 'rounded'
                                        ? "h-32 w-32 rounded-full mx-auto"
                                        : "aspect-video rounded-md"
                                )}
                            />
                            {!isRounded && (
                                <span className="absolute left-3 top-3 rounded-full border border-border bg-background/95 px-2.5 py-1 text-xs font-medium text-foreground shadow-sm">
                                    {value ? "Custom image" : fallbackLabel}
                                </span>
                            )}
                        </div>
                    </div>
                ) : (
                    <button
                        type="button"
                        onClick={handleClick}
                        disabled={disabled || isUploading}
                        aria-label={`Upload ${accessibleLabel.toLowerCase()}`}
                        className={cn(
                            "flex w-full flex-col items-center justify-center",
                            variant === 'rounded' ? "p-6 h-full" : "p-8 space-y-4"
                        )}
                    >
                        <div className={cn(
                            "rounded-full flex items-center justify-center",
                            "bg-gray-100 text-gray-400",
                            dragActive && "bg-orange-100 text-orange-500",
                            variant === 'rounded' ? "w-10 h-10" : "w-12 h-12"
                        )}>
                            {dragActive ? (
                                <Upload className={variant === 'rounded' ? "w-5 h-5" : "w-6 h-6"} />
                            ) : (
                                <ImageIcon className={variant === 'rounded' ? "w-5 h-5" : "w-6 h-6"} />
                            )}
                        </div>
                        {variant !== 'rounded' && (
                            <div className="text-center mt-4">
                                <p className="text-sm font-medium text-gray-900">
                                    {placeholder}
                                </p>
                                <p className="text-xs text-gray-500 mt-1">
                                    PNG, JPG, GIF, WebP up to 10MB
                                </p>
                            </div>
                        )}
                    </button>
                )}
            </div>

            {previewValue && !isUploading && (
                <div
                    data-slot="image-upload-actions"
                    className="image-upload-actions mx-auto grid w-full max-w-sm grid-cols-[repeat(auto-fit,minmax(8rem,1fr))] gap-2"
                >
                    <button
                        type="button"
                        onClick={handleClick}
                        className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md border border-border bg-background px-3 text-sm font-medium text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        disabled={disabled || isUploading}
                        aria-label={value ? "Replace image" : "Upload custom image"}
                    >
                        <Upload className="h-4 w-4" />
                        {value ? "Replace image" : "Upload custom image"}
                    </button>
                    {value && (
                        <button
                            type="button"
                            onClick={handleRemove}
                            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md px-3 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive focus-visible:ring-offset-2"
                            disabled={disabled || isUploading}
                            aria-label="Remove image"
                            title="Remove image"
                        >
                            <X className="h-4 w-4" />
                            Remove image
                        </button>
                    )}
                </div>
            )}

            {/* Mobile options modal */}
            {showOptions && (
                <Modal isOpen={showOptions} onClose={() => setShowOptions(false)} title="Select Image Source">
                    <div className="space-y-4">

                        <button type="button"
                            onClick={handleCameraClick}
                            className="w-full flex items-center justify-center space-x-3 p-4 bg-orange-50 border border-orange-200 rounded-lg hover:bg-orange-100 transition-colors"
                            disabled={disabled || isUploading}
                        >
                            <Camera className="w-5 h-5 text-orange-600" />
                            <span className="font-medium text-orange-700">Take Photo</span>
                        </button>

                        <button type="button"
                            onClick={handleGalleryClick}
                            className="w-full flex items-center justify-center space-x-3 p-4 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
                            disabled={disabled || isUploading}
                        >
                            <FolderOpen className="w-5 h-5 text-blue-600" />
                            <span className="font-medium text-blue-700">Choose from Gallery</span>
                        </button>

                        <button type="button"
                            onClick={() => setShowOptions(false)}
                            className="w-full p-4 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                        >
                            <span className="font-medium text-gray-700">Cancel</span>
                        </button>
                    </div>
                </Modal>
            )}

            <ImageCropDialog
                file={pendingCropFile}
                onClose={() => setPendingCropFile(null)}
                onConfirm={(croppedFile) => {
                    setPendingCropFile(null);
                    void uploadFile(croppedFile);
                }}
            />

            <div aria-live="polite">
                {error && (
                    <p className="text-sm text-destructive">
                        {error}
                    </p>
                )}

                {!isRounded && value && !error && (
                    <p className="text-sm text-emerald-700">
                        Custom image ready
                    </p>
                )}
            </div>
        </div>
    );
};

export default ImageUpload;
