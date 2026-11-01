import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Inbox, Search, SlidersHorizontal, UsersRound } from "lucide-react";

import { PageTitle } from "@/components/navigation/PageTitle";
import { ProfilePicture } from "@/components/ui";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EntityList, EntityRow } from "@/components/workspace/EntityList";
import { EmptyState, ErrorState, ListPageSkeleton } from "@/components/workspace/PageState";
import { StatusBadge } from "@/components/workspace/StatusBadge";
import { WorkspacePage } from "@/components/workspace/WorkspacePage";
import { useCenters } from "@/hooks/useCenterQueries";
import { useProjects } from "@/hooks/useProjectQueries";
import { useSemesters } from "@/hooks/useSemesterQueries";
import { useRegistrationRequests, useUsers } from "@/hooks/useUserQueries";
import { activeAssignments, assignmentSummary } from "@/lib/user-display";
import { cn } from "@/lib/utils";
import type { User } from "@/types/api";

type UsersView = "users" | "requests" | "revoked";

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

const Users = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const viewParam = searchParams.get("view");
  const view: UsersView = viewParam === "requests" || viewParam === "revoked" ? viewParam : "users";
  const { data: users = [], isLoading: usersLoading, error: usersError, refetch: refetchUsers } = useUsers();
  const { data: requests = [], isLoading: requestsLoading, error: requestsError, refetch: refetchRequests } = useRegistrationRequests();
  const { data: projects = [] } = useProjects();
  const { data: centers = [] } = useCenters();
  const { data: semesters = [] } = useSemesters();
  const [search, setSearch] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [roleFilter, setRoleFilter] = useState<"ALL" | User["role"]>("ALL");
  const [projectFilter, setProjectFilter] = useState("ALL");
  const [centerFilter, setCenterFilter] = useState("ALL");
  const [semesterFilter, setSemesterFilter] = useState("ALL");

  const centreNames = useMemo(() => new Map(centers.map((center) => [center.id, center.name])), [centers]);
  // Filters follow the hierarchy: project, then centre, then semester. With a
  // single project it is chosen implicitly and its filter stays hidden. Each
  // lower filter appears once its parent is set, so repeated names such as
  // "Semester Year 2026-27" are never listed side by side.
  const hasProjectChoice = projects.length > 1;
  const scopeProjectId = hasProjectChoice ? projectFilter : (projects[0]?.id ?? "ALL");
  const projectCentres = useMemo(
    () => centers.filter((center) => (center.projectId ?? center.project?.id) === scopeProjectId),
    [centers, scopeProjectId],
  );
  const changeProjectFilter = (projectId: string) => {
    setProjectFilter(projectId);
    setCenterFilter("ALL");
    setSemesterFilter("ALL");
  };
  const centreSemesters = useMemo(
    () => semesters.filter((semester) => semester.centerId === centerFilter),
    [centerFilter, semesters],
  );
  const changeCentreFilter = (centreId: string) => {
    setCenterFilter(centreId);
    setSemesterFilter("ALL");
  };
  const approvedUsers = useMemo(() => users.filter((user) => user.status === "APPROVED"), [users]);
  // Revoking keeps the person's record with a rejected status; turned-down
  // registrations are deleted, so these are exactly the revoked users.
  const revokedUsers = useMemo(() => users.filter((user) => user.status === "REJECTED"), [users]);
  const filteredUsers = useMemo(() => approvedUsers.filter((user) => {
    const query = search.trim().toLowerCase();
    const matchesSearch = !query || user.name.toLowerCase().includes(query) || user.email.toLowerCase().includes(query);
    const matchesRole = roleFilter === "ALL" || user.role === roleFilter;
    const assignments = activeAssignments(user);
    const matchesProject = !hasProjectChoice || projectFilter === "ALL" || assignments.some((assignment) => assignment.projectId === projectFilter);
    return matchesSearch && matchesRole && matchesProject && (centerFilter === "ALL" || assignments.some((assignment) => assignment.centerId === centerFilter)) && (semesterFilter === "ALL" || assignments.some((assignment) => assignment.semesterId === semesterFilter));
  }).sort((first, second) => first.name.localeCompare(second.name)), [approvedUsers, centerFilter, hasProjectChoice, projectFilter, roleFilter, search, semesterFilter]);
  const filteredRequests = useMemo(() => requests.filter((request) => {
    const query = search.trim().toLowerCase();
    return !query || request.name.toLowerCase().includes(query) || request.email.toLowerCase().includes(query) || request.phone?.toLowerCase().includes(query);
  }).sort((first, second) => new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime()), [requests, search]);

  const filteredRevoked = useMemo(() => {
    const query = search.trim().toLowerCase();
    return revokedUsers
      .filter((user) => !query || user.name.toLowerCase().includes(query) || user.email.toLowerCase().includes(query))
      .sort((first, second) => first.name.localeCompare(second.name));
  }, [revokedUsers, search]);

  const activeFilterCount = [roleFilter, hasProjectChoice ? projectFilter : "ALL", centerFilter, semesterFilter].filter((value) => value !== "ALL").length;
  const hasFilters = !!search || activeFilterCount > 0;
  const resultCount = view === "users" ? filteredUsers.length : view === "requests" ? filteredRequests.length : filteredRevoked.length;
  const setView = (nextView: UsersView) => setSearchParams(nextView === "users" ? {} : { view: nextView });
  const clearFilters = () => { setSearch(""); setRoleFilter("ALL"); setProjectFilter("ALL"); setCenterFilter("ALL"); setSemesterFilter("ALL"); };

  if (usersLoading || requestsLoading) {
    return <WorkspacePage><PageTitle title="Users" /><ListPageSkeleton label="Loading users" rows={6} /></WorkspacePage>;
  }
  if (usersError || requestsError) {
    return (
      <WorkspacePage>
        <PageTitle title="Users" />
        <ErrorState
          title="Users could not be loaded"
          description="Check your connection, then try again."
          onRetry={() => void Promise.all([refetchUsers(), refetchRequests()])}
        />
      </WorkspacePage>
    );
  }

  const tabClass = (active: boolean) => cn(
    "flex min-h-11 flex-1 items-center justify-center gap-2 rounded-md text-base font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none",
    active ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
  );

  return (
    <WorkspacePage className="space-y-4 lg:max-w-4xl">
      <PageTitle title="Users" />

      <div className="flex rounded-lg bg-muted p-1" role="group" aria-label="User views">
        <button type="button" onClick={() => setView("users")} aria-pressed={view === "users"} className={tabClass(view === "users")}>
          Users <span className="tabular-nums text-muted-foreground">{approvedUsers.length}</span>
        </button>
        <button type="button" onClick={() => setView("requests")} aria-pressed={view === "requests"} className={tabClass(view === "requests")}>
          Requests
          {requests.length > 0 && (
            <span className="rounded-full bg-warning/25 px-2 text-sm tabular-nums text-warning-foreground">{requests.length}</span>
          )}
        </button>
        {(revokedUsers.length > 0 || view === "revoked") && (
          <button type="button" onClick={() => setView("revoked")} aria-pressed={view === "revoked"} className={tabClass(view === "revoked")}>
            Revoked <span className="tabular-nums text-muted-foreground">{revokedUsers.length}</span>
          </button>
        )}
      </div>

      <div className="flex gap-2">
        <label className="relative min-w-0 flex-1">
          <span className="sr-only">{view === "requests" ? "Search requests" : "Search users"}</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={view === "requests" ? "Name, email or phone" : "Name or email"}
            className="min-h-12 w-full rounded-md border border-input bg-background py-2 pl-10 pr-3 text-base text-foreground scheme-light placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 dark:scheme-dark"
          />
        </label>
        {view === "users" && (
          <button
            type="button"
            onClick={() => setFiltersOpen((open) => !open)}
            aria-expanded={filtersOpen}
            aria-controls="user-filters"
            className={cn(
              "inline-flex min-h-12 shrink-0 items-center gap-2 rounded-md border px-3 text-base font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none",
              activeFilterCount > 0 ? "border-primary bg-primary/5 text-primary" : "border-input text-foreground hover:bg-accent",
            )}
          >
            <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">Filters</span>
            {activeFilterCount > 0 && <span className="tabular-nums" aria-label={`${activeFilterCount} active`}>{activeFilterCount}</span>}
          </button>
        )}
      </div>

      {view === "users" && filtersOpen && (
        <div id="user-filters" className="grid gap-2 sm:grid-cols-3">
          <Select value={roleFilter} onValueChange={(value) => setRoleFilter(value as "ALL" | User["role"])}>
            <SelectTrigger aria-label="Filter by role"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All roles</SelectItem>
              <SelectItem value="ADMIN">Administrators</SelectItem>
              <SelectItem value="USER">Volunteers</SelectItem>
            </SelectContent>
          </Select>
          {hasProjectChoice && (
            <Select value={projectFilter} onValueChange={changeProjectFilter}>
              <SelectTrigger aria-label="Filter by project"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All projects</SelectItem>
                {projects.map((project) => <SelectItem key={project.id} value={project.id}>{project.name}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
          {scopeProjectId !== "ALL" && (
            <Select value={centerFilter} onValueChange={changeCentreFilter}>
              <SelectTrigger aria-label="Filter by centre"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All centres</SelectItem>
                {projectCentres.map((center) => <SelectItem key={center.id} value={center.id}>{center.name}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
          {centerFilter !== "ALL" && (
            <Select value={semesterFilter} onValueChange={setSemesterFilter}>
              <SelectTrigger aria-label="Filter by semester"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All semesters</SelectItem>
                {centreSemesters.map((semester) => <SelectItem key={semester.id} value={semester.id}>{semester.name}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
        </div>
      )}

      {hasFilters && (
        <div className="flex items-center justify-between text-sm text-muted-foreground" aria-live="polite">
          <span className="tabular-nums">{resultCount} result{resultCount === 1 ? "" : "s"}</span>
          <button type="button" onClick={clearFilters} className="min-h-11 rounded-md px-3 font-semibold text-primary hover:bg-primary/10">Clear</button>
        </div>
      )}

      <section aria-label={view === "users" ? "Users" : view === "requests" ? "Registration requests" : "Revoked users"}>
        {view === "revoked" ? (
          filteredRevoked.length ? (
            <EntityList label="Revoked users">
              {filteredRevoked.map((user) => (
                <EntityRow
                  key={user.id}
                  href={`/users/${user.id}/restore`}
                  title={user.name}
                  leading={<ProfilePicture imageUrl={user.profileImageUrl} name={user.name} size="md" colorScheme="orange" className="shrink-0" />}
                  meta={<span className="block truncate">{user.email}</span>}
                />
              ))}
            </EntityList>
          ) : (
            <EmptyState
              icon={UsersRound}
              title={hasFilters ? "No one matches" : "No revoked users"}
              description={hasFilters ? "Try a different search." : "People whose access is revoked appear here, ready to restore."}
            />
          )
        ) : view === "users" ? (
          filteredUsers.length ? (
            <EntityList label="Users">
              {filteredUsers.map((user) => (
                <EntityRow
                  key={user.id}
                  href={`/users/${user.id}/details`}
                  title={user.name}
                  leading={<ProfilePicture imageUrl={user.profileImageUrl} name={user.name} size="md" colorScheme="orange" className="shrink-0" />}
                  status={user.role === "ADMIN" ? <StatusBadge tone="inactive" label="Admin" /> : undefined}
                  meta={<span className="block truncate">{assignmentSummary(user, centreNames)}</span>}
                />
              ))}
            </EntityList>
          ) : (
            <EmptyState
              icon={UsersRound}
              title={hasFilters ? "No one matches" : "No active users yet"}
              description={hasFilters ? "Try a different search or clear the filters." : "Approved registrations appear here."}
            />
          )
        ) : filteredRequests.length ? (
          <EntityList label="Registration requests">
            {filteredRequests.map((request) => (
              <EntityRow
                key={request.id}
                href={`/users/${request.id}/review`}
                title={request.name}
                leading={<ProfilePicture imageUrl={request.profileImageUrl} name={request.name} size="md" colorScheme="orange" className="shrink-0" />}
                meta={<span className="block truncate">Applied {formatDate(request.createdAt)}{request.phone ? `, ${request.phone}` : ""}</span>}
              />
            ))}
          </EntityList>
        ) : (
          <EmptyState
            icon={Inbox}
            title={hasFilters ? "No requests match" : "No requests waiting"}
            description={hasFilters ? "Try a different search." : "New sign-ups appear here for review."}
          />
        )}
      </section>

    </WorkspacePage>
  );
};

export default Users;
