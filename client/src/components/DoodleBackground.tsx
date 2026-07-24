import React from "react";
import { motion } from "framer-motion";
import {
    BookOpen,
    Pencil,
    NotebookPen,
    Calculator,
    GraduationCap,
    Brain,
    School,
    BookMarked,
    PaintBucket,
    Rocket,
    Globe,
    Lightbulb,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

const EDUCATIONAL_ICONS: LucideIcon[] = [
    BookOpen,
    Pencil,
    NotebookPen,
    Calculator,
    GraduationCap,
    Brain,
    School,
    BookMarked,
    PaintBucket,
    Rocket,
    Globe,
    Lightbulb,
];

const COLORS = ["#f97316", "#ea580c", "#f59e0b", "#d97706", "#fb923c"];

interface DoodleProps {
    Icon: LucideIcon;
    color: string;
    size: number;
    initialX: number;
    initialY: number;
    duration: number;
    delay: number;
    animated: boolean;
    staticRotation: number;
}

const Doodle = ({ Icon, color, size, initialX, initialY, duration, delay, animated, staticRotation }: DoodleProps) => {
    if (!animated) {
        return (
            <div
                className="absolute opacity-20"
                style={{ left: `${initialX}%`, top: `${initialY}%`, transform: `rotate(${staticRotation}deg)` }}
            >
                <Icon size={size} color={color} strokeWidth={1} />
            </div>
        );
    }

    return (
        <motion.div
            className="absolute"
            style={{ left: `${initialX}%`, top: `${initialY}%` }}
            initial={{ scale: 0, rotate: -30 }}
            animate={{
                opacity: [0, 0.8, 0.8, 0.8, 0.8, 0],
                scale: [0, 1.5, 1.5, 0.8],
                y: [0, -30, 30, 60],
                x: [0, 15, -15, 0],
                rotate: [-20, 0, 10, 20],
            }}
            transition={{
                duration,
                delay,
                repeat: Infinity,
                repeatDelay: Math.random() * 2,
                ease: "easeInOut",
            }}
        >
            <Icon size={size} color={color} strokeWidth={1} opacity={0.6} />
        </motion.div>
    );
};

interface DoodleBackgroundProps {
    numElements?: number;
    animated?: boolean;
}

const DoodleBackground: React.FC<DoodleBackgroundProps> = ({ numElements = 10, animated = true }) => {
    const doodles = React.useMemo(() => {
        const gridSize = Math.ceil(Math.sqrt(numElements));
        const cellWidth = 100 / gridSize;
        const cellHeight = 100 / gridSize;

        return Array.from({ length: numElements }, (_, index) => {
            const gridX = index % gridSize;
            const gridY = Math.floor(index / gridSize);

            if (!animated) {
                return {
                    Icon: EDUCATIONAL_ICONS[index % EDUCATIONAL_ICONS.length],
                    color: COLORS[index % COLORS.length],
                    size: 18 + (index % 3) * 4,
                    initialX: gridX * cellWidth + cellWidth * (0.28 + (index % 2) * 0.3),
                    initialY: gridY * cellHeight + cellHeight * (0.3 + ((index + 1) % 2) * 0.25),
                    duration: 0,
                    delay: 0,
                    animated,
                    staticRotation: (index % 5) * 8 - 16,
                };
            }

            return {
                Icon: EDUCATIONAL_ICONS[Math.floor(Math.random() * EDUCATIONAL_ICONS.length)],
                color: COLORS[Math.floor(Math.random() * COLORS.length)],
                size: 16 + Math.random() * 16,
                initialX: gridX * cellWidth + cellWidth * (0.2 + Math.random() * 0.6),
                initialY: gridY * cellHeight + cellHeight * (0.2 + Math.random() * 0.6),
                duration: 5 + Math.random() * 7,
                delay: Math.random(),
                animated,
                staticRotation: 0,
            };
        });
    }, [animated, numElements]);

    return (
        <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none" aria-hidden="true">
            <div className="absolute inset-0 bg-gradient-to-br from-orange-50 to-amber-100/30 opacity-40" />
            <div className="doodle-grid absolute inset-0" />
            <div
                className={`doodle-plus-pattern absolute inset-0 ${animated ? "" : "doodle-plus-pattern-static"}`}
                style={{
                    backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23f97316\' fill-opacity=\'0.2\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
                    backgroundSize: "60px 60px",
                }}
            />
            {doodles.map((doodle, index) => (
                <Doodle key={index} {...doodle} />
            ))}
        </div>
    );
};

export default DoodleBackground;
