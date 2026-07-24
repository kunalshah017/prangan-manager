import { useEffect, useState } from 'react'
import { ArrowRight, LogIn, UserPlus } from 'lucide-react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { CustomButton } from '@/components/ui/custom-button'

const heroImages = [
    "/images/girl-child-looking-in-camera.jpeg",
    "/images/boy-looking-in-camera-1.jpeg",
    "/images/boy-looking-in-camera-2.jpeg",
    "/images/boy-with-eyes-closed.jpeg",
];

const Home = () => {
    const { isAuthenticated, isLoading } = useAuth();
    const navigate = useNavigate();
    const [activeImage, setActiveImage] = useState(0);
    const prefersReducedMotion = useReducedMotion();

    // Redirect if already authenticated
    useEffect(() => {
        if (isAuthenticated && !isLoading) {
            navigate('/projects', { replace: true });
        }
    }, [isAuthenticated, isLoading, navigate]);

    useEffect(() => {
        if (prefersReducedMotion) return;

        const interval = window.setInterval(() => {
            setActiveImage((current) => (current + 1) % heroImages.length);
        }, 6000);
        return () => window.clearInterval(interval);
    }, [prefersReducedMotion]);

    return (
        <main className="min-h-[100dvh] bg-orange-50 text-gray-950">
            <section className="relative isolate flex min-h-[100dvh] overflow-hidden">
                <AnimatePresence initial={false} mode="sync">
                    <motion.img
                        key={heroImages[activeImage]}
                        src={heroImages[activeImage]}
                        alt="A Prangan learner looking towards the camera"
                        initial={{ opacity: 0, scale: 1.04 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: prefersReducedMotion ? 0 : 1.2, ease: 'easeOut' }}
                        className="absolute inset-0 h-full w-full object-cover"
                    />
                </AnimatePresence>
                <div className="absolute inset-0 bg-gradient-to-b from-orange-950/75 via-orange-900/55 to-orange-950/85" />
                <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/35 to-transparent" />

                <div className="relative z-10 mx-auto flex min-h-[100dvh] w-full max-w-7xl flex-col px-5 py-6 sm:px-8 lg:px-12">
                    <header className="flex items-center justify-between">
                        <img src="/images/logo/prangan-logo-dark-mode.png" alt="Prangan" className="h-12 drop-shadow-sm sm:h-14" />
                        <Link to="/login" className="text-sm font-semibold text-white underline-offset-4 hover:underline">Sign in</Link>
                    </header>

                    <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }} className="mt-auto max-w-2xl pb-8 pt-20 sm:pb-14 lg:pb-20">
                        <h1 className="max-w-2xl text-4xl font-semibold leading-tight text-white sm:text-5xl lg:text-6xl">For the people who make learning happen.</h1>
                        <p className="mt-5 max-w-xl text-base leading-7 text-orange-50 sm:text-lg">Prangan Manager brings projects, centres, educators, and student progress into one working space.</p>
                        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                            <Link to="/register" className="sm:w-auto">
                                <CustomButton className="h-12 w-full bg-white px-5 text-base text-orange-800 hover:bg-orange-50 sm:w-auto">
                                    <UserPlus className="mr-2 h-5 w-5" /> Register <ArrowRight className="ml-2 h-4 w-4" />
                                </CustomButton>
                            </Link>
                            <Link to="/login" className="sm:w-auto">
                                <CustomButton variant="outline" className="h-12 w-full border-white/60 bg-black/10 px-5 text-base text-white hover:bg-white/15 hover:text-white sm:w-auto">
                                    <LogIn className="mr-2 h-5 w-5" /> Sign in
                                </CustomButton>
                            </Link>
                        </div>
                    </motion.div>
                </div>
            </section>
        </main>
    );
};

export default Home; 