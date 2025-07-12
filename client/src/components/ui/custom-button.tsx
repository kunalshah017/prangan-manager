import React from 'react';
import { cn } from '@/lib/utils';
import { buttonVariants } from '@/lib/button-variants';
import LoadingButterfly from '@/components/LoadingButterfly';
import type { VariantProps } from 'class-variance-authority';

interface CustomButtonProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
    isLoading?: boolean;
    loadingMessage?: string;
    children: React.ReactNode;
    className?: string;
}

const CustomButton = React.forwardRef<HTMLButtonElement, CustomButtonProps>(
    ({
        className,
        variant = "default",
        size = "default",
        isLoading = false,
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        loadingMessage,
        children,
        disabled,
        ...props
    }, ref) => {
        return (
            <button
                className={cn(
                    buttonVariants({ variant, size }),
                    "relative transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]",
                    isLoading && "cursor-not-allowed hover:scale-100 active:scale-100 disabled:opacity-100 disabled:bg-gray-100",
                    className
                )}
                disabled={disabled || isLoading}
                ref={ref}
                {...props}
            >
                {/* Content container with opacity transition */}
                <span
                    className={cn(
                        "flex items-center justify-center transition-opacity duration-200",
                        isLoading ? "opacity-0" : "opacity-100"
                    )}
                >
                    {children}
                </span>

                {/* Loading overlay */}
                {isLoading && (
                    <div className="absolute opacity-100 top-[70%] left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center">
                        <LoadingButterfly
                            size="xs"
                            className="scale-75"
                        />
                    </div>
                )}

                {/* Shine effect on hover (only when not disabled/loading) */}
                {!disabled && !isLoading && (
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent hover:translate-x-full transition-transform duration-500 ease-out" />
                )}
            </button>
        );
    }
);

CustomButton.displayName = "CustomButton";

export { CustomButton };
