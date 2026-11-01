import { useState, type ReactNode } from "react";
import { Bell, LifeBuoy, Monitor, Moon, Palette, RefreshCw, Sun } from "lucide-react";

import { AppVersion } from "@/components/AppVersion";
import DoodleBackground from "@/components/DoodleBackground";
import { PageTitle } from "@/components/navigation/PageTitle";
import { ConfirmationModal } from "@/components/ui/confirmation-modal";
import { CustomButton } from "@/components/ui/custom-button";
import { useAppMaintenance } from "@/hooks/useAppMaintenance";
import { usePushNotifications, type PushStatus } from "@/hooks/usePushNotifications";
import { useTheme } from "@/hooks/useTheme";
import { detectPlatform, isInstalledApp } from "@/lib/push";
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

                <NotificationsSection />

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

const blockedSteps = () => {
    const platform = detectPlatform();
    if (platform === "ios") return ["Open Settings, then Notifications.", "Choose Prangan Manager and turn on Allow Notifications."];
    if (platform === "android" && isInstalledApp()) {
        return ["Touch and hold the Prangan Manager icon, then tap App info.", "Tap Notifications and turn them on."];
    }
    return ["Click or tap the icon at the left of the address bar.", "Set Notifications to Allow, then reload the app."];
};

const INSTALL_STEPS = [
    "In Safari, tap Share (the square with an arrow).",
    "Choose Add to Home Screen, then Add.",
    "Open Prangan Manager from your Home Screen and turn notifications on here.",
];

const STATUS_TEXT: Record<PushStatus, string> = {
    checking: "Checking this device...",
    on: "On for this device.",
    off: "Get attendance reminders, new roles and requests on this device.",
    blocked: "Blocked for this app. To allow them:",
    install: "On iPhone and iPad, notifications only work in the installed app:",
    unsupported: "This browser can't show notifications. Try Chrome, Edge, Firefox or Safari.",
    unavailable: "Notifications aren't available right now.",
};

// This device's push status with an on/off switch; when it can't be switched
// here, the steps that fix it instead.
function NotificationsSection() {
    const { status, isBusy, turnOn, turnOff } = usePushNotifications();
    const steps = status === "blocked" ? blockedSteps() : status === "install" ? INSTALL_STEPS : null;
    const canSwitch = status === "on" || status === "off";
    const isOn = status === "on";

    return (
        <SettingsSection id="notifications-title" icon={Bell} title="Notifications">
            <div className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-center gap-4">
                    <div className="min-w-0 flex-1">
                        <h3 id="push-setting-title" className="text-base font-semibold text-foreground">Push notifications</h3>
                        <p className="mt-0.5 text-sm leading-5 text-muted-foreground" aria-live="polite">{STATUS_TEXT[status]}</p>
                    </div>
                    {canSwitch && (
                        <button
                            type="button"
                            role="switch"
                            aria-checked={isOn}
                            aria-labelledby="push-setting-title"
                            disabled={isBusy}
                            onClick={() => void (isOn ? turnOff() : turnOn())}
                            className={cn(
                                "relative inline-flex h-8 w-14 shrink-0 items-center rounded-full p-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-60 motion-reduce:transition-none",
                                isOn ? "bg-primary" : "bg-muted-foreground/40",
                            )}
                        >
                            <span
                                aria-hidden="true"
                                className={cn(
                                    "h-6 w-6 rounded-full bg-white shadow-sm transition-transform motion-reduce:transition-none",
                                    isOn && "translate-x-6",
                                )}
                            />
                        </button>
                    )}
                </div>
                {steps && (
                    <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm leading-6 text-foreground">
                        {steps.map((step) => <li key={step}>{step}</li>)}
                    </ol>
                )}
            </div>
        </SettingsSection>
    );
}
