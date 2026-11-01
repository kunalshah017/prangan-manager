import { useEffect, useState, type ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { Briefcase, Mail, Phone } from "lucide-react";

import { PageTitle } from "@/components/navigation/PageTitle";
import { ProfilePicture } from "@/components/ui";
import { MonthlyActivity } from "@/components/users/MonthlyActivity";
import { EmptyState } from "@/components/workspace/PageState";
import { StatusBadge } from "@/components/workspace/StatusBadge";
import { WorkspacePage } from "@/components/workspace/WorkspacePage";
import { levelName } from "@/lib/levels";
import { activeAssignments, SUB_ROLE_LABELS } from "@/lib/user-display";
import { cn } from "@/lib/utils";
import type { User, UserAssignment } from "@/types/api";
import { formatMoment } from "@/lib/dates";

export type ProfileTab = "about" | "work" | "activity" | "payments";

const TABS: Array<{ id: ProfileTab; label: string }> = [
  { id: "about", label: "About" },
  { id: "work", label: "Work" },
  { id: "activity", label: "Activity" },
  { id: "payments", label: "Payments" },
];

const COMMITTED_DAYS: Record<string, string> = {
  SATURDAY: "Saturdays",
  SUNDAY: "Sundays",
  BOTH: "Saturdays and Sundays",
};

interface UserProfileViewProps {
  user: User;
  isSelf: boolean;
  title: string;
  about: ReactNode;
  payments: ReactNode;
  headerAction?: ReactNode;
  footer?: ReactNode;
}

// One page for a person, used for your own profile and for an admin viewing
// someone. The sections are the same; only what can be edited differs.
export function UserProfileView({ user, isSelf, title, about, payments, headerAction, footer }: UserProfileViewProps) {
  const location = useLocation();
  // Links can open a tab: #payment (bank details), #activity (the "Remuneration paid" notification).
  const tabFromHash = location.hash === "#payment" ? "payments" : location.hash === "#activity" ? "activity" : null;
  const [tab, setTab] = useState<ProfileTab>(tabFromHash ?? "about");

  useEffect(() => {
    if (tabFromHash) setTab(tabFromHash);
  }, [tabFromHash]);

  return (
    <WorkspacePage className="space-y-5 lg:max-w-4xl">
      <PageTitle title={title} />

      <ProfileHeader user={user} action={headerAction} />

      <div className="flex rounded-lg bg-muted p-1" role="tablist" aria-label="Profile sections">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            id={`profile-tab-${item.id}`}
            aria-selected={tab === item.id}
            aria-controls={`profile-panel-${item.id}`}
            onClick={() => setTab(item.id)}
            className={cn(
              "min-h-11 flex-1 rounded-md px-1 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:text-base motion-reduce:transition-none",
              tab === item.id ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      <section
        id={`profile-panel-${tab}`}
        role="tabpanel"
        aria-labelledby={`profile-tab-${tab}`}
      >
        {tab === "about" && about}
        {tab === "work" && <AssignmentList user={user} isSelf={isSelf} />}
        {tab === "activity" && <MonthlyActivity user={user} isSelf={isSelf} />}
        {tab === "payments" && <div id="payment">{payments}</div>}
      </section>

      {footer}
    </WorkspacePage>
  );
}

// Photo, name and contact details. The action sits beside the name and stays
// top-aligned however many contact lines a person has.
export function ProfileHeader({ user, action }: { user: Pick<User, "name" | "email" | "phone" | "role" | "profileImageUrl">; action?: ReactNode }) {
  return (
    <header className="flex items-start gap-4">
      <ProfilePicture imageUrl={user.profileImageUrl} name={user.name} size="lg" colorScheme="orange" className="shrink-0" />
      <div className="min-w-0 flex-1 self-center">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="truncate text-xl font-semibold text-foreground sm:text-2xl">{user.name}</h2>
          {user.role === "ADMIN" && <StatusBadge tone="inactive" label="Admin" />}
        </div>
        <p className="mt-0.5 flex min-w-0 items-center gap-1.5 text-sm text-muted-foreground">
          <Mail className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span className="truncate">{user.email}</span>
        </p>
        {user.phone && (
          <a href={`tel:${user.phone}`} className="mt-0.5 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary">
            <Phone className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            {user.phone}
          </a>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </header>
  );
}

// Start and end are moments: shown in the viewer's own zone.
const monthYear = (value?: string | null) =>
  value ? formatMoment(value, { month: "short", year: "numeric" }) : null;

function AssignmentRows({ assignments, past = false }: { assignments: UserAssignment[]; past?: boolean }) {
  return (
    <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card" aria-label={past ? "Past assignments" : "Current assignments"}>
      {assignments.map((assignment) => {
        const started = monthYear(assignment.assignedAt);
        const ended = monthYear(assignment.endedAt);
        return (
          <li key={assignment.id} className="px-4 py-3">
            <div className="flex items-baseline justify-between gap-3">
              <p className={cn("text-base font-semibold", past ? "text-muted-foreground" : "text-foreground")}>
                {SUB_ROLE_LABELS[assignment.subRole]}
                {assignment.semesterLevel ? `, ${levelName(assignment.semesterLevel)}` : ""}
              </p>
              {(started || ended) && (
                <span className="shrink-0 text-sm tabular-nums text-muted-foreground">
                  {past ? [started, ended].filter(Boolean).join(" – ") : `Since ${started}`}
                </span>
              )}
            </div>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {[assignment.center?.name, assignment.semester?.name].filter(Boolean).join(", ") || assignment.project?.name}
            </p>
            {!past && assignment.committedDays && (
              <p className="mt-0.5 text-sm text-muted-foreground">{COMMITTED_DAYS[assignment.committedDays]}</p>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function AssignmentList({ user, isSelf }: { user: User; isSelf: boolean }) {
  const current = activeAssignments(user);
  const past = user.pastRoleAssignments ?? [];

  return (
    <div className="space-y-5">
      {current.length ? (
        <AssignmentRows assignments={current} />
      ) : (
        <EmptyState
          icon={Briefcase}
          title="No current assignments"
          description={isSelf ? "Your roles at centres will appear here once an administrator assigns them." : "Assign a role from Edit user."}
        />
      )}
      {past.length > 0 && (
        <section aria-labelledby="past-assignments-title" className="space-y-2">
          <h3 id="past-assignments-title" className="text-base font-semibold text-foreground">Past assignments</h3>
          <AssignmentRows assignments={past} past />
        </section>
      )}
    </div>
  );
}

// Read-only facts as label/value pairs, in sentence case.
export function DetailList({ items }: { items: Array<{ label: string; value: ReactNode; wide?: boolean }> }) {
  return (
    <dl className="grid gap-x-6 gap-y-4 rounded-xl border border-border bg-card p-4 sm:grid-cols-2">
      {items.map((item) => (
        <div key={item.label} className={item.wide ? "sm:col-span-2" : undefined}>
          <dt className="text-sm text-muted-foreground">{item.label}</dt>
          <dd className="mt-0.5 break-words text-base text-foreground">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}
