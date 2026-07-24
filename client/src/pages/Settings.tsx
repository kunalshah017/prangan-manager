import { useState } from "react";
import { Database, Info } from "lucide-react";

import { AppVersion } from "@/components/AppVersion";
import { CacheManagementModal } from "@/components/CacheManagementModal";
import DoodleBackground from "@/components/DoodleBackground";

export default function Settings() {
    const [isCacheModalOpen, setIsCacheModalOpen] = useState(false);

    return (
        <div className="relative w-full">
            <DoodleBackground animated={false} numElements={5} />
            <div className="relative z-10 mx-auto w-full max-w-4xl space-y-7 pb-8">
                <header className="border-b border-border pb-6">
                    <h1 className="text-3xl font-semibold text-foreground">Settings</h1>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                        Manage local app data and view the installed application version.
                    </p>
                </header>

                <section aria-labelledby="app-data-title" className="border-b border-border pb-7">
                    <div className="flex items-start gap-3">
                        <Database className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
                        <div className="min-w-0 flex-1">
                            <h2 id="app-data-title" className="text-xl font-semibold text-foreground">App data</h2>
                            <p className="mt-2 text-sm leading-6 text-muted-foreground">
                                Clear cached data or check for updates when content appears out of date.
                            </p>
                            <button
                                type="button"
                                onClick={() => setIsCacheModalOpen(true)}
                                className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-md border border-border bg-background px-4 text-sm font-semibold text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:w-auto"
                            >
                                Manage app data
                            </button>
                        </div>
                    </div>
                </section>

                <section aria-labelledby="version-title">
                    <div className="flex items-start gap-3">
                        <Info className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
                        <div>
                            <h2 id="version-title" className="text-xl font-semibold text-foreground">Version details</h2>
                            <div className="mt-3"><AppVersion /></div>
                        </div>
                    </div>
                </section>
            </div>

            <CacheManagementModal isOpen={isCacheModalOpen} onClose={() => setIsCacheModalOpen(false)} />
        </div>
    );
}