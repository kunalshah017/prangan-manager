import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { BookOpen, Users, Heart } from 'lucide-react'
import { cn } from '@/lib/utils'
import { AspectRatio } from '@/components/ui/aspect-ratio'
import { buttonVariants } from '@/lib/button-variants'

// Sample images for the carousel - replace with your actual images
const carouselImages = [
  "https://images.unsplash.com/photo-1577896851231-70ef18881754?q=80&w=1470&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?q=80&w=1422&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1611348586804-61bf6c080437?q=80&w=1473&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1588075592446-265fd1e6e76f?q=80&w=1472&auto=format&fit=crop"
]

function App() {
  const [currentImage, setCurrentImage] = useState(0)

  // Auto-advance carousel
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImage((prev) => (prev + 1) % carouselImages.length)
    }, 5000)

    return () => clearInterval(interval)
  }, [])

  return (
    <div className="min-h-screen w-full bg-background">
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col-reverse px-4 py-8 md:flex-row md:items-center md:gap-8 md:py-16 lg:px-8">
        {/* Content */}
        <div className="flex flex-1 flex-col items-start justify-center py-8 md:py-0">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="w-full"
          >
            <div className="mb-2 flex items-center gap-2">
              <Heart className="h-5 w-5 text-primary" />
              <p className="text-sm font-medium text-primary">NGO Educational Initiative</p>
            </div>

            <motion.h1
              className="text-3xl sm:text-4xl md:text-5xl font-bold p-1 md:py-5 bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
            >
              Prangan Manager
            </motion.h1>

            <motion.p
              className="mt-4 text-base sm:text-lg text-muted-foreground max-w-xl"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.6 }}
            >
              An effortless internal management tool for Prangan to coordinate educational efforts.
            </motion.p>

            <motion.div
              className="mt-6 flex flex-wrap gap-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.8 }}
            >
              <div className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-primary" />
                <span className="text-foreground">Educational Programs</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                <span className="text-foreground">Volunteer Coordination</span>
              </div>
            </motion.div>

            <div className="mt-8 flex flex-col gap-4 sm:flex-row">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={cn(
                  buttonVariants({ size: "lg" }),
                  "font-medium"
                )}
              >
                Sign In
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={cn(
                  buttonVariants({ variant: "glass", size: "lg" }),
                  "font-medium"
                )}
              >
                Register
              </motion.button>
            </div>
          </motion.div>
        </div>

        {/* Image Carousel Frame */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="relative flex-1 overflow-hidden rounded-2xl border border-border bg-card shadow-xl"
        >
          <AspectRatio ratio={4 / 3} className="w-full">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentImage}
                initial={{ opacity: 0, filter: "blur(10px)" }}
                animate={{ opacity: 1, filter: "blur(0px)" }}
                exit={{ opacity: 0, filter: "blur(10px)" }}
                transition={{ duration: 0.8 }}
                className="absolute inset-0 w-full h-full"
              >
                <div
                  className="h-full w-full bg-cover bg-center"
                  style={{ backgroundImage: `url(${carouselImages[currentImage]})` }}
                />
                <div className="absolute inset-0 bg-black/30 backdrop-blur-[1px]" />
              </motion.div>
            </AnimatePresence>

            {/* Carousel indicators */}
            <div className="absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 space-x-1.5">
              {carouselImages.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentImage(index)}
                  className={cn(
                    "h-1.5 w-1.5 rounded-full transition-all",
                    index === currentImage
                      ? "w-4 bg-primary"
                      : "bg-white/60"
                  )}
                  aria-label={`Go to slide ${index + 1}`}
                />
              ))}
            </div>
          </AspectRatio>
        </motion.div>
      </div>
    </div>
  )
}

export default App
