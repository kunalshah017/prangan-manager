import React from 'react';
import packageJson from '../../package.json';

interface AppVersionProps {
    className?: string;
}

export const AppVersion: React.FC<AppVersionProps> = ({ className = '' }) => {
    const buildTime = import.meta.env.VITE_BUILD_TIME || new Date().toISOString();
    const version = packageJson.version;

    return (
        <div className={`text-xs text-gray-500 ${className}`}>
            <div>Version: {version}</div>
            <div>Built: {new Date(buildTime).toLocaleString()}</div>
        </div>
    );
};
