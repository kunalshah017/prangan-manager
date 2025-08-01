import React, { useState, useRef } from 'react';
import { Upload, X, Image as ImageIcon, Camera, FolderOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import { uploadToCloudinary, validateImageFile } from '@/lib/cloudinary';
import LoadingButterfly from '@/components/LoadingButterfly';

interface ImageUploadProps {
    value?: string;
    onChange: (url: string) => void;
    onRemove?: () => void;
    disabled?: boolean;
    className?: string;
    label?: string;
    placeholder?: string;
    variant?: 'default' | 'rounded';
}

const ImageUpload: React.FC<ImageUploadProps> = ({
    value,
    onChange,
    onRemove,
    disabled = false,
    className,
    label = "Image",
    placeholder = "Click to upload or drag and drop",
    variant = 'default'
}) => {
    const [isUploading, setIsUploading] = useState(false);
    const [dragActive, setDragActive] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showOptions, setShowOptions] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const cameraInputRef = useRef<HTMLInputElement>(null);

    const handleFile = async (file: File) => {
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

    const handleRemove = (e: React.MouseEvent) => {
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
                </label>
            )}

            <div
                className={cn(
                    "relative border-2 border-dashed transition-colors cursor-pointer",
                    variant === 'rounded'
                        ? "rounded-full w-32 h-32 mx-auto"
                        : "rounded-lg",
                    "hover:border-orange-400 focus-within:border-orange-500",
                    dragActive && "border-orange-500 bg-orange-50",
                    disabled && "cursor-not-allowed opacity-50",
                    error && "border-red-300",
                    value && !error && "border-green-300"
                )}
                onClick={handleClick}
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
                    aria-label={`Upload ${label.toLowerCase()}`}
                    title={`Upload ${label.toLowerCase()}`}
                />

                <input
                    ref={cameraInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleFileChange}
                    disabled={disabled || isUploading}
                    className="hidden"
                    aria-label={`Camera capture ${label.toLowerCase()}`}
                    title={`Camera capture ${label.toLowerCase()}`}
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
                ) : value ? (
                    <div className="relative group">
                        <img
                            src={value}
                            alt="Uploaded"
                            className={cn(
                                "w-full object-cover",
                                variant === 'rounded'
                                    ? "h-32 w-32 rounded-full mx-auto"
                                    : "h-48 rounded-lg"
                            )}
                        />
                        <div className={cn(
                            "absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center",
                            variant === 'rounded' ? "rounded-full" : "rounded-lg"
                        )}>
                            <button
                                type="button"
                                onClick={handleRemove}
                                className="p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                                disabled={disabled}
                                aria-label="Remove image"
                                title="Remove image"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className={cn(
                        "flex flex-col items-center justify-center",
                        variant === 'rounded' ? "p-6 h-full" : "p-8 space-y-4"
                    )}>
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
                    </div>
                )}
            </div>

            {/* Mobile options modal */}
            {showOptions && (
                <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-50" onClick={() => setShowOptions(false)}>
                    <div className="bg-white rounded-t-2xl w-full max-w-md p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
                        <div className="text-center">
                            <h3 className="text-lg font-medium text-gray-900 mb-4">Select Image Source</h3>
                        </div>

                        <button
                            onClick={handleCameraClick}
                            className="w-full flex items-center justify-center space-x-3 p-4 bg-orange-50 border border-orange-200 rounded-lg hover:bg-orange-100 transition-colors"
                            disabled={disabled || isUploading}
                        >
                            <Camera className="w-5 h-5 text-orange-600" />
                            <span className="font-medium text-orange-700">Take Photo</span>
                        </button>

                        <button
                            onClick={handleGalleryClick}
                            className="w-full flex items-center justify-center space-x-3 p-4 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
                            disabled={disabled || isUploading}
                        >
                            <FolderOpen className="w-5 h-5 text-blue-600" />
                            <span className="font-medium text-blue-700">Choose from Gallery</span>
                        </button>

                        <button
                            onClick={() => setShowOptions(false)}
                            className="w-full p-4 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                        >
                            <span className="font-medium text-gray-700">Cancel</span>
                        </button>
                    </div>
                </div>
            )}

            {error && (
                <p className="text-sm text-red-600">
                    {error}
                </p>
            )}

            {value && !error && (
                <p className="text-sm text-green-600">
                    Image uploaded successfully
                </p>
            )}
        </div>
    );
};

export default ImageUpload;
