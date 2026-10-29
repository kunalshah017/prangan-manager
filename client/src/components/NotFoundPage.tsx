import { Link } from "react-router-dom";
import { Compass } from "lucide-react";

import DoodleBackground from "@/components/DoodleBackground";
import { StandalonePageNavigation } from "@/components/StandalonePageNavigation";
import { buttonVariants } from "@/lib/button-variants";
import { cn } from "@/lib/utils";

export default function NotFoundPage() {
  return (
    <main className="relative flex min-h-[100dvh] items-center justify-center overflow-hidden bg-background px-4">
      <DoodleBackground numElements={6} />
      <section className="relative z-10 w-full max-w-md">
        <StandalonePageNavigation
          parentHref="/projects"
          parentLabel="Projects"
          currentLabel="Page not found"
          backLabel="Back to projects"
          className="mb-8"
        />
        <div className="text-center">
          <Compass className="mx-auto h-12 w-12 text-primary" aria-hidden="true" />
          <h1 className="mt-5 text-2xl font-semibold text-foreground">Page not found</h1>
          <p className="mt-2 text-sm text-muted-foreground">This address is not available in your workspace.</p>
          <Link to="/projects" className={cn(buttonVariants(), "mt-6 min-h-11 px-6")}>
            Go to projects
          </Link>
        </div>
      </section>
    </main>
  );
}
