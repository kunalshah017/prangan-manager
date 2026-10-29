import { Pencil } from "lucide-react";
import { Link } from "react-router-dom";

import { StatusBadge } from "@/components/workspace/StatusBadge";
import { projectStatus } from "@/lib/workspace-display";
import type { Project } from "@/types/api";

interface ProjectTileProps {
  project: Project;
  href: string;
  editHref?: string;
}

export function ProjectTile({ project, href, editHref }: ProjectTileProps) {
  const status = projectStatus(project.status);
  return (
    <article className="group relative overflow-hidden rounded-xl border border-border bg-card">
      <div className="aspect-[16/9] overflow-hidden bg-muted">
        <img
          src={project.imageUrl || "/images/default_project_banner.jpg"}
          alt=""
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02] motion-reduce:transform-none motion-reduce:transition-none"
        />
      </div>
      <div className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-xl font-semibold leading-7 text-foreground">
              <Link
                to={href}
                className="after:absolute after:inset-0 after:content-[''] focus-visible:outline-none focus-visible:after:rounded-xl focus-visible:after:ring-2 focus-visible:after:ring-ring"
              >
                {project.name}
              </Link>
            </h2>
            <StatusBadge {...status} className="mt-1.5" />
          </div>
          {editHref && (
            <Link
              to={editHref}
              aria-label={`Edit ${project.name}`}
              title={`Edit ${project.name}`}
              className="relative z-10 -mr-2 -mt-1 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none"
            >
              <Pencil className="h-4 w-4" aria-hidden="true" />
            </Link>
          )}
        </div>
        {project.description && (
          <p className="mt-3 line-clamp-2 text-base leading-6 text-muted-foreground">{project.description}</p>
        )}
      </div>
    </article>
  );
}
