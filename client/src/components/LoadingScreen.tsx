import DoodleBackground from '@/components/DoodleBackground';
import LoadingButterfly from '@/components/LoadingButterfly';

interface LoadingScreenProps {
    message?: string;
    size?: 'sm' | 'md' | 'lg';
    fullScreen?: boolean;
    className?: string;
}

const LoadingScreen: React.FC<LoadingScreenProps> = ({
    message = "Loading...",
    size = 'md',
    fullScreen = true,
    className = ""
}) => {
    const containerClasses = fullScreen
        ? "min-h-[100dvh] w-full bg-background overflow-hidden relative flex flex-col items-center justify-center"
        : `flex items-center justify-center ${className}`;

    return (
        <div className={containerClasses}>
            {fullScreen && <DoodleBackground numElements={10} />}
            <div className="relative z-10">
                <LoadingButterfly size={size} />
            </div>
            <div className="mt-4 text-center text-gray-500">{message}</div>
        </div>
    );
};

export default LoadingScreen;
