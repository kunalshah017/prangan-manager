import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type ReactNode, type Ref } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion, type PanInfo } from "framer-motion";
import { ChevronLeft, ChevronRight, Expand, Pause, Play, X } from "lucide-react";

import { displayImageUrl, fallBackToOriginal, refuseDisplayCopies } from "@/lib/cloudinary";
import type { Student } from "@/types/api";

interface FutureProfessionCarouselProps {
    students: Student[];
    autoPlayInterval?: number;
}

type ShowcaseStudent = Student & { profileImageUrl: string; futureProfessionImageUrl: string };

const SWIPE_DISTANCE = 60;
// A slow photo never holds the carousel up for longer than this.
const LOAD_WAIT_MS = 5000;

const loadImage = (src: string) =>
    new Promise<boolean>((resolve) => {
        const image = new Image();
        image.onload = () => resolve(true);
        image.onerror = () => resolve(false);
        image.src = src;
    });

// Each photo is downloaded once, before its slide shows, so slides never
// appear half-drawn. A refused smaller copy falls back to the original.
const loading = new Map<string, Promise<void>>();
const preload = (original: string) => {
    let pending = loading.get(original);
    if (!pending) {
        pending = loadImage(displayImageUrl(original)).then(async (loaded) => {
            if (loaded) return;
            refuseDisplayCopies();
            await loadImage(original);
        });
        loading.set(original, pending);
    }
    return pending;
};

const photosOf = (student: ShowcaseStudent) => [student.futureProfessionImageUrl, student.profileImageUrl];
const whenReady = (student: ShowcaseStudent) =>
    Promise.race([
        Promise.all(photosOf(student).map(preload)),
        new Promise((resolve) => setTimeout(resolve, LOAD_WAIT_MS)),
    ]);

function Photo({ src, alt, className }: { src: string; alt: string; className?: string }) {
    return (
        <img
            src={displayImageUrl(src)}
            alt={alt}
            className={className}
            draggable={false}
            decoding="async"
            onError={(event) => fallBackToOriginal(event.currentTarget, src)}
        />
    );
}

function IconButton({
    label,
    onClick,
    children,
    tone = "card",
    ref,
}: {
    label: string;
    onClick: () => void;
    children: ReactNode;
    tone?: "card" | "dark";
    ref?: Ref<HTMLButtonElement>;
}) {
    return (
        <button
            ref={ref}
            type="button"
            onClick={onClick}
            aria-label={label}
            className={
                tone === "dark"
                    ? "flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                    : "flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            }
        >
            {children}
        </button>
    );
}

// Students today and as their future selves. The future portrait leads; today's
// photo sits on it like a snapshot.
const FutureProfessionCarousel = ({ students, autoPlayInterval = 6000 }: FutureProfessionCarouselProps) => {
    const showcase = useMemo(
        () => students.filter((student): student is ShowcaseStudent => Boolean(student.profileImageUrl && student.futureProfessionImageUrl)),
        [students],
    );
    const reduceMotion = useReducedMotion();
    const [position, setPosition] = useState(0);
    // Moving pictures stop for people who asked for less motion; they can still play them.
    const [playing, setPlaying] = useState(!reduceMotion);
    const [held, setHeld] = useState(false);
    const [enlarged, setEnlarged] = useState(false);
    const enlargeButton = useRef<HTMLButtonElement>(null);
    const count = showcase.length;
    const index = count ? position % count : 0;
    const current = showcase[index];

    // Moves once the next student's photos are in, so nothing pops in late.
    const latest = useRef(0);
    const goTo = useCallback(
        (target: number) => {
            if (count === 0) return;
            const next = (target + count) % count;
            const request = ++latest.current;
            void whenReady(showcase[next]).then(() => {
                if (request === latest.current) setPosition(next);
            });
        },
        [count, showcase],
    );

    // The students either side load in the background.
    useEffect(() => {
        if (count < 2) return;
        for (const offset of [1, -1]) photosOf(showcase[(index + offset + count) % count]).forEach(preload);
    }, [count, index, showcase]);

    useEffect(() => {
        if (!playing || held || enlarged || count < 2) return;
        const timer = setTimeout(() => goTo(index + 1), autoPlayInterval);
        return () => clearTimeout(timer);
    }, [autoPlayInterval, count, enlarged, goTo, held, index, playing]);

    const swipe = (_event: unknown, info: PanInfo) => {
        if (info.offset.x <= -SWIPE_DISTANCE) goTo(index + 1);
        else if (info.offset.x >= SWIPE_DISTANCE) goTo(index - 1);
    };

    if (!current) return null;
    const profession = current.futureProfession?.trim();

    return (
        <section
            aria-roledescription="carousel"
            aria-label="Future professions"
            className="overflow-hidden rounded-xl border border-border bg-card"
            onMouseEnter={() => setHeld(true)}
            onMouseLeave={() => setHeld(false)}
            onFocus={() => setHeld(true)}
            onBlur={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget)) setHeld(false);
            }}
        >
            <div className="relative aspect-[4/5] overflow-hidden bg-muted" aria-live={playing && !held ? "off" : "polite"}>
                <AnimatePresence initial={false}>
                    <motion.figure
                        key={current.id}
                        aria-roledescription="slide"
                        aria-label={`${index + 1} of ${count}`}
                        className="absolute inset-0 m-0 cursor-zoom-in touch-pan-y"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: reduceMotion ? 0 : 0.5, ease: "easeOut" }}
                        drag={count > 1 ? "x" : false}
                        dragConstraints={{ left: 0, right: 0 }}
                        dragElastic={0.2}
                        onDragEnd={swipe}
                        onTap={() => setEnlarged(true)}
                    >
                        <Photo
                            src={current.futureProfessionImageUrl}
                            alt={profession ? `${current.name} as a future ${profession}` : `${current.name} in the future`}
                            className="h-full w-full object-cover"
                        />
                        <figcaption className="absolute inset-x-0 bottom-0 flex items-end gap-3 bg-gradient-to-t from-black/85 via-black/50 to-transparent px-4 pb-4 pt-24">
                            <Photo
                                src={current.profileImageUrl}
                                alt={`${current.name} today`}
                                className="h-[5.5rem] w-[4.5rem] shrink-0 -rotate-3 rounded-md border-[3px] border-white object-cover shadow-xl"
                            />
                            <div className="min-w-0 pb-1">
                                <p className="truncate text-lg font-semibold leading-snug text-white">{current.name}</p>
                                {profession && <p className="truncate text-base font-semibold text-primary">Future {profession}</p>}
                            </div>
                        </figcaption>
                    </motion.figure>
                </AnimatePresence>
            </div>

            <div className="flex items-center gap-1 px-2 py-1.5">
                {count > 1 && (
                    <>
                        <IconButton label="Previous student" onClick={() => goTo(index - 1)}>
                            <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                        </IconButton>
                        <IconButton label="Next student" onClick={() => goTo(index + 1)}>
                            <ChevronRight className="h-5 w-5" aria-hidden="true" />
                        </IconButton>
                    </>
                )}
                <p className="min-w-0 flex-1 px-1 text-sm tabular-nums text-muted-foreground">
                    {count > 1 && `${index + 1} of ${count}`}
                </p>
                {count > 1 && (
                    <IconButton label={playing ? "Pause slideshow" : "Play slideshow"} onClick={() => setPlaying((value) => !value)}>
                        {playing ? <Pause className="h-5 w-5" aria-hidden="true" /> : <Play className="h-5 w-5" aria-hidden="true" />}
                    </IconButton>
                )}
                <IconButton ref={enlargeButton} label="View larger" onClick={() => setEnlarged(true)}>
                    <Expand className="h-5 w-5" aria-hidden="true" />
                </IconButton>
            </div>

            {enlarged && (
                <EnlargedView
                    student={current}
                    position={`${index + 1} of ${count}`}
                    onPrevious={count > 1 ? () => goTo(index - 1) : undefined}
                    onNext={count > 1 ? () => goTo(index + 1) : undefined}
                    onClose={() => {
                        setEnlarged(false);
                        // Back to where the large view was opened from (a tap on the photo too).
                        enlargeButton.current?.focus();
                    }}
                    reduceMotion={Boolean(reduceMotion)}
                />
            )}
        </section>
    );
};

// Both photos as large as the screen allows: today above the future on phones,
// side by side on wider screens.
function EnlargedView({
    student,
    position,
    onPrevious,
    onNext,
    onClose,
    reduceMotion,
}: {
    student: ShowcaseStudent;
    position: string;
    onPrevious?: () => void;
    onNext?: () => void;
    onClose: () => void;
    reduceMotion: boolean;
}) {
    const dialogRef = useRef<HTMLDivElement>(null);
    const profession = student.futureProfession?.trim();
    const future = profession ? `Future ${profession}` : "In the future";

    // Focus moves in and the page behind stops scrolling.
    useEffect(() => {
        dialogRef.current?.querySelector<HTMLElement>("button")?.focus();
        const overflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => {
            document.body.style.overflow = overflow;
        };
    }, []);

    const onKeyDown = (event: ReactKeyboardEvent) => {
        if (event.key === "Escape") onClose();
        else if (event.key === "ArrowRight") onNext?.();
        else if (event.key === "ArrowLeft") onPrevious?.();
        else if (event.key === "Tab") {
            // Keep focus inside the dialog.
            const buttons = [...(dialogRef.current?.querySelectorAll<HTMLElement>("button") ?? [])];
            const first = buttons[0];
            const last = buttons.at(-1);
            if (event.shiftKey && document.activeElement === first) {
                event.preventDefault();
                last?.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first?.focus();
            }
        }
    };

    return createPortal(
        <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="future-profession-name"
            onKeyDown={onKeyDown}
            className="fixed inset-0 z-[100] flex flex-col bg-black text-white"
        >
            <header className="flex items-start gap-3 px-4 pb-3 pt-[max(1rem,env(safe-area-inset-top))] sm:px-8">
                <div className="min-w-0 flex-1">
                    <h2 id="future-profession-name" className="truncate text-xl font-semibold sm:text-3xl">
                        {student.name}
                    </h2>
                    <p className="text-base font-semibold text-primary sm:text-lg">{future}</p>
                </div>
                <IconButton label="Close" onClick={onClose} tone="dark">
                    <X className="h-5 w-5" aria-hidden="true" />
                </IconButton>
            </header>

            <motion.div
                key={student.id}
                className="grid min-h-0 flex-1 grid-cols-1 content-center gap-3 px-4 sm:grid-cols-2 sm:gap-8 sm:px-8"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: reduceMotion ? 0 : 0.4 }}
                drag={onNext ? "x" : false}
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.2}
                onDragEnd={(_event, info) => {
                    if (info.offset.x <= -SWIPE_DISTANCE) onNext?.();
                    else if (info.offset.x >= SWIPE_DISTANCE) onPrevious?.();
                }}
            >
                {[
                    { src: student.profileImageUrl, caption: "Today", alt: `${student.name} today` },
                    { src: student.futureProfessionImageUrl, caption: future, alt: `${student.name}, ${future.toLowerCase()}` },
                ].map((photo) => (
                    <figure key={photo.caption} className="m-0 flex min-w-0 flex-col items-center gap-2 justify-self-center">
                        <Photo
                            src={photo.src}
                            alt={photo.alt}
                            className="aspect-[4/5] w-full max-w-[calc((100dvh-15rem)*0.4)] rounded-xl object-cover sm:max-w-[calc(70dvh*0.8)]"
                        />
                        <figcaption className="text-sm text-white/75 sm:text-base">{photo.caption}</figcaption>
                    </figure>
                ))}
            </motion.div>

            <footer className="flex items-center justify-center gap-3 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
                {onPrevious && (
                    <IconButton label="Previous student" onClick={onPrevious} tone="dark">
                        <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                    </IconButton>
                )}
                <p className="min-w-[5rem] text-center text-sm tabular-nums text-white/75" aria-live="polite">
                    {position}
                </p>
                {onNext && (
                    <IconButton label="Next student" onClick={onNext} tone="dark">
                        <ChevronRight className="h-5 w-5" aria-hidden="true" />
                    </IconButton>
                )}
            </footer>
        </div>,
        document.body,
    );
}

export default FutureProfessionCarousel;
