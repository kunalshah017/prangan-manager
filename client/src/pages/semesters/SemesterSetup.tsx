import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowRight,
  CheckCircle2,
  GraduationCap,
  Save,
  ShieldCheck,
  Users,
} from "lucide-react";
import toast from "react-hot-toast";

import DoodleBackground from "@/components/DoodleBackground";
import LoadingButterfly from "@/components/LoadingButterfly";
import { StudentPromotionEvidence } from "@/components/semesters/StudentPromotionEvidence";
import { ConfirmationModal } from "@/components/ui";
import {
  useActivateSemester,
  useSaveSemesterStaff,
  useSaveSemesterStudents,
  useSemesterTransition,
} from "@/hooks/useSemesterTransitionQueries";
import { useUsers } from "@/hooks/useUserQueries";
import { buttonVariants } from "@/lib/button-variants";
import { sortByJourneyOrderThenName } from "@/lib/levels";
import { cn } from "@/lib/utils";
import type {
  RoleAssignment,
  StaffTransitionDecision,
  StudentTransitionDecision,
} from "@/types/api";

const roleOptions: Array<{ value: RoleAssignment["subRole"]; label: string }> = [
  { value: "TRAINING_DEVELOPMENT", label: "Training & Development" },
  { value: "RECRUITMENT", label: "Recruitment" },
  { value: "GROWTH_DEVELOPMENT", label: "Growth & Development" },
  { value: "CURRICULUM_MENTOR", label: "Curriculum Mentor" },
  { value: "TECH", label: "Tech" },
  { value: "CENTER_MANAGER", label: "Center Manager" },
  { value: "EDUCATOR", label: "Educator" },
];

const isPayable = (assignment: RoleAssignment) =>
  assignment.subRole === "EDUCATOR" ||
  assignment.subRole === "CENTER_MANAGER";

const studentDecisionOptions: Array<{
  value: StudentTransitionDecision["decision"];
  label: string;
}> = [
  { value: "REVIEW", label: "Review" },
  { value: "PROMOTE", label: "Promote" },
  { value: "RETAIN", label: "Retain" },
  { value: "PASSED_OUT", label: "Passed out" },
  { value: "NOT_CONTINUING", label: "Not continuing" },
];

const requiresTargetLevel = (
  decision: StudentTransitionDecision["decision"],
) => decision === "PROMOTE" || decision === "RETAIN";

const displayName = (person?: {
  name?: string;
  firstName?: string;
  middleName?: string | null;
  lastName?: string | null;
} | null) =>
  [person?.firstName, person?.middleName, person?.lastName]
    .filter(Boolean)
    .join(" ") ||
  person?.name ||
  "Unknown person";

const SemesterSetup = () => {
  const { projectId = "", centerId = "", semesterId = "" } = useParams();
  const navigate = useNavigate();
  const setupQuery = useSemesterTransition(semesterId);
  const usersQuery = useUsers();
  const saveStudents = useSaveSemesterStudents(semesterId);
  const saveStaff = useSaveSemesterStaff(semesterId);
  const activate = useActivateSemester(semesterId);
  const [students, setStudents] = useState<StudentTransitionDecision[]>([]);
  const [staff, setStaff] = useState<StaffTransitionDecision[]>([]);
  const [studentSearch, setStudentSearch] = useState("");
  const [staffSearch, setStaffSearch] = useState("");
  const [newStaffId, setNewStaffId] = useState("");
  const [studentDirty, setStudentDirty] = useState(false);
  const [staffDirty, setStaffDirty] = useState(false);
  const [confirmActivation, setConfirmActivation] = useState(false);

  useEffect(() => {
    if (!setupQuery.data) return;
    setStudents(setupQuery.data.studentPlan);
    setStaff(setupQuery.data.staffPlan);
    setStudentDirty(false);
    setStaffDirty(false);
  }, [setupQuery.data]);

  const levels = setupQuery.data?.semester.levels ?? [];
  const filteredStudents = useMemo(
    () =>
      sortByJourneyOrderThenName(
        students.filter((decision) =>
          displayName(decision.student)
            .toLowerCase()
            .includes(studentSearch.trim().toLowerCase()),
        ),
        (decision) => decision.sourceLevel,
        (decision) => displayName(decision.student),
      ),
    [studentSearch, students],
  );
  const filteredStaff = staff.filter((decision) =>
    displayName(decision.user)
      .toLowerCase()
      .includes(staffSearch.trim().toLowerCase()),
  );
  const availableUsers = (usersQuery.data ?? []).filter(
    (user) =>
      user.status === "APPROVED" &&
      !staff.some((decision) => decision.userId === user.id),
  );
  const missingRates = useMemo(
    () =>
      staff.filter(
        (decision) =>
          decision.decision === "ASSIGN" &&
          decision.assignments.some(isPayable) &&
          (typeof decision.dailyRate !== "number" ||
            !Number.isFinite(decision.dailyRate) ||
            decision.dailyRate < 0),
      ).length,
    [staff],
  );
  const missingLevels = useMemo(
    () =>
      staff.filter(
        (decision) =>
          decision.decision === "ASSIGN" &&
          decision.assignments.some(
            (assignment) =>
              assignment.subRole === "EDUCATOR" &&
              !assignment.semesterLevelId,
          ),
      ).length,
    [staff],
  );
  const missingRoles = staff.filter(
    (decision) =>
      decision.decision === "ASSIGN" && decision.assignments.length === 0,
  ).length;
  const duplicateRoles = staff.filter((decision) => {
    const keys = decision.assignments.map(
      (assignment) =>
        `${assignment.subRole}:${assignment.semesterLevelId ?? ""}`,
    );
    return new Set(keys).size !== keys.length;
  }).length;
  const hasInvalidStaff =
    missingRates > 0 ||
    missingLevels > 0 ||
    missingRoles > 0 ||
    duplicateRoles > 0;
  const unresolvedStudents = students.filter(
    (decision) =>
      decision.decision === "REVIEW" ||
      (requiresTargetLevel(decision.decision) &&
        !decision.targetSemesterLevelId),
  ).length;
  const canActivate =
    setupQuery.data?.status === "DRAFT" &&
    !studentDirty &&
    !staffDirty &&
    !hasInvalidStaff &&
    unresolvedStudents === 0 &&
    !saveStudents.isPending &&
    !saveStaff.isPending;

  const updateStudent = (
    studentId: string,
    patch: Partial<StudentTransitionDecision>,
  ) => {
    setStudents((current) =>
      current.map((decision) =>
        decision.studentId === studentId
          ? { ...decision, ...patch }
          : decision,
      ),
    );
    setStudentDirty(true);
  };

  const updateStaff = (
    userId: string,
    patch: Partial<StaffTransitionDecision>,
  ) => {
    setStaff((current) =>
      current.map((decision) =>
        decision.userId === userId ? { ...decision, ...patch } : decision,
      ),
    );
    setStaffDirty(true);
  };

  const updateAssignment = (
    userId: string,
    index: number,
    patch: Partial<RoleAssignment>,
  ) => {
    const current = staff.find((decision) => decision.userId === userId);
    if (!current) return;
    const assignments = current.assignments.map((assignment, itemIndex) => {
      if (itemIndex !== index) return assignment;
      const next = { ...assignment, ...patch };
      if (patch.subRole && patch.subRole !== "EDUCATOR") {
        delete next.semesterLevelId;
        delete next.semesterLevel;
        delete next.level;
      }
      if (
        patch.subRole &&
        patch.subRole !== "EDUCATOR" &&
        patch.subRole !== "CENTER_MANAGER"
      ) {
        delete next.committedDays;
      }
      return next;
    });
    updateStaff(userId, { assignments });
  };

  const addStaff = () => {
    const user = availableUsers.find((candidate) => candidate.id === newStaffId);
    if (!user) return;
    setStaff((current) => [
      ...current,
      {
        userId: user.id,
        user,
        decision: "ASSIGN",
        assignments: [
          {
            subRole: "TRAINING_DEVELOPMENT",
            projectId,
            centerId,
            semesterId,
          },
        ],
      },
    ]);
    setNewStaffId("");
    setStaffDirty(true);
  };

  const persistStudents = async () => {
    const payload = students.map(
      ({
        sourceEnrollmentId,
        studentId,
        decision,
        targetSemesterLevelId,
      }) => ({
        sourceEnrollmentId,
        studentId,
        decision,
        ...(requiresTargetLevel(decision) &&
          targetSemesterLevelId && { targetSemesterLevelId }),
      }),
    );
    await saveStudents.mutateAsync(payload);
    toast.success("Student progression saved.");
  };

  const persistStaff = async () => {
    const payload = staff.map(({ userId, decision, assignments, dailyRate }) => ({
      userId,
      decision,
      assignments:
        decision === "ASSIGN"
          ? assignments.map((assignment) => ({
              subRole: assignment.subRole,
              projectId,
              centerId,
              semesterId,
              ...(assignment.semesterLevelId && {
                semesterLevelId: assignment.semesterLevelId,
              }),
              ...(assignment.committedDays && {
                committedDays: assignment.committedDays,
              }),
            }))
          : [],
      ...(decision === "ASSIGN" &&
        assignments.some(isPayable) &&
        typeof dailyRate === "number" && { dailyRate }),
    }));
    await saveStaff.mutateAsync(payload);
    toast.success("Staff roles and rates saved.");
  };

  const activateSemester = async () => {
    const { queuedEmailCount } = await activate.mutateAsync();
    toast.success(
      queuedEmailCount === 1
        ? "Semester activated. 1 staff email queued."
        : `Semester activated. ${queuedEmailCount} staff emails queued.`,
    );
    navigate(
      `/projects/${projectId}/centers/${centerId}/semesters/${semesterId}/dashboard`,
    );
  };

  if (setupQuery.isLoading) {
    return (
      <div className="flex min-h-[55dvh] items-center justify-center">
        <LoadingButterfly size="md" />
      </div>
    );
  }
  if (setupQuery.error || !setupQuery.data) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-6" role="alert">
        <h1 className="text-xl font-semibold text-destructive">Semester setup could not be loaded</h1>
        <p className="mt-2 text-sm text-muted-foreground">Try again. No transition decisions were changed.</p>
        <button type="button" onClick={() => void setupQuery.refetch()} className={cn(buttonVariants(), "mt-4 min-h-11")}>Try again</button>
      </div>
    );
  }

  const setup = setupQuery.data;
  return (
    <div className="relative mx-auto w-full max-w-7xl pb-40 sm:pb-28">
      <DoodleBackground animated={false} numElements={8} />
      <div className="relative z-10 space-y-6">
        <header className="border-b border-border pb-6">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            <ShieldCheck className="h-4 w-4" aria-hidden="true" />
            Draft semester
          </div>
          <h1 className="mt-4 text-3xl font-semibold text-foreground sm:text-4xl">
            Set up {setup.semester.name}
          </h1>
          <p className="mt-3 max-w-3xl text-base leading-7 text-muted-foreground">
            Review progression, roles, and daily rates before activation. {setup.sourceSemester
              ? `Starting from ${setup.sourceSemester.name}.`
              : "This semester starts with an empty previous roster."} Older semesters remain unchanged.
          </p>
        </header>

        <section className="grid gap-3 sm:grid-cols-3" aria-label="Setup progress">
          {[
            { label: "Students", icon: GraduationCap, value: `${setup.progress.students.resolved}/${setup.progress.students.total}` },
            { label: "Staff", icon: Users, value: `${setup.progress.staff.resolved}/${setup.progress.staff.total}` },
            { label: "Rates ready", icon: CheckCircle2, value: `${setup.progress.rates.resolved}/${setup.progress.rates.total}` },
          ].map(({ label, icon: Icon, value }) => (
            <div key={label} className="rounded-lg border border-border bg-card p-4 shadow-sm">
              <Icon className="h-5 w-5 text-primary" aria-hidden="true" />
              <p className="mt-3 text-sm text-muted-foreground">{label}</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">{value}</p>
            </div>
          ))}
        </section>

        <section className="rounded-lg border border-border bg-card shadow-sm" aria-labelledby="students-heading">
          <div className="border-b border-border p-4 sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 id="students-heading" className="text-xl font-semibold text-foreground">1. Student progression</h2>
                <p className="mt-1 text-sm text-muted-foreground">Confirm promotion, retention, or departure for every previous student.</p>
              </div>
              <label className="block text-sm font-medium text-foreground">
                Search students
                <input value={studentSearch} onChange={(event) => setStudentSearch(event.target.value)} type="search" className="mt-2 min-h-11 w-full rounded-md border border-input bg-background px-3 sm:w-64" />
              </label>
            </div>
          </div>
          <div className="divide-y divide-border">
            {filteredStudents.map((decision) => (
              <article key={decision.studentId} className="grid gap-4 p-4 sm:p-6 lg:grid-cols-[minmax(12rem,1fr)_minmax(18rem,1.4fr)_minmax(12rem,1fr)] lg:items-end">
                <div>
                 <h3 className="font-semibold text-foreground">{displayName(decision.student)}</h3>
                 <p className="mt-1 text-sm text-muted-foreground">Current: {decision.sourceLevel?.name ?? "Unmapped level"}</p>
                  <StudentPromotionEvidence suggestion={decision.promotionSuggestion} />
                </div>
                <fieldset>
                  <legend className="text-sm font-medium text-foreground">Progression decision</legend>
                  <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {studentDecisionOptions.map(({ value, label }) => (
                      <label key={value} className="flex min-h-11 cursor-pointer items-center justify-center rounded-md border border-border px-2 text-center text-xs font-medium has-[:checked]:border-primary has-[:checked]:bg-primary/10">
                        <input
                          className="sr-only"
                          type="radio"
                          name={`student-${decision.studentId}`}
                          checked={decision.decision === value}
                          onChange={() => {
                            const suggestedTarget =
                              decision.promotionSuggestion?.decision === value
                                ? decision.promotionSuggestion
                                    .targetSemesterLevelId
                                : undefined;
                            const sourceOrder =
                              decision.sourceLevel?.journeyOrder;
                            const matchingTarget =
                              value === "RETAIN"
                                ? levels.find(
                                    (level) =>
                                      level.academicLevel.id ===
                                      decision.sourceLevel?.id,
                                  )
                                : value === "PROMOTE" &&
                                    sourceOrder !== undefined
                                  ? levels.find(
                                      (level) =>
                                        level.academicLevel.journeyOrder >
                                        sourceOrder,
                                    )
                                  : undefined;
                            updateStudent(decision.studentId, {
                              decision: value,
                              targetSemesterLevelId: requiresTargetLevel(value)
                                ? suggestedTarget ??
                                  matchingTarget?.id ??
                                  levels[0]?.id
                                : undefined,
                            });
                          }}
                        />
                        {label}
                      </label>
                    ))}
                  </div>
                </fieldset>
                <label className="text-sm font-medium text-foreground">
                  Target level
                  <select
                    value={decision.targetSemesterLevelId ?? ""}
                    disabled={!requiresTargetLevel(decision.decision)}
                    onChange={(event) => updateStudent(decision.studentId, { targetSemesterLevelId: event.target.value })}
                    className="mt-2 min-h-11 w-full rounded-md border border-input bg-background px-3 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="">Not required</option>
                    {levels.map((level) => <option key={level.id} value={level.id}>{level.academicLevel.name}</option>)}
                  </select>
                </label>
              </article>
            ))}
            {filteredStudents.length === 0 && <p className="p-8 text-center text-sm text-muted-foreground">No students match this search.</p>}
          </div>
          <div className="flex justify-end border-t border-border p-4">
            <button type="button" disabled={!studentDirty || saveStudents.isPending} onClick={() => void persistStudents()} className={cn(buttonVariants(), "min-h-11 w-full gap-2 sm:w-auto")}>
              <Save className="h-4 w-4" aria-hidden="true" />
              {saveStudents.isPending ? "Saving students…" : "Save student progression"}
            </button>
          </div>
        </section>

        <section className="rounded-lg border border-border bg-card shadow-sm" aria-labelledby="staff-heading">
          <div className="border-b border-border p-4 sm:p-6">
            <h2 id="staff-heading" className="text-xl font-semibold text-foreground">2. Staff roles and remuneration</h2>
            <p className="mt-1 text-sm text-muted-foreground">Roles belong only to this semester. Daily rates are shared across a person's payable roles in this semester.</p>
            <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_auto] lg:max-w-2xl">
              <label className="text-sm font-medium text-foreground">
                Add another approved user
                <select value={newStaffId} onChange={(event) => setNewStaffId(event.target.value)} className="mt-2 min-h-11 w-full rounded-md border border-input bg-background px-3">
                  <option value="">Select a user</option>
                  {availableUsers.map((user) => <option key={user.id} value={user.id}>{displayName(user)}</option>)}
                </select>
              </label>
              <button type="button" disabled={!newStaffId} onClick={addStaff} className={cn(buttonVariants({ variant: "outline" }), "min-h-11 self-end")}>Add user</button>
            </div>
            <label className="mt-5 block max-w-sm text-sm font-medium text-foreground">
              Search staff
              <input value={staffSearch} onChange={(event) => setStaffSearch(event.target.value)} type="search" className="mt-2 min-h-11 w-full rounded-md border border-input bg-background px-3" />
            </label>
          </div>
          <div className="space-y-4 p-4 sm:p-6">
            {filteredStaff.map((decision) => {
              const payable = decision.assignments.some(isPayable);
              return (
                <article key={decision.userId} className="rounded-lg border border-border bg-background p-4">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h3 className="font-semibold text-foreground">{displayName(decision.user)}</h3>
                      <p className="text-sm text-muted-foreground">{decision.assignments.length} target role{decision.assignments.length === 1 ? "" : "s"}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {(["ASSIGN", "NOT_CONTINUING"] as const).map((value) => (
                        <label key={value} className="flex min-h-11 cursor-pointer items-center justify-center rounded-md border border-border px-3 text-sm font-medium has-[:checked]:border-primary has-[:checked]:bg-primary/10">
                          <input
                            className="sr-only"
                            type="radio"
                            name={`staff-${decision.userId}`}
                            checked={decision.decision === value}
                            onChange={() => updateStaff(decision.userId, {
                              decision: value,
                              assignments: value === "NOT_CONTINUING" ? [] : decision.assignments.length ? decision.assignments : [{ subRole: "TRAINING_DEVELOPMENT", projectId, centerId, semesterId }],
                            })}
                          />
                          {value === "ASSIGN" ? "Assign" : "Not continuing"}
                        </label>
                      ))}
                    </div>
                  </div>
                  {decision.decision === "ASSIGN" && (
                    <div className="mt-5 space-y-3">
                      {decision.assignments.map((assignment, index) => (
                        <div key={`${decision.userId}-${index}`} className="grid gap-3 rounded-md border border-border p-3 md:grid-cols-4">
                          <label className="text-sm font-medium text-foreground">
                            Role
                            <select value={assignment.subRole} onChange={(event) => updateAssignment(decision.userId, index, { subRole: event.target.value as RoleAssignment["subRole"] })} className="mt-2 min-h-11 w-full rounded-md border border-input bg-background px-3">
                              {roleOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                            </select>
                          </label>
                          {assignment.subRole === "EDUCATOR" && (
                            <label className="text-sm font-medium text-foreground">
                              Level
                              <select value={assignment.semesterLevelId ?? ""} onChange={(event) => updateAssignment(decision.userId, index, { semesterLevelId: event.target.value })} className="mt-2 min-h-11 w-full rounded-md border border-input bg-background px-3">
                                <option value="">Select level</option>
                                {levels.map((level) => <option key={level.id} value={level.id}>{level.academicLevel.name}</option>)}
                              </select>
                              {!assignment.semesterLevelId && <span className="mt-1 block text-sm text-destructive">Needs target level</span>}
                            </label>
                          )}
                          {(assignment.subRole === "EDUCATOR" || assignment.subRole === "CENTER_MANAGER") && (
                            <label className="text-sm font-medium text-foreground">
                              Committed days
                              <select value={assignment.committedDays ?? ""} onChange={(event) => updateAssignment(decision.userId, index, { committedDays: event.target.value as RoleAssignment["committedDays"] })} className="mt-2 min-h-11 w-full rounded-md border border-input bg-background px-3">
                                <option value="">Not set</option>
                                <option value="SATURDAY">Saturday</option>
                                <option value="SUNDAY">Sunday</option>
                                <option value="BOTH">Both days</option>
                              </select>
                            </label>
                          )}
                          <button type="button" onClick={() => updateStaff(decision.userId, { assignments: decision.assignments.filter((_, itemIndex) => itemIndex !== index) })} className={cn(buttonVariants({ variant: "outline" }), "min-h-11 self-end text-destructive")}>Remove role</button>
                        </div>
                      ))}
                      <button type="button" onClick={() => updateStaff(decision.userId, { assignments: [...decision.assignments, { subRole: "TRAINING_DEVELOPMENT", projectId, centerId, semesterId }] })} className={cn(buttonVariants({ variant: "outline" }), "min-h-11")}>Add another role</button>
                      {payable && (
                        <label className="block max-w-xs text-sm font-medium text-foreground">
                          Daily remuneration rate
                          <span className="mt-1 block text-xs font-normal text-muted-foreground">Required for educators and center managers.</span>
                          <div className="relative mt-2">
                            <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-muted-foreground">₹</span>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              inputMode="decimal"
                              value={decision.dailyRate ?? ""}
                              onChange={(event) => updateStaff(decision.userId, { dailyRate: event.target.value === "" ? null : Number(event.target.value) })}
                              className="min-h-11 w-full rounded-md border border-input bg-background pl-8 pr-3"
                            />
                          </div>
                          {(decision.dailyRate === null || decision.dailyRate === undefined) && <span className="mt-1 block text-sm text-destructive">Needs rate</span>}
                        </label>
                      )}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
          <div className="flex justify-end border-t border-border p-4">
            <button type="button" disabled={!staffDirty || saveStaff.isPending || missingRates > 0 || missingLevels > 0 || missingRoles > 0 || duplicateRoles > 0} onClick={() => void persistStaff()} className={cn(buttonVariants(), "min-h-11 w-full gap-2 sm:w-auto")}>
              <Save className="h-4 w-4" aria-hidden="true" />
              {saveStaff.isPending ? "Saving staff…" : "Save roles and rates"}
            </button>
          </div>
        </section>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 p-3 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm">
            <p className="font-semibold text-foreground">
               {missingRates > 0
                 ? `${missingRates} rate${missingRates === 1 ? "" : "s"} still required`
                 : unresolvedStudents > 0
                   ? `${unresolvedStudents} student decision${unresolvedStudents === 1 ? "" : "s"} need review`
                   : missingLevels > 0
                  ? `${missingLevels} educator target level${missingLevels === 1 ? "" : "s"} still required`
                  : missingRoles > 0
                    ? `${missingRoles} staff member${missingRoles === 1 ? "" : "s"} need a role`
                    : duplicateRoles > 0
                      ? `${duplicateRoles} staff member${duplicateRoles === 1 ? "" : "s"} have duplicate roles`
                      : "Ready for final review"}
            </p>
            <p className="text-muted-foreground">{studentDirty || staffDirty ? "Save your changes before activation." : "Activation creates the new records without changing older semesters."}</p>
          </div>
          <button type="button" disabled={!canActivate} onClick={() => setConfirmActivation(true)} className={cn(buttonVariants(), "min-h-11 w-full gap-2 sm:w-auto")}>
            Activate semester
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      <ConfirmationModal
        isOpen={confirmActivation}
        onClose={() => setConfirmActivation(false)}
        onConfirm={() => void activateSemester()}
        title={`Activate ${setup.semester.name}?`}
        message="This creates the reviewed enrollments, roles, and rates for the new semester. Older semesters, attendance, and remuneration will not be changed."
        confirmText="Activate semester"
        isLoading={activate.isPending}
        loadingMessage="Activating semester…"
      />
    </div>
  );
};

export default SemesterSetup;
