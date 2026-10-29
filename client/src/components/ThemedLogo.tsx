import { cn } from "@/lib/utils";

// The wordmark's dark red disappears on a dark background, so each theme gets
// its own artwork. Both are in the page; CSS shows the one that fits.
export function ThemedLogo({ className }: { className?: string }) {
  return (
    <>
      <img src="/images/logo/prangan-logo-light-mode.png" alt="Prangan" className={cn("w-auto dark:hidden", className)} />
      <img src="/images/logo/prangan-logo-dark-mode.png" alt="Prangan" className={cn("hidden w-auto dark:block", className)} />
    </>
  );
}
