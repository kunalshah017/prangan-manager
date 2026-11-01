import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";

import { fetchPushKey } from "@/hooks/useNotificationQueries";
import { currentSubscription, pushSupport, subscribeDevice, unsubscribeDevice } from "@/lib/push";

export type PushStatus = "checking" | "on" | "off" | "blocked" | "install" | "unsupported" | "unavailable";

// Push for this device: what it is now, and switching it on or off.
export function usePushNotifications() {
  // What the device supports is known at once; the rest needs the server.
  const [status, setStatus] = useState<PushStatus>(() => {
    const support = pushSupport();
    return support === "supported" ? "checking" : support;
  });
  const [isBusy, setIsBusy] = useState(false);
  const publicKey = useRef<string | null>(null);

  const isChecking = status === "checking";
  useEffect(() => {
    if (!isChecking) return;
    let cancelled = false;
    void (async () => {
      let next: PushStatus = "unavailable";
      try {
        publicKey.current = await fetchPushKey();
        if (publicKey.current) {
          next = Notification.permission === "denied" ? "blocked" : (await currentSubscription()) ? "on" : "off";
        }
      } catch {
        // Server unreachable: same as not set up, the switch comes back later.
      }
      if (!cancelled) setStatus(next);
    })();
    return () => {
      cancelled = true;
    };
  }, [isChecking]);

  const turnOn = async () => {
    if (!publicKey.current) return;
    setIsBusy(true);
    try {
      // The browser only shows its prompt in direct response to a tap.
      const permission = Notification.permission === "granted" ? "granted" : await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus(permission === "denied" ? "blocked" : "off");
        return;
      }
      await subscribeDevice(publicKey.current);
      setStatus("on");
    } catch {
      toast.error("Notifications couldn't be turned on. Try again.");
    } finally {
      setIsBusy(false);
    }
  };

  const turnOff = async () => {
    setIsBusy(true);
    try {
      await unsubscribeDevice();
      setStatus("off");
    } catch {
      toast.error("Notifications couldn't be turned off. Try again.");
    } finally {
      setIsBusy(false);
    }
  };

  return { status, isBusy, turnOn, turnOff };
}
