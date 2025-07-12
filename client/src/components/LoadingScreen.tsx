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
        ? "min-h-screen w-full bg-background overflow-hidden relative flex items-center justify-center"
        : `flex items-center justify-center ${className}`;

    return (
        <div className={containerClasses}>
            {fullScreen && <DoodleBackground numElements={10} />}
            <div className="relative z-10">
                <LoadingButterfly message={message} size={size} />
            </div>
        </div>
    );
};

export default LoadingScreen;
