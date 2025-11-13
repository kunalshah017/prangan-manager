import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Maximize2, X, ChevronRight } from 'lucide-react';
import type { Student } from '@/types/api';

interface FutureProfessionCarouselProps {
    students: Student[];
    autoPlayInterval?: number;
}

const FutureProfessionCarousel = ({
    students,
    autoPlayInterval = 5000
}: FutureProfessionCarouselProps) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [isAutoPlaying, setIsAutoPlaying] = useState(true);
    const [showFuture, setShowFuture] = useState(false);
    const [direction, setDirection] = useState(1);

    // Filter students who have both images
    const studentsWithImages = students.filter(
        (student) => student.profileImageUrl && student.futureProfessionImageUrl
    );

    // Auto-play logic for compact mode
    useEffect(() => {
        if (!isFullscreen && isAutoPlaying && studentsWithImages.length > 0) {
            const timer = setInterval(() => {
                // Show future image first
                if (!showFuture) {
                    setShowFuture(true);
                } else {
                    // Then move to next student
                    setShowFuture(false);
                    setDirection(1);
                    setCurrentIndex((prev) => (prev + 1) % studentsWithImages.length);
                }
            }, autoPlayInterval / 2); // Half interval for each image

            return () => clearInterval(timer);
        }
    }, [isFullscreen, isAutoPlaying, showFuture, studentsWithImages.length, autoPlayInterval]);

    const handleNext = useCallback(() => {
        setDirection(1);
        setShowFuture(false);
        setCurrentIndex((prev) => (prev + 1) % studentsWithImages.length);
    }, [studentsWithImages.length]);

    const handlePrevious = useCallback(() => {
        setDirection(-1);
        setShowFuture(false);
        setCurrentIndex((prev) => (prev - 1 + studentsWithImages.length) % studentsWithImages.length);
    }, [studentsWithImages.length]);

    const toggleFullscreen = () => {
        setIsFullscreen(!isFullscreen);
        setShowFuture(false);
        // Resume autoplay when exiting fullscreen
        if (isFullscreen) {
            setIsAutoPlaying(true);
        }
    };

    // Keyboard navigation for fullscreen mode
    useEffect(() => {
        if (!isFullscreen) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'ArrowRight') {
                handleNext();
            } else if (e.key === 'ArrowLeft') {
                handlePrevious();
            } else if (e.key === 'Escape') {
                setIsFullscreen(false);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isFullscreen, handleNext, handlePrevious]);

    if (studentsWithImages.length === 0) {
        return (
            <div className="rounded-xl border border-orange-200 bg-white/50 p-6 text-center backdrop-blur-sm">
                <p className="text-gray-600">No student profession images available yet.</p>
            </div>
        );
    } const currentStudent = studentsWithImages[currentIndex];

    // Slide variants for animations
    const slideVariants = {
        enter: (direction: number) => ({
            x: direction > 0 ? 1000 : -1000,
            opacity: 0,
            scale: 0.8,
        }),
        center: {
            x: 0,
            opacity: 1,
            scale: 1,
        },
        exit: (direction: number) => ({
            x: direction > 0 ? -1000 : 1000,
            opacity: 0,
            scale: 0.8,
        }),
    };

    // Flip animation for showing future image
    const flipVariants = {
        front: { rotateY: 0 },
        back: { rotateY: 180 },
    };

    // Compact Mode
    if (!isFullscreen) {
        return (
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative overflow-hidden rounded-xl border border-orange-200 shadow-lg bg-gradient-to-br from-orange-900 via-amber-800 to-orange-900"
            >
                {/* Fullscreen Button - Top Right */}
                <button
                    onClick={toggleFullscreen}
                    className="absolute top-4 right-4 z-20 rounded-full bg-white/80 hover:bg-white p-2 shadow-md transition-all hover:scale-110 hover:shadow-lg backdrop-blur-sm"
                    aria-label="Enter fullscreen"
                >
                    <Maximize2 className="h-4 w-4 text-orange-600" />
                </button>

                {/* Compact Carousel */}
                <div className="relative h-[380px] sm:h-[950px]">
                    <AnimatePresence initial={false} custom={direction} mode="wait">
                        <motion.div
                            key={currentIndex}
                            custom={direction}
                            variants={slideVariants}
                            initial="enter"
                            animate="center"
                            exit="exit"
                            transition={{
                                x: { type: 'spring', stiffness: 300, damping: 30 },
                                opacity: { duration: 0.2 },
                            }}
                            className="absolute inset-0"
                        >
                            {/* Full-size Image with Flip Animation */}
                            <motion.div
                                className="relative h-full w-full"
                                style={{ perspective: 1000 }}
                                animate={showFuture ? 'back' : 'front'}
                                variants={flipVariants}
                                transition={{ duration: 0.6 }}
                            >
                                <img
                                    src={
                                        showFuture
                                            ? currentStudent.futureProfessionImageUrl!
                                            : currentStudent.profileImageUrl!
                                    }
                                    alt={currentStudent.name}
                                    className="h-full w-full object-cover rounded-xl"
                                />
                            </motion.div>

                            {/* Bottom Overlay with Student Info - Outside flip animation */}
                            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent pt-16 pb-7 px-4 rounded-b-xl z-10">
                                <motion.div
                                    key={`${currentIndex}-${showFuture}`}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.3 }}
                                    className="text-center"
                                >
                                    <h4 className="mb-2 text-lg sm:text-xl font-bold text-white drop-shadow-lg">
                                        {currentStudent.name}
                                    </h4>
                                    <div className="inline-block rounded-full bg-orange-600 px-3 sm:px-4 py-1 sm:py-1.5 text-xs sm:text-sm font-semibold text-white shadow-lg">
                                        {showFuture ? `Future ${currentStudent.futureProfession}` : 'Today'}
                                    </div>
                                </motion.div>
                            </div>
                        </motion.div>
                    </AnimatePresence>
                </div>

                {/* Progress Indicator */}
                <div className="absolute bottom-2 left-0 right-0 flex gap-1 px-4 z-10">
                    {studentsWithImages.map((_, index) => (
                        <motion.div
                            key={index}
                            className={`h-1 flex-1 rounded-full ${index === currentIndex ? 'bg-white' : 'bg-white/30'
                                }`}
                            initial={false}
                            animate={{
                                scale: index === currentIndex ? 1.2 : 1,
                            }}
                            transition={{ duration: 0.2 }}
                        />
                    ))}
                </div>
            </motion.div>
        );
    }

    // Fullscreen Mode - Render using portal to ensure it's above everything
    const nextStudent = studentsWithImages[(currentIndex + 1) % studentsWithImages.length];
    const previousStudent = studentsWithImages[(currentIndex - 1 + studentsWithImages.length) % studentsWithImages.length];

    return createPortal(
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[99999] flex items-center justify-center bg-gradient-to-br from-orange-900 via-amber-800 to-orange-900"
            style={{ zIndex: 99999 }}
        >
            {/* Close Button - Top Right */}
            <button
                onClick={toggleFullscreen}
                className="absolute top-4 right-4 z-50 rounded-full bg-red-500/80 hover:bg-red-600/90 p-2 sm:p-3 backdrop-blur-sm transition-all hover:scale-110"
                aria-label="Exit fullscreen"
            >
                <X className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
            </button>

            {/* Image Counter - Top Left (subtle) */}
            <div className="absolute top-4 left-4 z-50 rounded-full bg-black/30 px-3 py-1 backdrop-blur-sm">
                <span className="text-xs text-white/70">
                    {currentIndex + 1} / {studentsWithImages.length}
                </span>
            </div>

            {/* Previous Button - Left Side */}
            {studentsWithImages.length > 1 && (
                <button
                    onClick={handlePrevious}
                    className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 z-50 group"
                    aria-label="Previous student"
                >
                    <div className="flex flex-col items-center gap-2">
                        <div className="rounded-full bg-black p-2 sm:p-3 backdrop-blur-sm transition-all hover:bg-white/30 hover:scale-110">
                            <ChevronRight className="h-6 w-6 sm:h-8 sm:w-8 rotate-180 text-white" />
                        </div>
                        <div className="hidden sm:block rounded-lg bg-black/60 backdrop-blur-sm px-3 py-1.5 max-w-[120px]">
                            <p className="text-xs text-white/90 text-center truncate">{previousStudent.name}</p>
                        </div>
                    </div>
                </button>
            )}

            {/* Next Button - Right Side */}
            {studentsWithImages.length > 1 && (
                <button
                    onClick={handleNext}
                    className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 z-50 group"
                    aria-label="Next student"
                >
                    <div className="flex flex-col items-center gap-2">
                        <div className="rounded-full bg-black p-2 sm:p-3 backdrop-blur-sm transition-all hover:bg-white/30 hover:scale-110">
                            <ChevronRight className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
                        </div>
                        <div className="hidden sm:block rounded-lg bg-black/60 backdrop-blur-sm px-3 py-1.5 max-w-[120px]">
                            <p className="text-xs text-white/90 text-center truncate">{nextStudent.name}</p>
                        </div>
                    </div>
                </button>
            )}

            <AnimatePresence initial={false} custom={direction} mode="wait">
                <motion.div
                    key={currentIndex}
                    custom={direction}
                    variants={slideVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{
                        x: { type: 'spring', stiffness: 200, damping: 25 },
                        opacity: { duration: 0.3 },
                    }}
                    className="relative h-full w-full flex items-center justify-center"
                >
                    {/* Images Container - Responsive Layout */}
                    <div className="flex flex-col sm:flex-row h-full w-full items-center justify-center">
                        {/* Current Image - Top on mobile, Left on desktop */}
                        <motion.div
                            initial={{ opacity: 0, x: -50 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.2 }}
                            className="relative h-1/2 sm:h-full w-full sm:w-1/2"
                        >
                            <img
                                src={currentStudent.profileImageUrl!}
                                alt={`${currentStudent.name} - Current`}
                                className="h-full w-full object-cover"
                            />
                            {/* Label Overlay - Bottom Center */}
                            <div className="absolute bottom-6 sm:bottom-12 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-sm px-3 sm:px-6 py-1.5 sm:py-3 rounded-full z-10">
                                <p className="text-white text-xs md:text-base lg:text-lg font-semibold">Today</p>
                            </div>
                        </motion.div>

                        {/* Future Image - Bottom on mobile, Right on desktop */}
                        <motion.div
                            initial={{ opacity: 0, x: 50 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.3 }}
                            className="relative h-1/2 sm:h-full w-full sm:w-1/2"
                        >
                            <img
                                src={currentStudent.futureProfessionImageUrl!}
                                alt={`${currentStudent.name} - Future`}
                                className="h-full w-full object-cover"
                            />
                            {/* Label Overlay - Bottom Center (higher on mobile to avoid overlap) */}
                            <div className="absolute bottom-24 sm:bottom-12 left-1/2 -translate-x-1/2 bg-orange-600/90 backdrop-blur-sm px-3 sm:px-6 py-1.5 sm:py-3 rounded-full z-10">
                                <p className="text-white text-xs md:text-base lg:text-lg font-semibold">Future {currentStudent.futureProfession}</p>
                            </div>
                        </motion.div>
                    </div>

                    {/* Bottom Overlay - Student Info */}
                    <motion.div
                        initial={{ opacity: 0, y: 50 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                        className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/70 to-transparent pt-12 md:pt-20 pb-3 md:pb-6 px-4 md:px-6"
                    >
                        {/* Student Name & Profession */}
                        <div className="text-center">
                            <h2 className="text-lg md:text-3xl lg:text-4xl xl:text-5xl font-bold text-white mb-1 md:mb-2 drop-shadow-lg">
                                {currentStudent.name}
                            </h2>
                            <div className="inline-block bg-orange-600 px-2.5 md:px-6 py-0.5 md:py-2 rounded-full shadow-lg">
                                <p className="text-xs md:text-lg lg:text-xl font-semibold text-white">
                                    {currentStudent.futureProfession}
                                </p>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            </AnimatePresence>
        </motion.div>,
        document.body
    );
};

export default FutureProfessionCarousel;
