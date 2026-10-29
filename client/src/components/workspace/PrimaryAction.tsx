import type { ReactNode } from "react";
import { Link } from "react-router-dom";

import { buttonVariants } from "@/lib/button-variants";
import { cn } from "@/lib/utils";

interface ActionLink {
  to: string;
  icon?: ReactNode;
  label: string;
}

interface PrimaryActionProps {
  to: string;
  icon?: ReactNode;
  children: ReactNode;
  secondary?: ActionLink;
}

// On phones the page's actions dock to the bottom of the screen, within thumb
// reach, and stay put however long the page grows; from the sm breakpoint they
// render inline where they are placed. Pages using it pass `withMobileAction`
// to WorkspacePage so content clears the bar.
export function PrimaryAction({ to, icon, children, secondary }: PrimaryActionProps) {
  const primaryClassName = cn(buttonVariants(), "min-h-12 gap-2 text-base");
  const secondaryClassName = cn(buttonVariants({ variant: "outline" }), "min-h-12 gap-2 text-base");

  return (
    <>
      <div className="hidden shrink-0 gap-2 sm:flex">
        {secondary && (
          <Link to={secondary.to} className={secondaryClassName}>
            {secondary.icon}
            {secondary.label}
          </Link>
        )}
        <Link to={to} className={primaryClassName}>
          {icon}
          {children}
        </Link>
      </div>
      <div className="fixed inset-x-0 bottom-0 z-30 flex gap-2 border-t border-border bg-background/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur sm:hidden">
        {secondary && (
          <Link to={secondary.to} className={cn(secondaryClassName, "px-4")}>
            {secondary.icon}
            {secondary.label}
          </Link>
        )}
        <Link to={to} className={cn(primaryClassName, "flex-1")}>
          {icon}
          {children}
        </Link>
      </div>
    </>
  );
}
