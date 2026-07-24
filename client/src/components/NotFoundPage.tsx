import { Link } from "react-router-dom";
import { Compass } from "lucide-react";

import DoodleBackground from "@/components/DoodleBackground";
import { CustomButton } from "@/components/ui/custom-button";

export default function NotFoundPage() {
  return (
    <main className="relative flex min-h-[100dvh] items-center justify-center overflow-hidden bg-orange-50/40 px-4">
      <DoodleBackground numElements={6} />
      <section className="relative z-10 max-w-md text-center">
        <Compass className="mx-auto h-12 w-12 text-orange-600" aria-hidden="true" />
        <h1 className="mt-5 text-2xl font-semibold text-gray-950">Page not found</h1>
        <p className="mt-2 text-sm text-gray-600">This address is not available in your workspace.</p>
        <Link to="/projects" className="mt-6 inline-flex">
          <CustomButton>Go to projects</CustomButton>
        </Link>
      </section>
    </main>
  );
}