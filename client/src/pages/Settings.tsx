import { useState, type ReactNode } from "react";
import { LifeBuoy, Monitor, Moon, Palette, RefreshCw, Sun } from "lucide-react";

import { AppVersion } from "@/components/AppVersion";
import DoodleBackground from "@/components/DoodleBackground";
import { PageTitle } from "@/components/navigation/PageTitle";
import { ConfirmationModal } from "@/components/ui/confirmation-modal";
import { CustomButton } from "@/components/ui/custom-button";
import { useAppMaintenance } from "@/hooks/useAppMaintenance";
import { useTheme } from "@/hooks/useTheme";
import type { ThemePreference } from "@/lib/theme";
import { cn } from "@/lib/utils";

const THEME_OPTIONS: Array<{ value: ThemePreference; label: string; icon: typeof Sun }> = [
    { value: "system", label: "System", icon: Monitor },
    { value: "light", label: "Light", icon: Sun },
    { value: "dark", label: "Dark", icon: Moon },
];

function SettingsSection({ id, icon: Icon, title, children }: { id: string; icon: typeof Sun; title: string; children: ReactNode }) {
    return (
        <section aria-labelledby={id} className="space-y-3">
            <h2 id={id} className="flex items-center gap-2 text-lg font-semibold text-foreground">
                <Icon className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
                {title}
            </h2>
            {children}
        </section>
    );
}

// A setting: what it does on the left, its action on the right (stacked on phones).
function SettingsRow({ title, description, action, tone = "default" }: { title: string; description: ReactNode; action: ReactNode; tone?: "default" | "danger" }) {
    return (
        <div className={cn("flex flex-col gap-3 p-4 sm:flex-row sm:items-center", tone === "danger" && "bg-destructive/5")}>
            <div className="min-w-0 flex-1">
                <h3 className={cn("text-base font-semibold", tone === "danger" ? "text-destructive" : "text-foreground")}>{title}</h3>
                <div className="mt-0.5 text-sm leading-5 text-muted-foreground">{description}</div>
            </div>
            <div className="shrink-0">{action}</div>
        </div>
    );
}

export default function Settings() {
    const { preference, setPreference } = useTheme();
    const maintenance = useAppMaintenance();
    const [confirmClear, setConfirmClear] = useState(false);

    return (
        <div className="relative w-full">
            <DoodleBackground animated={false} numElements={5} />
            <div className="relative z-10 mx-auto w-full max-w-2xl space-y-8 pb-8">
                <PageTitle title="Settings" />

                <SettingsSection id="appearance-title" icon={Palette} title="Appearance">
                    <fieldset>
                        <legend className="sr-only">Theme</legend>
                        <div className="grid grid-cols-3 gap-2">
                            {THEME_OPTIONS.map(({ value, label, icon: Icon }) => (
                                <label
                                    key={value}
                                    className={cn(
                                        "flex min-h-16 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border text-sm font-semibold transition-colors focus-within:ring-2 focus-within:ring-ring motion-reduce:transition-none",
                                        preference === value
                                            ? "border-primary bg-primary/5 text-foreground ring-1 ring-primary"
                                            : "border-border text-muted-foreground hover:bg-accent/50",
                                    )}
                                >
                                    <input
                                        type="radio"
                                        name="theme"
                                        value={value}
                                        checked={preference === value}
                                        onChange={() => setPreference(value)}
                                        className="sr-only"
                                    />
                                    <Icon className="h-5 w-5" aria-hidden="true" />
                                    {label}
                                </label>
                            ))}
                        </div>
                    </fieldset>
                    <p className="text-sm text-muted-foreground">System follows your phone or computer, switching with it.</p>
                </SettingsSection>

                <SettingsSection id="version-title" icon={RefreshCw} title="App version">
                    <div className="overflow-hidden rounded-xl border border-border bg-card">
                        <SettingsRow
                            title="Updates"
                            description={<AppVersion />}
                            action={
                                <CustomButton
                                    type="button"
                                    variant="outline"
                                    onClick={() => void maintenance.checkForUpdates()}
                                    isLoading={maintenance.isChecking}
                                    loadingMessage="Checking..."
                                    className="min-h-11 w-full sm:w-auto"
                                >
                                    Check for updates
                                </CustomButton>
                            }
                        />
                    </div>
                </SettingsSection>

                <SettingsSection id="troubleshooting-title" icon={LifeBuoy} title="Troubleshooting">
                    <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
                        <SettingsRow
                            title="Reload the app"
                            description="Try this first if a page looks out of date or won't load."
                            action={
                                <CustomButton type="button" variant="outline" onClick={maintenance.reload} className="min-h-11 w-full sm:w-auto">
                                    Reload
                                </CustomButton>
                            }
                        />
                        <SettingsRow
                            tone="danger"
                            title="Clear app data"
                            description="Only if reloading doesn't help. Signs you out, removes offline data and resets settings, including the theme."
                            action={
                                <CustomButton
                                    type="button"
                                    variant="destructive"
                                    onClick={() => setConfirmClear(true)}
                                    className="min-h-11 w-full sm:w-auto"
                                >
                                    Clear data
                                </CustomButton>
                            }
                        />
                    </div>
                </SettingsSection>
            </div>

            <ConfirmationModal
                isOpen={confirmClear}
                onClose={() => setConfirmClear(false)}
                onConfirm={() => void maintenance.clearAppData()}
                title="Clear app data?"
                message="You'll be signed out, offline data will be removed and your settings reset. You'll need to sign in again."
                confirmText="Clear and sign out"
                loadingMessage="Clearing..."
                isLoading={maintenance.isClearing}
                variant="danger"
            />
            <ConfirmationModal
                isOpen={maintenance.updateReady}
                onClose={maintenance.dismissUpdate}
                onConfirm={maintenance.applyUpdate}
                title="Update available"
                message="A newer version is ready. Updating reloads the app."
                confirmText="Update now"
            />
        </div>
    );
}
