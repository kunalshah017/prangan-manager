import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

import { ConfirmationModal } from "@/components/ui/confirmation-modal";
import { usePushNotifications } from "@/hooks/usePushNotifications";

// After signing in: ask to turn notifications on, or point to the steps when
// the browser blocks them or the iPhone app isn't installed. Dismissible.
export function NotificationPrompt({ onDone }: { onDone: () => void }) {
  const navigate = useNavigate();
  const { status, isBusy, turnOn } = usePushNotifications();
  const canAsk = status === "off" || status === "blocked" || status === "install";

  // Already on, or nothing this device can do: no prompt this time.
  useEffect(() => {
    if (status === "on" || status === "unsupported" || status === "unavailable") onDone();
  }, [status, onDone]);

  if (!canAsk) return null;

  const showSteps = () => {
    onDone();
    navigate("/profile/settings");
  };

  const copy =
    status === "off"
      ? {
          title: "Turn on notifications",
          message: "Get attendance reminders, new roles and requests that need you, even when the app is closed.",
          confirmText: "Turn on",
          onConfirm: () => void turnOn().finally(onDone),
        }
      : status === "blocked"
        ? {
            title: "Notifications are blocked",
            message: "Your browser is blocking notifications from Prangan Manager. Settings shows how to allow them.",
            confirmText: "Show me how",
            onConfirm: showSteps,
          }
        : {
            title: "Get notifications on iPhone",
            message: "Add Prangan Manager to your Home Screen to get attendance reminders and updates. Settings shows how.",
            confirmText: "Show me how",
            onConfirm: showSteps,
          };

  return (
    <ConfirmationModal
      isOpen
      onClose={onDone}
      cancelText="Not now"
      isLoading={isBusy}
      loadingMessage="Turning on..."
      {...copy}
    />
  );
}
