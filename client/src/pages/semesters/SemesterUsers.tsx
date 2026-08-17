import { useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Plus,
  Search,
  Trash2,
  Users,
} from "lucide-react";
import toast from "react-hot-toast";
import { useParams } from "react-router-dom";

import LoadingButterfly from "@/components/LoadingButterfly";
import { SemesterLevelSelect } from "@/components/levels/SemesterLevelSelect";
import {
  WorkspacePage,
  WorkspacePageHeader,
} from "@/components/workspace/WorkspacePage";
import { useAuth } from "@/hooks/useAuth";
import { useSemester } from "@/hooks/useSemesterQueries";
import {
  useSemesterUsers,
  useSetRemunerationPeriod,
  useUpdateSemesterUserAssignments,
} from "@/hooks/useUserQueries";
import { formatINR, validateRemunerationRate } from "@/lib/remuneration";
import type { RoleAssignment, SemesterUser } from "@/types/api";

const ROLE_OPTIONS: Array<{ value: RoleAssignment["subRole"]; label: string }> = [
  { value: "EDUCATOR", label: "Educator" },
  { value: "CENTER_MANAGER", label: "Center manager" },
  { value: "CURRICULUM_MENTOR", label: "Curriculum mentor" },
  { value: "TRAINING_DEVELOPMENT", label: "Training & Development" },
  { value: "RECRUITMENT", label: "Recruitment" },
  { value: "GROWTH_DEVELOPMENT", label: "Growth & Development" },
  { value: "TECH", label: "Tech" },
];

const roleLabel = (role: string) =>
  ROLE_OPTIONS.find((option) => option.value === role)?.label ??
  role.replaceAll("_", " ");

const todayDate = () => new Date().toISOString().slice(0, 10);

const currentPeriod = (person: SemesterUser, date: string) =>
  person.remunerationPeriods.find(
    (period) =>
      period.effectiveFrom <= date &&
      (period.effectiveTo === null || date <= period.effectiveTo),
  ) ?? person.remunerationPeriods[person.remunerationPeriods.length - 1];

function SemesterUserSettings({
  person,
  projectId,
  centerId,
  semesterId,
  semesterStart,
  semesterEnd,
  canManageRoles,
}: {
  person: SemesterUser;
  projectId: string;
  centerId: string;
  semesterId: string;
  semesterStart: string;
  semesterEnd: string;
  canManageRoles: boolean;
}) {
  const payable = person.roleAssignments.some(
    (assignment) =>
      assignment.isActive &&
      ["EDUCATOR", "CENTER_MANAGER"].includes(assignment.subRole),
  );
  const [assignments, setAssignments] = useState<RoleAssignment[]>(
    person.roleAssignments
      .filter((assignment) => assignment.isActive)
      .map((assignment) => ({
        subRole: assignment.subRole,
        semesterLevelId: assignment.semesterLevelId,
        committedDays: assignment.committedDays,
      })),
  );
  const current = currentPeriod(person, todayDate());
  const [amount, setAmount] = useState(
    current ? String(current.amountPerDay) : "",
  );
  const [effectiveFrom, setEffectiveFrom] = useState(
    current?.effectiveFrom ?? semesterStart,
  );
  const setPeriod = useSetRemunerationPeriod({
    projectId,
    centerId,
    semesterId,
  });
  const updateAssignments = useUpdateSemesterUserAssignments({
    projectId,
    centerId,
    semesterId,
  });
  const amountError = validateRemunerationRate(
    amount,
    current?.amountPerDay ?? null,
  );
  const dateError =
    effectiveFrom < semesterStart || effectiveFrom > semesterEnd
      ? `Choose a date from ${semesterStart} to ${semesterEnd}.`
      : "";
  const roleError = assignments.some(
    (assignment) =>
      assignment.subRole === "EDUCATOR" && !assignment.semesterLevelId,
  )
    ? "Choose a teaching level for every educator role."
    : "";

  const saveRemuneration = async () => {
    if (amountError || dateError || !amount.trim()) return;
    try {
      await setPeriod.mutateAsync({
        userId: person.id,
        amountPerDay: Number(amount),
        effectiveFrom,
      });
      toast.success("Remuneration schedule updated.");
    } catch {
      toast.error("Unable to update remuneration. Try again.");
    }
  };

  const saveRoles = async () => {
    if (roleError) {
      toast.error(roleError);
      return;
    }
    try {
      await updateAssignments.mutateAsync({
        userId: person.id,
        assignments: assignments.map((assignment) => ({
          subRole: assignment.subRole,
          semesterLevelId:
            assignment.subRole === "EDUCATOR"
              ? assignment.semesterLevelId ?? undefined
              : undefined,
          committedDays: ["EDUCATOR", "CENTER_MANAGER"].includes(
            assignment.subRole,
          )
            ? assignment.committedDays
            : undefined,
        })),
      });
      toast.success("Semester roles updated.");
    } catch {
      toast.error("Unable to update semester roles. Try again.");
    }
  };

  return (
    <div className="grid gap-5 border-t border-border bg-muted/20 p-4 lg:grid-cols-2 lg:p-5">
      <section aria-labelledby={`roles-${person.id}`}>
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 id={`roles-${person.id}`} className="font-semibold text-foreground">
              Semester roles
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              These assignments apply only to this semester.
            </p>
          </div>
          {canManageRoles && (
            <button
              type="button"
              onClick={() =>
                setAssignments((currentAssignments) => [
                  ...currentAssignments,
                  { subRole: "EDUCATOR" },
                ])
              }
              className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-border bg-background px-3 text-sm font-semibold hover:bg-muted"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              Add role
            </button>
          )}
        </div>

        <div className="mt-4 space-y-3">
          {assignments.length === 0 && (
            <p className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
              No active semester roles.
            </p>
          )}
          {assignments.map((assignment, index) => (
            <div key={`${assignment.subRole}-${index}`} className="rounded-xl border border-border bg-card p-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <label>
                  <span className="text-sm font-medium text-foreground">Role</span>
                  <select
                    value={assignment.subRole}
                    disabled={!canManageRoles}
                    onChange={(event) =>
                      setAssignments((currentAssignments) =>
                        currentAssignments.map((item, itemIndex) =>
                          itemIndex === index
                            ? {
                                subRole: event.target.value as RoleAssignment["subRole"],
                              }
                            : item,
                        ),
                      )
                    }
                    className="mt-1 min-h-11 w-full rounded-lg border border-input bg-background px-3 text-base disabled:opacity-70 sm:text-sm"
                  >
                    {ROLE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                {assignment.subRole === "EDUCATOR" && (
                  <SemesterLevelSelect
                    semesterId={semesterId}
                    value={assignment.semesterLevelId ?? ""}
                    onChange={(semesterLevelId) =>
                      setAssignments((currentAssignments) =>
                        currentAssignments.map((item, itemIndex) =>
                          itemIndex === index ? { ...item, semesterLevelId } : item,
                        ),
                      )
                    }
                    disabled={!canManageRoles}
                    required
                    label="Teaching level"
                  />
                )}
                {["EDUCATOR", "CENTER_MANAGER"].includes(assignment.subRole) && (
                  <label>
                    <span className="text-sm font-medium text-foreground">Committed days</span>
                    <select
                      value={assignment.committedDays ?? ""}
                      disabled={!canManageRoles}
                      onChange={(event) =>
                        setAssignments((currentAssignments) =>
                          currentAssignments.map((item, itemIndex) =>
                            itemIndex === index
                              ? {
                                  ...item,
                                  committedDays:
                                    (event.target.value as RoleAssignment["committedDays"]) ||
                                    undefined,
                                }
                              : item,
                          ),
                        )
                      }
                      className="mt-1 min-h-11 w-full rounded-lg border border-input bg-background px-3 text-base disabled:opacity-70 sm:text-sm"
                    >
                      <option value="">Not set</option>
                      <option value="SATURDAY">Saturday</option>
                      <option value="SUNDAY">Sunday</option>
                      <option value="BOTH">Saturday and Sunday</option>
                    </select>
                  </label>
                )}
              </div>
              {canManageRoles && (
                <button
                  type="button"
                  onClick={() =>
                    setAssignments((currentAssignments) =>
                      currentAssignments.filter((_, itemIndex) => itemIndex !== index),
                    )
                  }
                  className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm font-semibold text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                  Remove role
                </button>
              )}
            </div>
          ))}
        </div>
        {roleError && (
          <p className="mt-3 text-sm text-destructive" role="alert">
            {roleError}
          </p>
        )}
        {canManageRoles && (
          <button
            type="button"
            onClick={() => void saveRoles()}
            disabled={Boolean(roleError || updateAssignments.isPending)}
            className="mt-4 min-h-11 w-full rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-50 sm:w-auto"
          >
            {updateAssignments.isPending ? "Saving roles…" : "Save semester roles"}
          </button>
        )}
      </section>

      <section aria-labelledby={`remuneration-${person.id}`}>
        <h3 id={`remuneration-${person.id}`} className="font-semibold text-foreground">
          Remuneration schedule
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Each attendance date uses the daily remuneration effective on that date.
        </p>
        {!payable ? (
          <div className="mt-4 rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
            Add an educator or center manager role before configuring remuneration.
          </div>
        ) : (
          <>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label>
                <span className="text-sm font-medium text-foreground">Daily remuneration</span>
                <div className="relative mt-1">
                  <span className="pointer-events-none absolute left-3 top-3 text-muted-foreground">₹</span>
                  <input
                    inputMode="decimal"
                    value={amount}
                    onChange={(event) => setAmount(event.target.value)}
                    className="min-h-11 w-full rounded-lg border border-input bg-background pl-8 pr-3 text-base tabular-nums sm:text-sm"
                  />
                </div>
                {amountError && <span className="mt-1 block text-xs text-destructive">{amountError}</span>}
              </label>
              <label>
                <span className="text-sm font-medium text-foreground">Effective from</span>
                <input
                  type="date"
                  min={semesterStart}
                  max={semesterEnd}
                  value={effectiveFrom}
                  onChange={(event) => setEffectiveFrom(event.target.value)}
                  className="mt-1 min-h-11 w-full rounded-lg border border-input bg-background px-3 text-base sm:text-sm"
                />
                {dateError && <span className="mt-1 block text-xs text-destructive">{dateError}</span>}
              </label>
            </div>
            <button
              type="button"
              onClick={() => void saveRemuneration()}
              disabled={Boolean(amountError || dateError || !amount.trim() || setPeriod.isPending)}
              className="mt-4 min-h-11 w-full rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-50 sm:w-auto"
            >
              {setPeriod.isPending ? "Saving remuneration…" : "Save remuneration"}
            </button>
          </>
        )}
        <ol className="mt-5 space-y-2" aria-label="Remuneration schedule">
          {person.remunerationPeriods.map((period) => (
            <li key={period.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm">
              <span className="tabular-nums font-semibold text-foreground">
                {formatINR(period.amountPerDay)} per day
              </span>
              <span className="text-muted-foreground">
                {period.effectiveFrom} – {period.effectiveTo ?? "semester end"}
              </span>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}

export default function SemesterUsers() {
  const { projectId = "", centerId = "", semesterId = "" } = useParams();
  const { user } = useAuth();
  const semesterQuery = useSemester(semesterId);
  const usersQuery = useSemesterUsers({ projectId, centerId, semesterId });
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("ALL");
  const [readiness, setReadiness] = useState("ALL");
  const [expanded, setExpanded] = useState<string | null>(null);

  const people = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return (usersQuery.data ?? []).filter((person) => {
      const activeRoles = person.roleAssignments.filter((assignment) => assignment.isActive);
      const payable = activeRoles.some((assignment) =>
        ["EDUCATOR", "CENTER_MANAGER"].includes(assignment.subRole),
      );
      const configured = person.remunerationPeriods.length > 0;
      if (query && !`${person.name} ${person.email}`.toLocaleLowerCase().includes(query)) return false;
      if (role !== "ALL" && !activeRoles.some((assignment) => assignment.subRole === role)) return false;
      if (readiness === "READY" && payable && !configured) return false;
      if (readiness === "NEEDS_REMUNERATION" && (!payable || configured)) return false;
      return true;
    });
  }, [readiness, role, search, usersQuery.data]);

  if (semesterQuery.isLoading || usersQuery.isLoading) return <LoadingButterfly />;

  if (semesterQuery.error || usersQuery.error || !semesterQuery.data) {
    return (
      <WorkspacePage>
        <WorkspacePageHeader
          title="Semester users"
          description="Manage semester roles and remuneration."
        />
        <div className="mt-6 flex gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-destructive" role="alert">
          <AlertCircle className="h-5 w-5 shrink-0" aria-hidden="true" />
          <p className="text-sm">Semester users could not be loaded. Please try again.</p>
        </div>
      </WorkspacePage>
    );
  }

  const semesterStart = semesterQuery.data.startDate.slice(0, 10);
  const semesterEnd = semesterQuery.data.endDate.slice(0, 10);

  return (
    <WorkspacePage>
      <WorkspacePageHeader
        title="Semester users"
        badge={semesterQuery.data.name}
        description="Manage roles, teaching settings, committed days, and effective-dated remuneration for this semester."
      />

      <section className="mt-6 rounded-xl border border-border bg-card p-4 shadow-sm">
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_190px_220px]">
          <label className="relative">
            <span className="sr-only">Search semester users</span>
            <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" aria-hidden="true" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search name or email"
              className="min-h-11 w-full rounded-lg border border-input bg-background pl-10 pr-3 text-base sm:text-sm"
            />
          </label>
          <label>
            <span className="sr-only">Filter by role</span>
            <select value={role} onChange={(event) => setRole(event.target.value)} className="min-h-11 w-full rounded-lg border border-input bg-background px-3 text-base sm:text-sm">
              <option value="ALL">All roles</option>
              {ROLE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
          <label>
            <span className="sr-only">Filter by remuneration readiness</span>
            <select value={readiness} onChange={(event) => setReadiness(event.target.value)} className="min-h-11 w-full rounded-lg border border-input bg-background px-3 text-base sm:text-sm">
              <option value="ALL">All remuneration states</option>
              <option value="READY">Remuneration configured</option>
              <option value="NEEDS_REMUNERATION">Needs remuneration</option>
            </select>
          </label>
        </div>
      </section>

      <div className="mt-6 space-y-3">
        {people.length === 0 && (
          <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center">
            <Users className="mx-auto h-7 w-7 text-muted-foreground" aria-hidden="true" />
            <h2 className="mt-3 font-semibold text-foreground">No matching semester users</h2>
            <p className="mt-1 text-sm text-muted-foreground">Adjust the search or filters.</p>
          </div>
        )}
        {people.map((person) => {
          const activeRoles = person.roleAssignments.filter((assignment) => assignment.isActive);
          const payable = activeRoles.some((assignment) =>
            ["EDUCATOR", "CENTER_MANAGER"].includes(assignment.subRole),
          );
          const current = currentPeriod(person, todayDate());
          const isExpanded = expanded === person.id;
          return (
            <article key={person.id} className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
              <button
                type="button"
                onClick={() => setExpanded(isExpanded ? null : person.id)}
                aria-expanded={isExpanded}
                className="flex min-h-11 w-full items-start justify-between gap-4 p-4 text-left hover:bg-muted/40 sm:items-center"
              >
                <div className="min-w-0">
                  <h2 className="font-semibold text-foreground">{person.name}</h2>
                  <p className="mt-0.5 truncate text-sm text-muted-foreground">{person.email}</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {activeRoles.map((assignment) => (
                      <span key={assignment.id} className="rounded-full bg-muted px-2 py-1 text-xs font-medium text-foreground">
                        {roleLabel(assignment.subRole)}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <div className="hidden text-right sm:block">
                    <p className="text-sm font-semibold tabular-nums text-foreground">
                      {payable ? (current ? `${formatINR(current.amountPerDay)}/day` : "Needs remuneration") : "Not payable"}
                    </p>
                    <p className="mt-1 flex items-center justify-end gap-1 text-xs text-muted-foreground">
                      {payable && !current ? <AlertCircle className="h-3.5 w-3.5 text-amber-600" /> : <CheckCircle2 className="h-3.5 w-3.5 text-success" />}
                      {person.remunerationPeriods.length} schedule {person.remunerationPeriods.length === 1 ? "period" : "periods"}
                    </p>
                  </div>
                  {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                </div>
              </button>
              {isExpanded && (
                <SemesterUserSettings
                  person={person}
                  projectId={projectId}
                  centerId={centerId}
                  semesterId={semesterId}
                  semesterStart={semesterStart}
                  semesterEnd={semesterEnd}
                  canManageRoles={user?.role === "ADMIN"}
                />
              )}
            </article>
          );
        })}
      </div>
    </WorkspacePage>
  );
}
