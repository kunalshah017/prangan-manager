import { useDeferredValue, useMemo, useState } from "react";
import {
  ArrowUpRight,
  CalendarDays,
  ChevronDown,
  GraduationCap,
  Pencil,
  Phone,
  Plus,
  RefreshCw,
  Search,
  UserRound,
} from "lucide-react";
import { Link, useParams } from "react-router-dom";

import ProtectedComponent from "@/components/ProtectedComponent";
import { ProfilePicture } from "@/components/ui";
import WhatsAppIcon from "@/components/ui/WhatsAppIcon";
import { WorkspacePage, WorkspacePageHeader } from "@/components/workspace/WorkspacePage";
import { useAuth } from "@/hooks/useAuth";
import { useStudentsBySemester } from "@/hooks/useStudentQueries";
import { useSemesterLevels } from "@/hooks/useAcademicLevelQueries";
import { can } from "@/lib/access";
import { buttonVariants } from "@/lib/button-variants";
import {
  getMissingStudentDetails,
  getStudentProfileCompletion,
} from "@/lib/student-profile";
import { cn } from "@/lib/utils";
import { levelName } from "@/lib/levels";
import type { Student } from "@/types/api";

type RosterView = "all" | "incomplete";
type LevelFilter = "ALL" | string;

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });

const whatsAppHref = (value: string) => {
  const digits = value.replace(/\D/g, "");
  return `https://wa.me/${digits.startsWith("91") ? digits : `91${digits}`}`;
};

export default function Students() {
  const { projectId, centerId, semesterId } = useParams();
  const { user } = useAuth();
  const context = { projectId, centerId, semesterId };
  const canReadStudents = can(user, "students.read", context);
  const studentQuery = useStudentsBySemester(semesterId || "", { enabled: canReadStudents });
  const semesterLevelsQuery = useSemesterLevels(semesterId || "");
  const [view, setView] = useState<RosterView>("all");
  const [levelFilter, setLevelFilter] = useState<LevelFilter>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const deferredSearch = useDeferredValue(searchQuery.trim().toLocaleLowerCase());
  const baseStudentUrl = `/projects/${projectId}/centers/${centerId}/semesters/${semesterId}/dashboard/students`;

  const students = useMemo(() => studentQuery.data || [], [studentQuery.data]);
  const semesterLevels = useMemo(() => semesterLevelsQuery.data || [], [semesterLevelsQuery.data]);
  const incompleteCount = useMemo(
    () => students.filter((student) => getMissingStudentDetails(student).length > 0).length,
    [students],
  );

  const filteredStudents = useMemo(() => {
    const journeyOrder = new Map(semesterLevels.map((level) => [level.id, level.academicLevel.journeyOrder]));
    const source = [...(students || [])];
    return source
      .filter((student) => view === "all" || getMissingStudentDetails(student).length > 0)
      .filter((student) => levelFilter === "ALL" || student.semesterLevelId === levelFilter)
      .filter((student) => !deferredSearch || student.name.toLocaleLowerCase().includes(deferredSearch) || student.schoolName?.toLocaleLowerCase().includes(deferredSearch))
      .sort((first, second) => {
        const levelDifference = (journeyOrder.get(first.semesterLevelId || "") ?? Number.MAX_SAFE_INTEGER) - (journeyOrder.get(second.semesterLevelId || "") ?? Number.MAX_SAFE_INTEGER);
        return levelDifference || first.name.localeCompare(second.name);
      });
  }, [deferredSearch, levelFilter, semesterLevels, students, view]);

  if (studentQuery.isLoading) return <StudentsSkeleton />;

  if (studentQuery.error) {
    return (
      <div className="mx-auto flex min-h-[55dvh] w-full max-w-2xl items-center justify-center px-4" aria-live="polite">
        <div className="w-full rounded-lg border border-border bg-card p-6 text-center shadow-sm sm:p-8">
          <RefreshCw className="mx-auto h-8 w-8 text-destructive" aria-hidden="true" />
          <h1 className="mt-4 text-2xl font-semibold text-foreground">Students could not be loaded</h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">Check your connection and try loading this semester roster again.</p>
          <button type="button" onClick={() => void studentQuery.refetch()} className={cn(buttonVariants(), "mt-6 min-h-11 gap-2")}><RefreshCw className="h-4 w-4" aria-hidden="true" />Try again</button>
        </div>
      </div>
    );
  }

  return (
    <WorkspacePage>
      <section>
        <WorkspacePageHeader
          title="Students"
          description="Review the semester roster, contact families, and complete student profiles."
          action={
            <ProtectedComponent permission="students.manage" context={context}>
              <Link to={`${baseStudentUrl}/new`} className={cn(buttonVariants(), "min-h-11 w-full gap-2 sm:w-auto")}><Plus className="h-4 w-4" aria-hidden="true" />Add student</Link>
            </ProtectedComponent>
          }
        />

        <div className="mb-6 mt-6 grid gap-4 rounded-lg border border-border bg-card p-4 shadow-sm lg:grid-cols-[auto_minmax(16rem,1fr)_13rem] lg:items-end">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Roster view</p>
            <div className="inline-flex min-h-11 w-full rounded-md border border-border bg-muted p-1 sm:w-auto" role="tablist" aria-label="Student roster view">
              <RosterTab active={view === "all"} onClick={() => setView("all")} label="All students" count={students.length} />
              <RosterTab active={view === "incomplete"} onClick={() => setView("incomplete")} label="Needs details" count={incompleteCount} />
            </div>
          </div>
          <label className="grid gap-2 text-sm font-medium text-foreground" htmlFor="student-search">
            Search roster
            <span className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <input id="student-search" type="search" value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} className="min-h-11 w-full rounded-md border border-input bg-background pl-10 pr-3 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" placeholder="Name or school" />
            </span>
          </label>
          <label className="grid gap-2 text-sm font-medium text-foreground" htmlFor="student-level-filter">
            Level
            <select id="student-level-filter" value={levelFilter} onChange={(event) => setLevelFilter(event.target.value as LevelFilter)} className="min-h-11 rounded-md border border-input bg-background px-3 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
              <option value="ALL">All levels</option>
              {semesterLevels.map((level) => <option key={level.id} value={level.id}>{levelName(level)}</option>)}
            </select>
          </label>
        </div>

        <div className="mb-4 flex flex-wrap items-center justify-between gap-3" aria-live="polite">
          <p className="text-sm text-muted-foreground">Showing <strong className="font-semibold text-foreground">{filteredStudents.length}</strong> of {students.length} students</p>
          {(searchQuery || levelFilter !== "ALL" || view !== "all") && (
            <button type="button" onClick={() => { setSearchQuery(""); setLevelFilter("ALL"); setView("all"); }} className="min-h-11 rounded-md px-3 text-sm font-medium text-primary hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Clear filters</button>
          )}
        </div>

        {filteredStudents.length > 0 ? (
          <div className="grid gap-4 lg:grid-cols-2">
            {filteredStudents.map((student) => (
              <StudentRosterCard key={student.id} student={student} editHref={`${baseStudentUrl}/${student.id}/edit`} context={context} />
            ))}
          </div>
        ) : (
          <EmptyRoster filtered={students.length > 0} onClear={() => { setSearchQuery(""); setLevelFilter("ALL"); setView("all"); }} addHref={`${baseStudentUrl}/new`} context={context} />
        )}
      </section>
    </WorkspacePage>
  );
}

function RosterTab({ active, onClick, label, count }: { active: boolean; onClick: () => void; label: string; count: number }) {
  return <button type="button" role="tab" aria-selected={active} onClick={onClick} className={cn("flex min-h-9 flex-1 items-center justify-center gap-2 rounded px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:flex-none", active ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}><span>{label}</span><span className="rounded-full bg-muted px-1.5 py-0.5 text-xs tabular-nums">{count}</span></button>;
}

function CallAction({ student }: { student: Student }) {
  const number = student.phoneNumber || student.alternateNumber;
  if (!number) return null;

  if (!(student.phoneNumber && student.alternateNumber)) {
    return <a href={`tel:${number}`} className="inline-flex min-h-11 items-center gap-2 rounded-md border border-border px-3 text-sm font-medium text-foreground hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label={`Call ${student.name}`}><Phone className="h-4 w-4" aria-hidden="true" />Call</a>;
  }

  return (
    <details className="group relative">
      <summary className="inline-flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-md border border-border px-3 text-sm font-medium text-foreground hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
        <Phone className="h-4 w-4" aria-hidden="true" />Call<ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180 motion-reduce:transition-none" aria-hidden="true" />
      </summary>
      <div className="absolute bottom-full left-0 z-20 mb-2 w-60 overflow-hidden rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-lg">
        <p className="px-3 py-2 text-xs font-semibold uppercase text-muted-foreground">Choose a number</p>
        <a href={`tel:${student.phoneNumber}`} className="flex min-h-11 items-center justify-between gap-3 rounded px-3 py-2 text-sm hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label={`Call ${student.name} on primary number`}><span className="font-medium">Primary number</span><span className="text-xs text-muted-foreground">{student.phoneNumber}</span></a>
        <a href={`tel:${student.alternateNumber}`} className="flex min-h-11 items-center justify-between gap-3 rounded px-3 py-2 text-sm hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label={`Call ${student.name} on alternate number`}><span className="font-medium">Alternate number</span><span className="text-xs text-muted-foreground">{student.alternateNumber}</span></a>
      </div>
    </details>
  );
}

function StudentRosterCard({ student, editHref, context }: { student: Student; editHref: string; context: { projectId?: string; centerId?: string; semesterId?: string } }) {
  const missing = getMissingStudentDetails(student);
  const completion = getStudentProfileCompletion(student);
  return (
    <article className="rounded-lg border border-border bg-card p-4 shadow-sm transition-[border-color,box-shadow] hover:border-primary/30 hover:shadow-md sm:p-5 motion-reduce:transition-none">
      <div className="flex items-start gap-4">
        <ProfilePicture imageUrl={student.profileImageUrl} name={student.name} size="lg" colorScheme="orange" className="shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0"><h2 className="truncate text-lg font-semibold text-foreground">{student.name}</h2><p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground"><GraduationCap className="h-4 w-4" aria-hidden="true" />{levelName(student.semesterLevel) || "Level not assigned"}</p></div>
            {missing.length > 0 && <span className="rounded-full bg-warning/15 px-2.5 py-1 text-xs font-semibold text-warning-foreground">{completion}% complete</span>}
          </div>
          <div className="mt-3 grid gap-1.5 text-sm text-muted-foreground sm:grid-cols-2">
            {student.dob && <p className="flex items-center gap-2"><CalendarDays className="h-4 w-4" aria-hidden="true" />{formatDate(student.dob)}</p>}
            {student.schoolName && <p className="flex items-center gap-2 truncate"><GraduationCap className="h-4 w-4 shrink-0" aria-hidden="true" /><span className="truncate">{student.schoolName}</span></p>}
          </div>
        </div>
      </div>

      {missing.length > 0 && (
        <div className="mt-4">
          <div className="mb-1.5 flex items-center justify-between text-xs"><span className="font-semibold text-muted-foreground">Profile completeness</span><span className="tabular-nums text-muted-foreground">{missing.length} missing</span></div>
          <div className="h-1.5 overflow-hidden rounded-full bg-muted" aria-label={`Profile completeness ${completion}%`}><div className="h-full rounded-full bg-primary" style={{ width: `${completion}%` }} /></div>
          <p className="mt-2 line-clamp-2 text-xs leading-5 text-muted-foreground">Missing: {missing.slice(0, 4).join(", ")}{missing.length > 4 ? ` +${missing.length - 4} more` : ""}</p>
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border pt-4">
        <CallAction student={student} />
        {(student.whatsappNumber || student.phoneNumber) && <a href={whatsAppHref(student.whatsappNumber || student.phoneNumber!)} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center gap-2 rounded-md border border-border px-3 text-sm font-medium text-foreground hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label={`WhatsApp ${student.name}`}><WhatsAppIcon size={16} />WhatsApp</a>}
        <ProtectedComponent permission="students.manage" context={context}>
          <Link to={editHref} aria-label={`Edit ${student.name}`} className="ml-auto inline-flex min-h-11 items-center gap-2 rounded-md bg-primary px-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"><Pencil className="h-4 w-4" aria-hidden="true" />Edit <ArrowUpRight className="h-4 w-4" aria-hidden="true" /></Link>
        </ProtectedComponent>
      </div>
    </article>
  );
}

function EmptyRoster({ filtered, onClear, addHref, context }: { filtered: boolean; onClear: () => void; addHref: string; context: { projectId?: string; centerId?: string; semesterId?: string } }) {
  return (
    <div className="rounded-lg border border-dashed border-border bg-card px-6 py-14 text-center" aria-live="polite">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">{filtered ? <Search className="h-6 w-6" aria-hidden="true" /> : <UserRound className="h-6 w-6" aria-hidden="true" />}</div>
      <h2 className="mt-5 text-xl font-semibold text-foreground">{filtered ? "No matching students" : "No students in this semester"}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">{filtered ? "Clear or adjust the filters to return to the full roster." : "Add the first student to begin the semester roster."}</p>
      <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
        {filtered && <button type="button" onClick={onClear} className={cn(buttonVariants({ variant: "outline" }), "min-h-11")}>Clear filters</button>}
        {!filtered && <ProtectedComponent permission="students.manage" context={context}><Link to={addHref} className={cn(buttonVariants(), "min-h-11 gap-2")}><Plus className="h-4 w-4" aria-hidden="true" />Add student</Link></ProtectedComponent>}
      </div>
    </div>
  );
}

function StudentsSkeleton() {
  return <div className="mx-auto w-full max-w-6xl animate-pulse space-y-6 py-4 motion-reduce:animate-none" aria-live="polite" aria-busy="true"><div className="space-y-3 border-b border-border pb-6"><div className="h-10 w-48 rounded bg-muted" /><div className="h-5 w-96 max-w-full rounded bg-muted" /></div><div className="h-28 rounded-lg border border-border bg-card" /><div className="grid gap-4 lg:grid-cols-2">{[0, 1, 2, 3].map((item) => <div key={item} className="h-64 rounded-lg border border-border bg-card" />)}</div><span className="sr-only">Loading students</span></div>;
}
