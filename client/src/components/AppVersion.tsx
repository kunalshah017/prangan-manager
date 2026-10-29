import React from 'react';
import packageJson from '../../package.json';

interface AppVersionProps {
    className?: string;
}

export const AppVersion: React.FC<AppVersionProps> = ({ className = '' }) => {
    const buildTime = import.meta.env.VITE_BUILD_TIME || new Date().toISOString();
    const version = packageJson.version;

    return (
        <div className={`text-sm text-muted-foreground ${className}`}>
            <div>Version {version}</div>
            <div>
                Built{" "}
                {new Date(buildTime).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
            </div>
        </div>
    );
};
