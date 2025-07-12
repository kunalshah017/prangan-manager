import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { AspectRatio } from '@/components/ui/aspect-ratio'
import { buttonVariants } from '@/lib/button-variants'
import DoodleBackground from '@/components/DoodleBackground'
import LoadingButterfly from '@/components/LoadingButterfly'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'

// Local images from public folder for the carousel
const carouselImages = [
    "/images/boy-looking-in-camera-1.jpeg",
    "/images/boy-looking-in-camera-2.jpeg",
    "/images/boy-with-eyes-closed.jpeg",
    "/images/girl-child-looking-in-camera.jpeg"
]

const Home = () => {
    const [currentImage, setCurrentImage] = useState(0)
    const [imagesLoaded, setImagesLoaded] = useState(false)
    const [isTransitioning, setIsTransitioning] = useState(false)
    const [prevImage, setPrevImage] = useState(0)
    const { isAuthenticated, isLoading } = useAuth();
    const navigate = useNavigate();

    // Redirect if already authenticated
    useEffect(() => {
        if (isAuthenticated && !isLoading) {
            navigate('/projects', { replace: true });
        }
    }, [isAuthenticated, isLoading, navigate]);

    // Preload all images
    useEffect(() => {
        const imageObjects = carouselImages.map(src => {
            const img = new Image()
            img.src = src
            return img
        })

        Promise.all(imageObjects.map(img => {
            return new Promise((resolve) => {
                img.onload = () => resolve(true)
                img.onerror = () => resolve(false)
            })
        })).then(() => {
            setImagesLoaded(true)
        })
    }, [])

    // Auto-advance carousel
    useEffect(() => {
        if (!imagesLoaded) return

        const interval = setInterval(() => {
            setPrevImage(currentImage)
            setIsTransitioning(true)
            setCurrentImage((prev) => (prev + 1) % carouselImages.length)

            // Reset transitioning state after animation completes
            setTimeout(() => {
                setIsTransitioning(false)
            }, 800)
        }, 3000)

        return () => clearInterval(interval)
    }, [imagesLoaded, currentImage])

    // Handle manual image change
    const changeImage = (index: number) => {
        if (index === currentImage) return
        setPrevImage(currentImage)
        setIsTransitioning(true)
        setCurrentImage(index)

        // Reset transitioning state after animation completes
        setTimeout(() => {
            setIsTransitioning(false)
        }, 800)
    }

    return (
        <div className="min-h-screen w-full bg-background overflow-hidden relative">
            {/* Educational doodle background */}
            <DoodleBackground numElements={10} />

            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 1 }}
                className="mx-auto flex min-h-screen max-w-7xl flex-col px-4 py-8 md:flex-row md:items-center md:gap-8 md:py-16 lg:px-8 relative z-10"
            >
                {/* Content */}
                <div className="flex flex-1 flex-col items-start justify-center py-8 md:py-0">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                        className="w-full"
                    >
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6 }}
                            className="flex justify-center md:justify-start mb-6"
                        >
                            <img
                                src="/images/logo/prangan-logo-light-mode.png"
                                alt="Prangan Logo"
                                className="h-16 md:h-20"
                            />
                        </motion.div>

                        <motion.h1
                            className="text-3xl sm:text-4xl md:text-5xl font-bold p-1 md:py-5 bg-gradient-to-r from-orange-500 via-amber-500 to-orange-300 bg-clip-text text-transparent drop-shadow-sm text-center md:text-left"
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.8, delay: 0.4 }}
                        >
                            Prangan Manager
                        </motion.h1>

                        <motion.p
                            className="mt-4 text-base sm:text-lg text-foreground max-w-xl font-medium tracking-wide text-center md:text-left"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.8, delay: 0.6 }}
                        >
                            An effortless internal management tool for Prangan to coordinate educational efforts.
                        </motion.p>

                        <div className="mt-8 flex w-full justify-center md:justify-start gap-4">
                            <Link to="/login">
                                <motion.button
                                    whileHover={{ scale: 1.05, boxShadow: "0 10px 25px -5px rgba(236, 116, 12, 0.4)" }}
                                    whileTap={{ scale: 0.95 }}
                                    className={cn(
                                        buttonVariants({ size: "lg" }),
                                        "font-medium bg-orange-600 hover:bg-orange-700 text-white shadow-md relative overflow-hidden group"
                                    )}
                                >
                                    <span className="relative z-10">Sign In</span>
                                    <span className="absolute inset-0 bg-gradient-to-r from-orange-600 to-amber-500 group-hover:opacity-100 opacity-0 transition-opacity duration-300" />
                                </motion.button>
                            </Link>
                            <Link to="/register">
                                <motion.button
                                    whileHover={{ scale: 1.05, backgroundColor: "rgba(255, 237, 213, 0.2)" }}
                                    whileTap={{ scale: 0.95 }}
                                    className={cn(
                                        buttonVariants({ variant: "outline", size: "lg" }),
                                        "font-medium border-orange-400 text-orange-700 hover:bg-orange-50 backdrop-blur-sm"
                                    )}
                                >
                                    Register
                                </motion.button>
                            </Link>
                        </div>
                    </motion.div>
                </div>

                {/* Image Carousel Frame */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.6, delay: 0.2 }}
                    className="relative overflow-hidden rounded-2xl border border-border bg-card shadow-xl flex flex-col justify-center items-center md:w-1/2 my-8 md:my-0 backdrop-blur-md"
                >
                    <AspectRatio ratio={4 / 3} className="flex-1 w-full">
                        {/* Background placeholder/previous image that stays visible during transitions */}
                        {imagesLoaded && (
                            <div
                                className="absolute inset-0 w-full h-full"
                                style={{
                                    backgroundImage: `url(${carouselImages[isTransitioning ? prevImage : currentImage]})`,
                                    backgroundSize: 'cover',
                                    backgroundPosition: 'center',
                                    filter: 'blur(10px)',
                                    transform: 'scale(1.1)',
                                    opacity: isTransitioning ? 1 : 0,
                                    transition: 'opacity 0.8s ease'
                                }}
                            >
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-black/20 backdrop-blur-[1px]" />
                            </div>
                        )}

                        <AnimatePresence mode="wait">
                            {imagesLoaded && (
                                <motion.div
                                    key={currentImage}
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ duration: 0.8 }}
                                    className="absolute inset-0 w-full h-full"
                                >
                                    <div
                                        className="h-full w-full bg-cover bg-center"
                                        style={{ backgroundImage: `url(${carouselImages[currentImage]})` }}
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-black/20 backdrop-blur-[1px]" />
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Preloaded images (hidden but available for quick display) */}
                        <div className="hidden">
                            {carouselImages.map((src, index) => (
                                <img key={index} src={src} alt={`Preloaded image ${index + 1}`} />
                            ))}
                        </div>

                        {/* Carousel indicators */}
                        <div className="absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 space-x-2">
                            {carouselImages.map((_, index) => (
                                <button
                                    key={index}
                                    onClick={() => changeImage(index)}
                                    className={cn(
                                        "h-2 rounded-full transition-all shadow-sm",
                                        index === currentImage
                                            ? "w-6 bg-orange-500"
                                            : "w-2 bg-white/70 hover:bg-white"
                                    )}
                                    aria-label={`Go to slide ${index + 1}`}
                                />
                            ))}
                        </div>
                    </AspectRatio>
                </motion.div>
            </motion.div>

            {/* Initial loading placeholder with gradient background */}
            {!imagesLoaded && (
                <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-br from-orange-100 to-amber-200 z-50">
                    <LoadingButterfly size="md" />
                </div>
            )}
        </div>
    );
};

export default Home; 