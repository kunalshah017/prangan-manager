import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

const SHOW_FOR_MS = 5000;

// A short note under the bell when something can't wait. Mounted again (new
// key) each time it should show; it then hides itself.
export function AttentionNudge({ count }: { count: number }) {
  const [shown, setShown] = useState(true);
  useEffect(() => {
    const timer = setTimeout(() => setShown(false), SHOW_FOR_MS);
    return () => clearTimeout(timer);
  }, []);

  if (!shown) return null;
  return (
    <div role="status" className="absolute right-0 top-full z-50 mt-2">
      <Link
        to="/notifications"
        className="animate-nudge-in relative block w-max max-w-[calc(100vw-2rem)] rounded-lg border border-warning/60 bg-popover px-3 py-2 text-sm font-semibold text-popover-foreground shadow-xl before:absolute before:-top-[5px] before:right-[18px] before:h-2 before:w-2 before:rotate-45 before:border-l before:border-t before:border-warning/60 before:bg-popover hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {count === 1 ? "Something needs your attention" : `${count} things need your attention`}
      </Link>
    </div>
  );
}
