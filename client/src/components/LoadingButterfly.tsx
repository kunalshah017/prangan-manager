import { motion } from 'framer-motion';
import loadingButterflyImage from '@/assets/loading-butterfly.png';

interface LoadingButterflyProps {
    message?: string;
    size?: 'sm' | 'md' | 'lg';
    className?: string;
}

const LoadingButterfly: React.FC<LoadingButterflyProps> = ({
    message = "Loading...",
    size = 'md',
    className = ""
}) => {
    const sizeClasses = {
        sm: {
            container: "h-24 w-24",
            butterfly: "h-12 w-12",
            ripple: "h-24 w-24"
        },
        md: {
            container: "h-32 w-32",
            butterfly: "h-16 w-16",
            ripple: "h-32 w-32"
        },
        lg: {
            container: "h-40 w-40",
            butterfly: "h-20 w-20",
            ripple: "h-40 w-40"
        }
    };

    const currentSize = sizeClasses[size];

    return (
        <div className={`flex flex-col items-center ${className}`}>
            {/* Ripple Animation Container */}
            <div className={`relative ${currentSize.container} mb-4`}>
                {/* Orange Background with Ripple Effect */}
                <div className="absolute inset-0 rounded-full bg-orange-500/20">
                    {/* Multiple ripple layers for enhanced effect */}
                    {[...Array(3)].map((_, i) => (
                        <motion.div
                            key={i}
                            className="absolute inset-0 rounded-full border-2 border-orange-500/30"
                            initial={{ scale: 0, opacity: 1 }}
                            animate={{
                                scale: [0, 1.5, 2.5],
                                opacity: [1, 0.5, 0]
                            }}
                            transition={{
                                duration: 2,
                                repeat: Infinity,
                                delay: i * 0.4,
                                ease: "easeOut"
                            }}
                        />
                    ))}
                </div>

                {/* Butterfly Image with Float Animation */}
                <motion.div
                    className={`absolute inset-0 flex items-center justify-center`}
                    animate={{
                        y: [-8, 8, -8],
                        rotate: [-2, 2, -2]
                    }}
                    transition={{
                        duration: 3,
                        repeat: Infinity,
                        ease: "easeInOut"
                    }}
                >
                    <motion.img
                        src={loadingButterflyImage}
                        alt="Loading"
                        className={`${currentSize.butterfly} object-contain`}
                        animate={{
                            scale: [1, 1.1, 1]
                        }}
                        transition={{
                            duration: 2,
                            repeat: Infinity,
                            ease: "easeInOut"
                        }}
                    />
                </motion.div>
            </div>

            {/* Loading Message */}
            <motion.p
                className="text-orange-700 font-medium text-center"
                animate={{ opacity: [0.7, 1, 0.7] }}
                transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    ease: "easeInOut"
                }}
            >
                {message}
            </motion.p>
        </div>
    );
};

export default LoadingButterfly;
