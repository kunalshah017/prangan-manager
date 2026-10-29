import {
  FolderKanban,
  Inbox,
  Layers3,
  UserCog,
  type LucideIcon,
} from "lucide-react";

import { EntityList, EntityRow } from "@/components/workspace/EntityList";
import { PageTitle } from "@/components/navigation/PageTitle";
import { StatusBadge } from "@/components/workspace/StatusBadge";
import { WorkspacePage } from "@/components/workspace/WorkspacePage";
import { useRegistrationRequests } from "@/hooks/useUserQueries";

const tools: Array<{
  label: string;
  description: string;
  href: string;
  icon: LucideIcon;
}> = [
  {
    label: "Users",
    description: "Access, roles and assignments",
    href: "/users",
    icon: UserCog,
  },
  {
    label: "Registration requests",
    description: "Review new sign-ups and assign roles",
    href: "/users?view=requests",
    icon: Inbox,
  },
  {
    label: "Level catalogue",
    description: "Levels shared by every centre",
    href: "/academic-levels",
    icon: Layers3,
  },
  {
    label: "Projects",
    description: "Create and edit projects",
    href: "/projects",
    icon: FolderKanban,
  },
];

export default function AdministrationDashboard() {
  // Only the pending count changes what an admin does next, so it is the one
  // number shown, and the page never waits for it.
  const requestsQuery = useRegistrationRequests();
  const pendingRequests = requestsQuery.data?.length ?? 0;

  return (
    <WorkspacePage className="space-y-6">
      <PageTitle title="Administration" />

      <EntityList label="Administration tools" className="max-w-3xl">
        {tools.map(({ label, description, href, icon: Icon }) => (
          <EntityRow
            key={href}
            href={href}
            title={label}
            leading={
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
            }
            meta={description}
            status={
              href === "/users?view=requests" && pendingRequests > 0 ? (
                <StatusBadge tone="draft" label={`${pendingRequests} waiting`} />
              ) : undefined
            }
          />
        ))}
      </EntityList>
    </WorkspacePage>
  );
}
