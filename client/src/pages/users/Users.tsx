import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  CheckCircle2,
  Eye,
  FileCheck2,
  Filter,
  Pencil,
  Search,
  ShieldCheck,
  UsersRound,
  UserX,
  XCircle,
} from "lucide-react";
import toast from "react-hot-toast";

import LoadingButterfly from "@/components/LoadingButterfly";
import UserApprovalModal from "@/components/ui/user-approval-modal";
import { ConfirmationModal, ProfilePicture } from "@/components/ui";
import { WorkspacePage, WorkspacePageHeader } from "@/components/workspace/WorkspacePage";
import { useCenters } from "@/hooks/useCenterQueries";
import { useSemesters } from "@/hooks/useSemesterQueries";
import { useRegistrationRequests, useRevokeUserAccess, useUsers, useVerifyUser } from "@/hooks/useUserQueries";
import { levelName } from "@/lib/levels";
import { cn } from "@/lib/utils";
import type { RoleAssignment, User } from "@/types/api";

type WorkspaceView = "people" | "requests";

const isActiveAssignment = (assignment: NonNullable<User["roleAssignments"]>[number]) => assignment.isActive;

const UserStatus = ({ status, role }: { status: User["status"]; role?: User["role"] }) => (
  <div className="flex flex-wrap gap-2">
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold", status === "APPROVED" ? "bg-success/15 text-success" : "bg-warning/15 text-warning-foreground")}>
      {status === "APPROVED" ? <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" /> : <FileCheck2 className="h-3.5 w-3.5" aria-hidden="true" />}
      {status === "APPROVED" ? "Active" : "Pending"}
    </span>
    {role && <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground">{role === "ADMIN" ? "Administrator" : "Volunteer"}</span>}
  </div>
);

const AssignmentSummary = ({ user }: { user: User }) => {
  const assignments = user.roleAssignments?.filter(isActiveAssignment) ?? [];
  if (!assignments.length) return <p className="text-sm text-muted-foreground">No active assignments</p>;

  return <div className="flex flex-wrap gap-2">{assignments.slice(0, 3).map((assignment) => <span key={assignment.id} className="rounded-md bg-muted px-2 py-1 text-xs font-medium text-foreground">{assignment.subRole.replaceAll("_", " ")}{assignment.subRole === "EDUCATOR" && (assignment.semesterLevel || assignment.level) ? ` · ${levelName(assignment.semesterLevel, assignment.level)}` : ""}</span>)}{assignments.length > 3 && <span className="rounded-md bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">+{assignments.length - 3} more</span>}</div>;
};

const Users = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const view: WorkspaceView = searchParams.get("view") === "requests" ? "requests" : "people";
  const { data: users = [], isLoading: usersLoading, error: usersError, refetch: refetchUsers } = useUsers();
  const { data: requests = [], isLoading: requestsLoading, error: requestsError, refetch: refetchRequests } = useRegistrationRequests();
  const { data: centers = [] } = useCenters();
  const { data: semesters = [] } = useSemesters();
  const verifyUser = useVerifyUser();
  const revokeUserAccess = useRevokeUserAccess();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"ALL" | User["role"]>("ALL");
  const [centerFilter, setCenterFilter] = useState("ALL");
  const [semesterFilter, setSemesterFilter] = useState("ALL");
  const [selectedRequest, setSelectedRequest] = useState<User | null>(null);
  const [userToRevoke, setUserToRevoke] = useState<User | null>(null);

  const approvedUsers = useMemo(() => users.filter((user) => user.status === "APPROVED"), [users]);
  const filteredPeople = useMemo(() => approvedUsers.filter((user) => {
    const query = search.trim().toLowerCase();
    const matchesSearch = !query || user.name.toLowerCase().includes(query) || user.email.toLowerCase().includes(query);
    const matchesRole = roleFilter === "ALL" || user.role === roleFilter;
    const assignments = user.roleAssignments?.filter(isActiveAssignment) ?? [];
    return matchesSearch && matchesRole && (centerFilter === "ALL" || assignments.some((assignment) => assignment.centerId === centerFilter)) && (semesterFilter === "ALL" || assignments.some((assignment) => assignment.semesterId === semesterFilter));
  }).sort((first, second) => first.name.localeCompare(second.name)), [approvedUsers, centerFilter, roleFilter, search, semesterFilter]);
  const filteredRequests = useMemo(() => requests.filter((request) => {
    const query = search.trim().toLowerCase();
    return !query || request.name.toLowerCase().includes(query) || request.email.toLowerCase().includes(query) || request.phone?.toLowerCase().includes(query);
  }).sort((first, second) => new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime()), [requests, search]);

  const isLoading = usersLoading || requestsLoading;
  const error = usersError || requestsError;
  const visibleUsers = view === "people" ? filteredPeople : filteredRequests;
  const hasFilters = !!search || roleFilter !== "ALL" || centerFilter !== "ALL" || semesterFilter !== "ALL";
  const setView = (nextView: WorkspaceView) => setSearchParams(nextView === "requests" ? { view: "requests" } : {});
  const clearFilters = () => { setSearch(""); setRoleFilter("ALL"); setCenterFilter("ALL"); setSemesterFilter("ALL"); };
  const handleApprove = async (user: User, selectedRole: "USER" | "ADMIN", roleAssignments?: RoleAssignment[]) => {
    try {
      await verifyUser.mutateAsync({ userId: user.id, status: "APPROVED", role: selectedRole, roleAssignments });
      toast.success(`${user.name} is now active.`);
    } catch { toast.error("Unable to approve this request. Try again."); throw new Error("Approval failed"); }
  };
  const handleRevokeAccess = async () => {
    if (!userToRevoke) return;
    try {
      await revokeUserAccess.mutateAsync(userToRevoke.id);
      toast.success(`${userToRevoke.name}'s portal access was revoked.`);
      setUserToRevoke(null);
    } catch {
      toast.error("Unable to revoke access. Try again.");
    }
  };
  const handleReject = async (user: User, rejectionReason: string) => {
    try {
      await verifyUser.mutateAsync({ userId: user.id, status: "REJECTED", role: user.role || "USER", rejectionReason });
      toast.success(`${user.name}'s request was rejected.`);
    } catch { toast.error("Unable to reject this request. Try again."); throw new Error("Rejection failed"); }
  };

  if (isLoading) return <WorkspacePage><div className="flex min-h-[55dvh] items-center justify-center" aria-busy="true"><LoadingButterfly size="md" /></div></WorkspacePage>;
  if (error) return <WorkspacePage><div className="mx-auto flex min-h-[55dvh] max-w-lg items-center justify-center"><section className="w-full rounded-lg border border-destructive/30 bg-card p-6 text-center" role="alert"><XCircle className="mx-auto h-8 w-8 text-destructive" /><h1 className="mt-3 text-xl font-semibold">People could not be loaded</h1><p className="mt-2 text-sm text-muted-foreground">Check your connection, then try again.</p><button type="button" onClick={() => void Promise.all([refetchUsers(), refetchRequests()])} className="mt-5 min-h-11 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground">Try again</button></section></div></WorkspacePage>;

  return <WorkspacePage className="space-y-6">
    <WorkspacePageHeader title="People" description="Manage active people and review incoming registrations in one place." badge={`${approvedUsers.length} active`} />
    <nav className="flex gap-2 border-b border-border" aria-label="People views">
      <button type="button" onClick={() => setView("people")} aria-pressed={view === "people"} className={cn("inline-flex min-h-11 items-center gap-2 border-b-2 px-3 text-sm font-semibold", view === "people" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground")}><UsersRound className="h-4 w-4" />People <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-foreground">{approvedUsers.length}</span></button>
      <button type="button" onClick={() => setView("requests")} aria-pressed={view === "requests"} className={cn("inline-flex min-h-11 items-center gap-2 border-b-2 px-3 text-sm font-semibold", view === "requests" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground")}><FileCheck2 className="h-4 w-4" />Requests <span className={cn("rounded-full px-2 py-0.5 text-xs", requests.length ? "bg-warning/15 text-warning-foreground" : "bg-muted text-foreground")}>{requests.length}</span></button>
    </nav>
    <section className="rounded-lg border border-border bg-card p-4 shadow-sm" aria-label="People filters">
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
        <label className="relative block"><span className="sr-only">Search people</span><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={view === "people" ? "Search name or email" : "Search name, email, or phone"} className="min-h-11 w-full rounded-md border border-input bg-background py-2 pl-10 pr-3 text-base text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" /></label>
        {view === "people" && <div className="grid gap-3 sm:grid-cols-3"><select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value as "ALL" | User["role"])} aria-label="Filter by role" className="min-h-11 rounded-md border border-input bg-background px-3 text-sm"><option value="ALL">All roles</option><option value="ADMIN">Administrators</option><option value="USER">Volunteers</option></select><select value={centerFilter} onChange={(event) => setCenterFilter(event.target.value)} aria-label="Filter by center" className="min-h-11 rounded-md border border-input bg-background px-3 text-sm"><option value="ALL">All centers</option>{centers.map((center) => <option key={center.id} value={center.id}>{center.name}</option>)}</select><select value={semesterFilter} onChange={(event) => setSemesterFilter(event.target.value)} aria-label="Filter by semester" className="min-h-11 rounded-md border border-input bg-background px-3 text-sm"><option value="ALL">All semesters</option>{semesters.map((semester) => <option key={semester.id} value={semester.id}>{semester.name}</option>)}</select></div>}
      </div>
      {hasFilters && <div className="mt-3 flex items-center justify-between border-t border-border pt-3 text-sm text-muted-foreground"><span>{visibleUsers.length} result{visibleUsers.length === 1 ? "" : "s"}</span><button type="button" onClick={clearFilters} className="min-h-11 px-3 font-semibold text-primary hover:bg-primary/10">Clear filters</button></div>}
    </section>
    <section aria-live="polite" aria-label={view === "people" ? "People" : "Registration requests"}>
      {visibleUsers.length ? <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{visibleUsers.map((user) => <article key={user.id} className="flex min-w-0 flex-col rounded-lg border border-border bg-card p-5 shadow-sm"><div className="flex items-start gap-3"><ProfilePicture imageUrl={user.profileImageUrl} name={user.name} size="md" colorScheme="orange" className="shrink-0" /><div className="min-w-0 flex-1"><h2 className="truncate text-base font-semibold text-foreground">{user.name}</h2><p className="mt-1 truncate text-sm text-muted-foreground">{user.email}</p></div></div><div className="mt-4"><UserStatus status={user.status} role={view === "people" ? user.role : undefined} /></div>{view === "people" ? <><div className="mt-4 border-t border-border pt-4"><p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Assignments</p><AssignmentSummary user={user} /></div><div className="mt-5 grid grid-cols-2 gap-2"><button type="button" onClick={() => navigate(`/users/${user.id}/details`)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-input px-3 text-sm font-semibold text-foreground hover:bg-accent"><Eye className="h-4 w-4" />View</button><button type="button" onClick={() => navigate(`/users/${user.id}/edit`)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-primary px-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90"><Pencil className="h-4 w-4" />Manage</button></div><button type="button" onClick={() => setUserToRevoke(user)} className="mt-2 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md px-3 text-sm font-semibold text-destructive hover:bg-destructive/10"><UserX className="h-4 w-4" />Revoke access</button></> : <><dl className="mt-4 grid grid-cols-2 gap-3 border-t border-border pt-4 text-sm"><div><dt className="text-xs text-muted-foreground">Phone</dt><dd className="mt-1 break-words text-foreground">{user.phone || "Not provided"}</dd></div><div><dt className="text-xs text-muted-foreground">Submitted</dt><dd className="mt-1 text-foreground">{new Date(user.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</dd></div></dl><button type="button" onClick={() => setSelectedRequest(user)} disabled={verifyUser.isPending} className="mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"><ShieldCheck className="h-4 w-4" />Review application</button></>}</article>)}</div> : <div className="rounded-lg border border-dashed border-border bg-card px-6 py-14 text-center"><Filter className="mx-auto h-10 w-10 text-muted-foreground" /><h2 className="mt-4 text-lg font-semibold text-foreground">{hasFilters ? "No matching results" : view === "people" ? "No active people yet" : "No registration requests"}</h2><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">{hasFilters ? "Try clearing or adjusting the filters." : view === "people" ? "Approved registrations will appear here." : "New applications will appear here for review."}</p>{hasFilters && <button type="button" onClick={clearFilters} className="mt-5 min-h-11 rounded-md border border-input px-4 text-sm font-semibold text-foreground">Clear filters</button>}</div>}
    </section>
    {selectedRequest && <UserApprovalModal user={selectedRequest} isOpen onClose={() => setSelectedRequest(null)} onApprove={handleApprove} onReject={handleReject} />}
    <ConfirmationModal isOpen={!!userToRevoke} onClose={() => setUserToRevoke(null)} onConfirm={() => void handleRevokeAccess()} title="Revoke portal access?" message={`This immediately signs ${userToRevoke?.name ?? "this person"} out, prevents new sign-ins, and removes all active role assignments. Their record and assignment history will be retained.`} confirmText="Revoke access" loadingMessage="Revoking access..." isLoading={revokeUserAccess.isPending} variant="danger" />
  </WorkspacePage>;
};

export default Users;
