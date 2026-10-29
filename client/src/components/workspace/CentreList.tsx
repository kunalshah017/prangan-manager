import { MapPin } from "lucide-react";

import { EntityAvatar } from "@/components/workspace/EntityAvatar";
import { EntityList, EntityRow } from "@/components/workspace/EntityList";
import { centerCardDestination } from "@/lib/workspace-hierarchy";
import type { Center } from "@/types/api";

interface CentreListProps {
  projectId: string;
  centres: Center[];
}

export function CentreList({ projectId, centres }: CentreListProps) {
  return (
    <EntityList label="Centres">
      {centres.map((centre) => (
        <EntityRow
          key={centre.id}
          href={centerCardDestination(projectId, centre.id)}
          title={centre.name}
          leading={<EntityAvatar name={centre.name} />}
          meta={
            <span className="flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span className="truncate">{centre.address || "Address not added"}</span>
            </span>
          }
        />
      ))}
    </EntityList>
  );
}

