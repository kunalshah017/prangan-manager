import React from 'react';
import { motion } from 'framer-motion';
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
    Lightbulb
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

// Educational icons from Lucide
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
    Lightbulb
];

interface DoodleProps {
    Icon: LucideIcon;
    color: string;
    size: number;
    initialX: number;
    initialY: number;
    duration: number;
    delay: number;
}

const Doodle = ({ Icon, color, size, initialX, initialY, duration, delay }: DoodleProps) => {
    return (
        <motion.div
            className="absolute"
            style={{
                left: `${initialX}%`,
                top: `${initialY}%`,
            }}
            initial={{ scale: 0, rotate: -30 }}
            animate={{
                opacity: [0, 0.8, 0.8, 0.8, 0.8, 0],
                scale: [0, 1.5, 1.5, 0.8],
                y: [0, -30, 30, 60],
                x: [0, 15, -15, 0],
                rotate: [-20, 0, 10, 20],
            }}
            transition={{
                duration: duration,
                delay: delay,
                repeat: Infinity,
                repeatDelay: Math.random() * 2,
                ease: "easeInOut"
            }}
        >
            <Icon size={size} color={color} strokeWidth={1} opacity={0.6} />
        </motion.div>
    );
};

interface DoodleBackgroundProps {
    numElements?: number;
}

const DoodleBackground: React.FC<DoodleBackgroundProps> = ({ numElements = 10 }) => {
    // Function to generate random doodle elements with better distribution
    const generateDoodles = () => {
        const doodles = [];
        const colors = [
            '#f97316', // orange-500
            '#ea580c', // orange-600
            '#f59e0b', // amber-500
            '#d97706', // amber-600
            '#fb923c', // orange-400
        ];

        // Create a grid for better distribution
        const gridSize = Math.ceil(Math.sqrt(numElements));
        const cellWidth = 100 / gridSize;
        const cellHeight = 100 / gridSize;

        // Distribute elements in a grid with some randomness
        for (let i = 0; i < numElements; i++) {
            // Calculate grid position
            const gridX = i % gridSize;
            const gridY = Math.floor(i / gridSize);

            // Add randomness within the grid cell (20-80% of cell size)
            const cellOffsetX = cellWidth * (0.2 + Math.random() * 0.6);
            const cellOffsetY = cellHeight * (0.2 + Math.random() * 0.6);

            // Calculate final position with some randomness
            const posX = (gridX * cellWidth) + cellOffsetX;
            const posY = (gridY * cellHeight) + cellOffsetY;

            const Icon = EDUCATIONAL_ICONS[Math.floor(Math.random() * EDUCATIONAL_ICONS.length)];
            const color = colors[Math.floor(Math.random() * colors.length)];
            // Smaller size range: 16px to 32px
            const size = 16 + Math.random() * 16;

            doodles.push({
                Icon,
                color,
                size,
                initialX: posX, // Grid-based X position
                initialY: posY, // Grid-based Y position
                duration: 5 + Math.random() * 7,
                delay: Math.random() * 1,
            });
        }

        return doodles;
    };

    const doodles = React.useMemo(() => generateDoodles(), [numElements]);

    return (
        <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
            {/* Lighter gradient background */}
            <div className="absolute inset-0 bg-gradient-to-br from-orange-50 to-amber-100/30 opacity-40" />

            {/* Animated pattern overlay with reduced opacity */}
            <div
                className="absolute inset-0 opacity-3"
                style={{
                    backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23f97316\' fill-opacity=\'0.2\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
                    backgroundSize: '60px 60px'
                }}
            />

            {/* Doodle elements */}
            {doodles.map((doodle, index) => (
                <Doodle
                    key={index}
                    Icon={doodle.Icon}
                    color={doodle.color}
                    size={doodle.size}
                    initialX={doodle.initialX}
                    initialY={doodle.initialY}
                    duration={doodle.duration}
                    delay={doodle.delay}
                />
            ))}

            {/* Add CSS for background animation */}
            <style dangerouslySetInnerHTML={{
                __html: `
          @keyframes moveBackground {
            0% {
              background-position: 0 0;
            }
            100% {
              background-position: 1000px 1000px;
            }
          }
          .opacity-3 {
            opacity: 0.03;
            animation: moveBackground 120s linear infinite;
          }
        `
            }} />
        </div>
    );
};

export default DoodleBackground; 