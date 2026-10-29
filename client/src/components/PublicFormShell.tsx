import type { ReactNode } from "react";
import { Link } from "react-router-dom";

import DoodleBackground from "@/components/DoodleBackground";
import { StandalonePageNavigation } from "@/components/StandalonePageNavigation";
import { ThemedLogo } from "@/components/ThemedLogo";

// The signed-out page frame shared by password reset and account activation:
// back link, logo, title and the form card, matching Sign in.
export function PublicFormShell({
  title,
  description,
  children,
}: {
  title: string;
  description: ReactNode;
  children: ReactNode;
}) {
  return (
    <main className="min-h-[100dvh] bg-background px-4 py-5 sm:px-6 sm:py-8">
      <DoodleBackground numElements={8} />
      <div className="relative z-10 mx-auto flex min-h-[calc(100dvh-2.5rem)] w-full max-w-md flex-col justify-center">
        <StandalonePageNavigation
          parentHref="/login"
          parentLabel="Sign in"
          currentLabel={title}
          backLabel="Back to sign in"
          className="mb-6"
        />
        <section className="rounded-xl border border-border bg-card p-5 shadow-sm sm:p-8">
          <Link to="/" className="inline-flex items-center gap-3">
            <ThemedLogo className="h-12" />
            <span className="border-l border-primary/30 pl-3 text-sm font-medium text-muted-foreground">
              Prangan Manager workspace
            </span>
          </Link>
          <h1 className="mt-5 text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
          <div className="mt-2 text-sm leading-6 text-muted-foreground">{description}</div>
          <div className="mt-6">{children}</div>
        </section>
      </div>
    </main>
  );
}
