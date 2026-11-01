import { indiaToday } from "../lib/role-assignments.js";
import { prisma } from "../lib/prisma.js";
import { calendarDate } from "../utils/dateHelpers.js";
import { getRelevantCommittedDays } from "./attendance.service.js";
import { notifyUsers, registrationKey, registrationRequestMessage } from "./notification.service.js";

// Hour in India when whatever is still unmarked gets a reminder:
// Saturday evening, Sunday morning.
const REMINDER_HOUR_IN_INDIA: Record<number, number> = { 6: 18, 0: 10 };
const KEEP_NOTIFICATIONS_DAYS = 60;
const DAY_MS = 24 * 60 * 60 * 1000;
const INDIA_OFFSET_MS = 330 * 60 * 1000;

// The reminder due at this moment, if any. Pure clock arithmetic: no database,
// so the 5-minute uptime ping that calls this never wakes Neon.
export const dueReminderKey = (now: Date = new Date()): string | null => {
  const india = new Date(now.getTime() + INDIA_OFFSET_MS);
  const hour = REMINDER_HOUR_IN_INDIA[india.getUTCDay()];
  if (hour === undefined || india.getUTCHours() < hour) return null;
  return `reminders:${india.toISOString().slice(0, 10)}`;
};

// A day's reminders disappear at midnight in India.
export const endOfIndiaDay = (day: string) => new Date(calendarDate(day).getTime() + DAY_MS - INDIA_OFFSET_MS);

const studentKey = (semesterId: string, day: string) => `attendance-students:${semesterId}:${day}`;
const staffKey = (semesterId: string, day: string) => `attendance-staff:${semesterId}:${day}`;

// Who still has attendance to mark for one semester on one day: educators of
// levels with no student attendance and centre managers while any level is
// unmarked (students); centre managers while anyone due that day is unmarked (staff).
const pendingAttendance = async (semesterId: string, day: string) => {
  const date = calendarDate(day);
  const [enrolledLevels, studentRecords, team, staffRecords] = await Promise.all([
    prisma.studentEnrollments.findMany({
      where: { semesterId, isActive: true },
      distinct: ["semesterLevelId"],
      select: { semesterLevelId: true },
    }),
    prisma.studentAttendance.findMany({
      where: { semesterId, date },
      select: { enrollment: { select: { semesterLevelId: true } } },
    }),
    prisma.userRoleAssignments.findMany({
      where: { semesterId, isActive: true, subRole: { in: ["EDUCATOR", "CENTER_MANAGER"] } },
      select: { userId: true, subRole: true, semesterLevelId: true, committedDays: true },
    }),
    prisma.userAttendance.findMany({
      where: { semesterId, date },
      distinct: ["userId"],
      select: { userId: true },
    }),
  ]);

  const markedLevels = new Set(studentRecords.map((record) => record.enrollment.semesterLevelId));
  const unmarkedLevels = new Set(
    enrolledLevels.map((level) => level.semesterLevelId).filter((id) => !markedLevels.has(id)),
  );
  const markedStaff = new Set(staffRecords.map((record) => record.userId));
  const workingToday = getRelevantCommittedDays(day);
  const unmarkedStaff = team.filter(
    (member) => (!member.committedDays || workingToday.includes(member.committedDays)) && !markedStaff.has(member.userId),
  );
  const managers = team.filter((member) => member.subRole === "CENTER_MANAGER").map((member) => member.userId);
  const educators = team
    .filter((member) => member.subRole === "EDUCATOR" && member.semesterLevelId && unmarkedLevels.has(member.semesterLevelId))
    .map((member) => member.userId);

  return {
    students: unmarkedLevels.size > 0 ? [...new Set([...educators, ...managers])] : [],
    staff: unmarkedStaff.length > 0 ? managers : [],
  };
};

const semesterLink = (semester: { id: string; centerId: string; center: { projectId: string } }) =>
  `/projects/${semester.center.projectId}/centers/${semester.centerId}/semesters/${semester.id}/dashboard`;

const runningOn = (date: Date) => ({ status: "ACTIVE" as const, startDate: { lte: date }, endDate: { gte: date } });
const semesterSelect = { id: true, centerId: true, center: { select: { name: true, projectId: true } } } as const;

const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;

// Weekly to-dos last until the night after the next check, which replaces them.
const untilNextWeek = (day: string) => new Date(endOfIndiaDay(day).getTime() + 7 * DAY_MS);

// After a save: keep a weekly to-do's count current, and clear it at zero.
const updateOrClearTask = (key: string, count: number, body: string) =>
  count === 0
    ? prisma.notification.deleteMany({ where: { key } })
    : prisma.notification.updateMany({ where: { key }, data: { body } });

const inBackground = (task: Promise<unknown>) => {
  void task.catch((error) => console.error("Clearing reminders failed:", (error as Error).message));
};

// Active centre managers of each semester.
const managersBySemester = async (semesterIds: string[]) => {
  const rows = await prisma.userRoleAssignments.findMany({
    where: { semesterId: { in: [...new Set(semesterIds)] }, isActive: true, subRole: "CENTER_MANAGER" },
    select: { userId: true, semesterId: true },
  });
  return (semesterId: string) => rows.filter((row) => row.semesterId === semesterId).map((row) => row.userId);
};

// Up to five names, then how many more.
const listNames = (names: string[]) =>
  names.length <= 5 ? names.join(", ") : `${names.slice(0, 5).join(", ")} and ${names.length - 5} more`;

// A to-do for everyone with attendance still to mark in each semester running
// that day. It clears once they mark it (resolveAttendanceReminders) or at midnight.
export const sendAttendanceReminders = async (day: string) => {
  const date = calendarDate(day);
  const semesters = await prisma.semesters.findMany({
    where: { status: "ACTIVE", startDate: { lte: date }, endDate: { gte: date } },
    select: { id: true, centerId: true, center: { select: { name: true, projectId: true } } },
  });
  const expiresAt = endOfIndiaDay(day);

  for (const semester of semesters) {
    const pending = await pendingAttendance(semester.id, day);
    const link = semesterLink(semester);
    const body = `${semester.center.name}: not marked yet today.`;
    await notifyUsers(pending.students, {
      title: "Mark student attendance",
      body,
      href: `${link}/student-attendance/mark`,
      actionLabel: "Mark attendance",
      kind: "TASK",
      key: studentKey(semester.id, day),
      expiresAt,
    });
    await notifyUsers(pending.staff, {
      title: "Mark staff attendance",
      body,
      href: `${link}/attendance/mark`,
      actionLabel: "Mark attendance",
      kind: "TASK",
      key: staffKey(semester.id, day),
      expiresAt,
    });
  }
};

// After attendance is saved: clear the to-dos of everyone who has nothing left
// to mark. Only reads further when that day has open reminders.
export const resolveAttendanceReminders = async (semesterId: string, day: string) => {
  const keys = { students: studentKey(semesterId, day), staff: staffKey(semesterId, day) };
  const open = await prisma.notification.count({ where: { key: { in: [keys.students, keys.staff] } } });
  if (open === 0) return;
  const pending = await pendingAttendance(semesterId, day);
  await prisma.notification.deleteMany({
    where: {
      OR: [
        { key: keys.students, userId: { notIn: pending.students } },
        { key: keys.staff, userId: { notIn: pending.staff } },
      ],
    },
  });
};

// Saving attendance must never fail because a reminder could not be cleared.
export const resolveAttendanceRemindersInBackground = (semesterId: string, day: string) => {
  void resolveAttendanceReminders(semesterId, day).catch((error) =>
    console.error("Clearing reminders failed:", (error as Error).message),
  );
};

// Curriculum: a level is behind when a topic in progress hasn't been updated
// for this many days. Classes are weekend-only, so people read it in weekends.
const CURRICULUM_STALE_DAYS = 12;
// The centre manager hears about a level a week after its educators.
const CURRICULUM_ESCALATE_DAYS = CURRICULUM_STALE_DAYS + 7;

// Weekends between a day and a Saturday: the Saturdays after that day, up to it.
const weekendsSince = (days: number) => Math.ceil(days / 7);

const levelKey = (semesterLevelId: string) => `curriculum:${semesterLevelId}`;
const centreKey = (semesterId: string) => `curriculum-centre:${semesterId}`;

type BehindLevel = {
  semesterLevelId: string;
  semesterId: string;
  name: string;
  syllabusIds: Set<string>;
  // Days since the most recent update among its stale topics.
  days: number;
  semester: { id: string; centerId: string; center: { name: string; projectId: string } };
};

// Levels with a topic in progress that hasn't moved in CURRICULUM_STALE_DAYS,
// in semesters running on that day.
const levelsBehind = async (day: string, semesterId?: string) => {
  const date = calendarDate(day);
  const topics = await prisma.syllabusTopic.findMany({
    where: {
      status: "ONGOING",
      // Parent topics follow their subtopics, so only the leaves count.
      subtopics: { none: {} },
      syllabus: {
        isActive: true,
        ...(semesterId && { semesterId }),
        semester: { status: "ACTIVE", startDate: { lte: date }, endDate: { gte: date } },
      },
    },
    select: {
      updatedAt: true,
      progressLogs: { orderBy: { createdAt: "desc" }, take: 1, select: { createdAt: true } },
      syllabus: {
        select: {
          id: true,
          semesterId: true,
          semesterLevelId: true,
          semesterLevel: { select: { academicLevel: { select: { name: true } } } },
          semester: { select: { id: true, centerId: true, center: { select: { name: true, projectId: true } } } },
        },
      },
    },
  });

  const levels = new Map<string, BehindLevel>();
  for (const topic of topics) {
    const lastUpdate = topic.progressLogs[0]?.createdAt ?? topic.updatedAt;
    const days = (date.getTime() - calendarDate(indiaToday(lastUpdate)).getTime()) / DAY_MS;
    if (days < CURRICULUM_STALE_DAYS) continue;
    const { syllabus } = topic;
    const level = levels.get(syllabus.semesterLevelId) ?? {
      semesterLevelId: syllabus.semesterLevelId,
      semesterId: syllabus.semesterId,
      name: syllabus.semesterLevel.academicLevel.name,
      syllabusIds: new Set<string>(),
      days,
      semester: syllabus.semester,
    };
    level.syllabusIds.add(syllabus.id);
    level.days = Math.min(level.days, days);
    levels.set(syllabus.semesterLevelId, level);
  }
  return [...levels.values()];
};

// Educators per level and centre managers per semester, for the levels behind.
const curriculumTeams = async (levels: BehindLevel[]) => {
  const assignments = levels.length
    ? await prisma.userRoleAssignments.findMany({
        where: {
          isActive: true,
          OR: [
            { subRole: "EDUCATOR", semesterLevelId: { in: levels.map((level) => level.semesterLevelId) } },
            { subRole: "CENTER_MANAGER", semesterId: { in: [...new Set(levels.map((level) => level.semesterId))] } },
          ],
        },
        select: { userId: true, subRole: true, semesterId: true, semesterLevelId: true },
      })
    : [];
  const educators = (level: BehindLevel) =>
    assignments
      .filter((assignment) => assignment.subRole === "EDUCATOR" && assignment.semesterLevelId === level.semesterLevelId)
      .map((assignment) => assignment.userId);
  const managers = (semesterId: string) =>
    assignments
      .filter((assignment) => assignment.subRole === "CENTER_MANAGER" && assignment.semesterId === semesterId)
      .map((assignment) => assignment.userId);
  // A level goes to the centre manager a week late, or straight away with no educator.
  const escalated = (level: BehindLevel) => level.days >= CURRICULUM_ESCALATE_DAYS || educators(level).length === 0;
  return { educators, managers, escalated };
};

// Saturdays: a to-do per level behind for its educators, and one per centre for
// the centre manager once a level is a week further behind. Each replaces last
// week's and lasts until the next Saturday's check, or until the work is done.
export const sendCurriculumReminders = async (day: string) => {
  const levels = await levelsBehind(day);
  if (levels.length === 0) return;
  const team = await curriculumTeams(levels);
  const semesters = new Map(levels.map((level) => [level.semesterId, level.semester]));
  await prisma.notification.deleteMany({
    where: { key: { in: [...levels.map((level) => levelKey(level.semesterLevelId)), ...[...semesters.keys()].map(centreKey)] } },
  });
  const expiresAt = new Date(endOfIndiaDay(day).getTime() + 7 * DAY_MS);

  for (const level of levels) {
    const syllabusLink = `${semesterLink(level.semester)}/syllabus`;
    const [onlySyllabus] = level.syllabusIds;
    await notifyUsers(team.educators(level), {
      title: "Update curriculum progress",
      body: `${level.name}: not updated for ${weekendsSince(level.days)} weekends.`,
      href: level.syllabusIds.size === 1 ? `${syllabusLink}/${onlySyllabus}/progress` : syllabusLink,
      actionLabel: "Update progress",
      kind: "TASK",
      key: levelKey(level.semesterLevelId),
      expiresAt,
    });
  }

  for (const [semesterId, semester] of semesters) {
    const behind = levels.filter((level) => level.semesterId === semesterId && team.escalated(level));
    if (behind.length === 0) continue;
    const weekends = weekendsSince(Math.min(...behind.map((level) => level.days)));
    await notifyUsers(team.managers(semesterId), {
      title: "Curriculum progress is behind",
      body: `${semester.center.name}: ${behind.map((level) => level.name).join(", ")} not updated for ${weekends} weekends.`,
      href: `${semesterLink(semester)}/syllabus`,
      actionLabel: "Check progress",
      kind: "TASK",
      key: centreKey(semesterId),
      expiresAt,
    });
  }
};

// After progress is saved: clear the level's to-do once nothing in it is
// behind, and the centre manager's once no level needs them.
export const resolveCurriculumReminders = async (semesterId: string, semesterLevelId: string) => {
  const keys = { level: levelKey(semesterLevelId), centre: centreKey(semesterId) };
  const open = await prisma.notification.count({ where: { key: { in: [keys.level, keys.centre] } } });
  if (open === 0) return;
  const levels = await levelsBehind(indiaToday(), semesterId);
  const team = await curriculumTeams(levels);
  const done = [
    ...(levels.some((level) => level.semesterLevelId === semesterLevelId) ? [] : [keys.level]),
    ...(levels.some(team.escalated) ? [] : [keys.centre]),
  ];
  if (done.length) await prisma.notification.deleteMany({ where: { key: { in: done } } });
};

export const resolveCurriculumRemindersInBackground = (semesterId: string, semesterLevelId: string) => {
  void resolveCurriculumReminders(semesterId, semesterLevelId).catch((error) =>
    console.error("Clearing reminders failed:", (error as Error).message),
  );
};

// Student details: the same checks as the Students page's "Needs details" tab
// (client/src/lib/student-profile.ts); keep the two lists together. A check
// passes when any of its fields is filled: one parent is enough.
export const STUDENT_DETAIL_CHECKS = [
  ["profileImageUrl"],
  ["dob"],
  ["phoneNumber"],
  ["address"],
  ["schoolName"],
  ["fatherName", "motherName"],
  ["fatherOccupation", "motherOccupation"],
  ["familyIncome"],
  ["futureProfession"],
] as const;

const isEmpty = (field: string) => ({ OR: field === "dob" ? [{ dob: null }] : [{ [field]: null }, { [field]: "" }] });
// A student needs details when every field of some check is empty.
const missingDetails = {
  OR: STUDENT_DETAIL_CHECKS.map((fields) => ({ AND: fields.map(isEmpty) })),
};
const detailsKey = (semesterId: string) => `student-details:${semesterId}`;

const studentsNeedingDetails = (semesterId: string) =>
  prisma.students.count({ where: { enrollments: { some: { semesterId, isActive: true } }, ...missingDetails } });

const detailsBody = (centreName: string, count: number) =>
  `${centreName}: ${count} ${count === 1 ? "student needs" : "students need"} details.`;

// Sundays, while students are in class to ask: a to-do for the centre managers
// of each semester with students missing details. Replaced each Sunday; cleared
// once every student's details are complete.
export const sendStudentDetailsReminders = async (day: string) => {
  const semesters = await prisma.semesters.findMany({ where: runningOn(calendarDate(day)), select: semesterSelect });
  if (semesters.length === 0) return;
  await prisma.notification.deleteMany({ where: { key: { in: semesters.map((semester) => detailsKey(semester.id)) } } });
  const managers = await managersBySemester(semesters.map((semester) => semester.id));
  const expiresAt = untilNextWeek(day);

  for (const semester of semesters) {
    const count = await studentsNeedingDetails(semester.id);
    if (count === 0) continue;
    await notifyUsers(
      managers(semester.id),
      {
        title: "Complete student details",
        body: detailsBody(semester.center.name, count),
        href: `${semesterLink(semester)}/students?view=incomplete`,
        actionLabel: "Complete details",
        kind: "TASK",
        key: detailsKey(semester.id),
        expiresAt,
      },
    );
  }
};

// After a student is saved: clear the to-do once nobody is missing details,
// otherwise keep its count current.
export const resolveStudentDetailsReminders = async (studentId: string) => {
  const enrollments = await prisma.studentEnrollments.findMany({
    where: { studentId, isActive: true },
    select: { semesterId: true, semester: { select: { center: { select: { name: true } } } } },
  });
  for (const { semesterId, semester } of enrollments) {
    const key = detailsKey(semesterId);
    if ((await prisma.notification.count({ where: { key } })) === 0) continue;
    const count = await studentsNeedingDetails(semesterId);
    await updateOrClearTask(key, count, detailsBody(semester.center.name, count));
  }
};

export const resolveStudentDetailsRemindersInBackground = (studentId: string) =>
  inBackground(resolveStudentDetailsReminders(studentId));

// Exam scores: centre managers enter marks, so they get a to-do on Saturdays
// for each past exam with students still without a score.
const examKey = (examId: string) => `exam-scores:${examId}`;
const examSelect = {
  id: true,
  name: true,
  semesterId: true,
  semesterLevelId: true,
  examDate: true,
  semesterLevel: { select: { academicLevel: { select: { name: true } } } },
} as const;
type ExamForScores = {
  id: string;
  name: string;
  semesterId: string;
  semesterLevelId: string;
  examDate: Date;
  semesterLevel: { academicLevel: { name: string } };
};

// Students in the exam's level who had joined by the end of the exam day and
// have no score yet. An absent mark counts as a score.
const studentsWithoutScores = (exam: ExamForScores) =>
  prisma.studentEnrollments.count({
    where: {
      semesterId: exam.semesterId,
      semesterLevelId: exam.semesterLevelId,
      isActive: true,
      enrolledAt: { lt: endOfIndiaDay(exam.examDate.toISOString().slice(0, 10)) },
      student: { examScores: { none: { examId: exam.id } } },
    },
  });

const examBody = (exam: ExamForScores, count: number) =>
  `${exam.name} (${exam.semesterLevel.academicLevel.name}): ${plural(count, "student", "students")} without scores.`;

export const sendExamScoreReminders = async (day: string) => {
  const date = calendarDate(day);
  const exams = await prisma.exam.findMany({
    where: { isActive: true, examDate: { lt: date }, semester: runningOn(date) },
    select: { ...examSelect, semester: { select: semesterSelect } },
  });
  if (exams.length === 0) return;
  await prisma.notification.deleteMany({ where: { key: { in: exams.map((exam) => examKey(exam.id)) } } });
  const managers = await managersBySemester(exams.map((exam) => exam.semesterId));
  const expiresAt = untilNextWeek(day);

  for (const exam of exams) {
    const count = await studentsWithoutScores(exam);
    if (count === 0) continue;
    await notifyUsers(managers(exam.semesterId), {
      title: "Enter exam scores",
      body: examBody(exam, count),
      href: `${semesterLink(exam.semester)}/exams/${exam.id}/scores`,
      actionLabel: "Enter scores",
      kind: "TASK",
      key: examKey(exam.id),
      expiresAt,
    });
  }
};

export const resolveExamScoreReminders = async (examId: string) => {
  const key = examKey(examId);
  if ((await prisma.notification.count({ where: { key } })) === 0) return;
  const exam = await prisma.exam.findUnique({ where: { id: examId }, select: examSelect });
  if (!exam) return;
  const count = await studentsWithoutScores(exam);
  await updateOrClearTask(key, count, examBody(exam, count));
};

export const resolveExamScoreRemindersInBackground = (examId: string) => inBackground(resolveExamScoreReminders(examId));

// Pay rates: a person with a present day that no pay rate covers shows as
// Incomplete on the Remuneration page. Admins get a to-do per person on
// Saturdays, pointing at the person's role, where the rate is set.
const payRateKey = (semesterId: string, userId: string) => `pay-rate:${semesterId}:${userId}`;

const peopleWithoutRates = async (semesterId: string) => {
  const [present, periods] = await Promise.all([
    prisma.userAttendance.findMany({
      where: {
        semesterId,
        status: "PRESENT",
        roleAssignment: { is: { subRole: { in: ["EDUCATOR", "CENTER_MANAGER"] } } },
      },
      select: { userId: true, date: true, user: { select: { name: true } } },
    }),
    prisma.semesterRemunerationPeriod.findMany({
      where: { semesterId },
      select: { userId: true, effectiveFrom: true, effectiveTo: true },
    }),
  ]);
  const covered = (record: { userId: string; date: Date }) =>
    periods.some(
      (period) =>
        period.userId === record.userId &&
        period.effectiveFrom <= record.date &&
        (period.effectiveTo === null || period.effectiveTo >= record.date),
    );
  return [...new Map(present.filter((record) => !covered(record)).map((record) => [record.userId, record.user.name])).entries()].map(
    ([userId, name]) => ({ userId, name }),
  );
};

export const sendPayRateReminders = async (day: string) => {
  const semesters = await prisma.semesters.findMany({ where: runningOn(calendarDate(day)), select: semesterSelect });
  // Last week's are replaced, including any for semesters no longer running.
  await prisma.notification.deleteMany({ where: { key: { startsWith: "pay-rate:" } } });
  if (semesters.length === 0) return;
  const admins = await prisma.user.findMany({ where: { role: "ADMIN", status: "APPROVED" }, select: { id: true } });
  const expiresAt = untilNextWeek(day);

  for (const semester of semesters) {
    for (const person of await peopleWithoutRates(semester.id)) {
      await notifyUsers(
        admins.map((admin) => admin.id),
        {
          title: "Pay rate missing",
          body: `${person.name} has no pay rate at ${semester.center.name}.`,
          pushBody: `Someone at ${semester.center.name} has no pay rate.`,
          href: `/users/${person.userId}/edit`,
          actionLabel: "Set rate",
          kind: "TASK",
          key: payRateKey(semester.id, person.userId),
          expiresAt,
        },
      );
    }
  }
};

// After a rate is saved: clear the to-dos of everyone in the semester who is now covered.
export const resolvePayRateReminders = async (semesterId: string) => {
  const prefix = `pay-rate:${semesterId}:`;
  if ((await prisma.notification.count({ where: { key: { startsWith: prefix } } })) === 0) return;
  const stillMissing = (await peopleWithoutRates(semesterId)).map((person) => payRateKey(semesterId, person.userId));
  await prisma.notification.deleteMany({ where: { key: { startsWith: prefix, notIn: stillMissing } } });
};

export const resolvePayRateRemindersInBackground = (semesterId: string) =>
  inBackground(resolvePayRateReminders(semesterId));

// Missed classes: a student absent on every marked day of their last three
// marked weekends. Holidays and unmarked weekends don't count either way.
const MISSED_WEEKENDS = 3;

// The Saturday of a class day's weekend.
const weekendOf = (date: Date) =>
  (date.getUTCDay() === 0 ? new Date(date.getTime() - DAY_MS) : date).toISOString().slice(0, 10);

// The streak has to end on lastWeekend and be exactly MISSED_WEEKENDS long, so
// each streak is reported once, by the check right after it forms.
export const studentsMissingClasses = (
  records: Array<{ studentId: string; date: Date; status: string }>,
  lastWeekend: string,
) => {
  const attendedByStudent = new Map<string, Map<string, boolean>>();
  for (const record of records) {
    if (record.status === "HOLIDAY") continue;
    const attended = attendedByStudent.get(record.studentId) ?? new Map<string, boolean>();
    const weekend = weekendOf(record.date);
    attended.set(weekend, attended.get(weekend) === true || record.status === "PRESENT");
    attendedByStudent.set(record.studentId, attended);
  }
  return [...attendedByStudent]
    .filter(([, attended]) => {
      const recent = [...attended]
        .filter(([weekend]) => weekend <= lastWeekend)
        .sort(([a], [b]) => b.localeCompare(a))
        .slice(0, MISSED_WEEKENDS + 1);
      return (
        recent[0]?.[0] === lastWeekend &&
        recent.length >= MISSED_WEEKENDS &&
        recent.slice(0, MISSED_WEEKENDS).every(([, wasThere]) => !wasThere) &&
        recent[MISSED_WEEKENDS]?.[1] !== false
      );
    })
    .map(([studentId]) => studentId);
};

// Sundays: an update for centre managers (every student) and educators (their
// level's students). Names stay off the lock screen.
export const sendMissedClassReminders = async (day: string) => {
  const date = calendarDate(day);
  const lastWeekend = new Date(date.getTime() - 8 * DAY_MS).toISOString().slice(0, 10);
  const semesters = await prisma.semesters.findMany({ where: runningOn(date), select: semesterSelect });

  for (const semester of semesters) {
    const records = await prisma.studentAttendance.findMany({
      where: {
        semesterId: semester.id,
        date: { gte: new Date(date.getTime() - 56 * DAY_MS), lte: new Date(date.getTime() - 7 * DAY_MS) },
        enrollment: { isActive: true },
      },
      select: {
        studentId: true,
        date: true,
        status: true,
        student: { select: { name: true } },
        enrollment: { select: { semesterLevelId: true } },
      },
    });
    const missing = new Set(studentsMissingClasses(records, lastWeekend));
    if (missing.size === 0) continue;
    const students = [
      ...new Map(
        records
          .filter((record) => missing.has(record.studentId))
          .map((record) => [record.studentId, { name: record.student.name, levelId: record.enrollment.semesterLevelId }]),
      ).values(),
    ];
    const team = await prisma.userRoleAssignments.findMany({
      where: { semesterId: semester.id, isActive: true, subRole: { in: ["EDUCATOR", "CENTER_MANAGER"] } },
      select: { userId: true, subRole: true, semesterLevelId: true },
    });
    const namesByUser = new Map<string, Set<string>>();
    for (const member of team) {
      const names = namesByUser.get(member.userId) ?? new Set<string>();
      for (const student of students) {
        if (member.subRole === "CENTER_MANAGER" || student.levelId === member.semesterLevelId) names.add(student.name);
      }
      namesByUser.set(member.userId, names);
    }
    const usersByList = new Map<string, string[]>();
    for (const [userId, names] of namesByUser) {
      if (names.size === 0) continue;
      const list = [...names].sort().join("\n");
      usersByList.set(list, [...(usersByList.get(list) ?? []), userId]);
    }
    for (const [list, userIds] of usersByList) {
      const names = list.split("\n");
      const missed = `missed ${MISSED_WEEKENDS} weekends in a row.`;
      await notifyUsers(userIds, {
        title: "Missing class",
        body: `${semester.center.name}: ${listNames(names)} ${missed}`,
        pushBody: `${semester.center.name}: ${plural(names.length, "student", "students")} ${missed}`,
        href: `${semesterLink(semester)}/students`,
      });
    }
  }
};

// Birthdays: on Saturday, the week's birthdays (Saturday to Friday) for the
// semester's team. Educators see their level's students; everyone sees staff.
const isLeapYear = (year: number) => year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);

// Month-day → its day name and place in the week.
export const birthdayWeek = (day: string) => {
  const week = new Map<string, { dayName: string; order: number }>();
  for (let order = 0; order < 7; order++) {
    const date = new Date(calendarDate(day).getTime() + order * DAY_MS);
    const entry = { dayName: new Intl.DateTimeFormat("en-IN", { weekday: "short", timeZone: "UTC" }).format(date), order };
    const monthDay = date.toISOString().slice(5, 10);
    week.set(monthDay, entry);
    // 29 February birthdays are on the 28th outside leap years.
    if (monthDay === "02-28" && !isLeapYear(date.getUTCFullYear())) week.set("02-29", entry);
  }
  return week;
};

export const sendBirthdayReminders = async (day: string) => {
  const week = birthdayWeek(day);
  const birthday = (dob: Date | null) => (dob ? week.get(dob.toISOString().slice(5, 10)) : undefined);
  const semesters = await prisma.semesters.findMany({ where: runningOn(calendarDate(day)), select: semesterSelect });

  for (const semester of semesters) {
    const [enrollments, team] = await Promise.all([
      prisma.studentEnrollments.findMany({
        where: { semesterId: semester.id, isActive: true, student: { dob: { not: null } } },
        select: { semesterLevelId: true, student: { select: { name: true, dob: true } } },
      }),
      prisma.userRoleAssignments.findMany({
        where: { semesterId: semester.id, isActive: true, subRole: { in: ["EDUCATOR", "CENTER_MANAGER"] } },
        select: { userId: true, subRole: true, semesterLevelId: true, user: { select: { name: true, dob: true } } },
      }),
    ]);
    type Birthday = { name: string; dayName: string; order: number; levelId?: string; userId?: string };
    const students: Birthday[] = enrollments.flatMap(({ student, semesterLevelId }) => {
      const when = birthday(student.dob);
      return when ? [{ name: student.name, ...when, levelId: semesterLevelId }] : [];
    });
    const staff: Birthday[] = [
      ...new Map(
        team.flatMap(({ userId, user }) => {
          const when = birthday(user.dob);
          return when ? [[userId, { name: user.name, ...when, userId }] as const] : [];
        }),
      ).values(),
    ];
    if (students.length === 0 && staff.length === 0) continue;

    const listByUser = new Map<string, Birthday[]>();
    for (const member of team) {
      const seen = listByUser.get(member.userId) ?? [];
      const visible = [
        ...students.filter((student) => member.subRole === "CENTER_MANAGER" || student.levelId === member.semesterLevelId),
        // Nobody is told about their own birthday.
        ...staff.filter((person) => person.userId !== member.userId),
      ];
      listByUser.set(member.userId, [...new Set([...seen, ...visible])]);
    }
    const usersByBody = new Map<string, { userIds: string[]; count: number }>();
    for (const [userId, birthdays] of listByUser) {
      if (birthdays.length === 0) continue;
      const sorted = [...birthdays].sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));
      const body = listNames(sorted.map((person) => `${person.name} (${person.dayName})`));
      const group = usersByBody.get(body) ?? { userIds: [], count: sorted.length };
      group.userIds.push(userId);
      usersByBody.set(body, group);
    }
    for (const [body, { userIds, count }] of usersByBody) {
      await notifyUsers(userIds, {
        title: "Birthdays this week",
        body,
        pushBody: `${plural(count, "birthday", "birthdays")} at ${semester.center.name} this week.`,
        href: semesterLink(semester),
      });
    }
  }
};

// Sign-ups waiting for review: the to-do is sent when someone registers. This
// check adds it for requests that came in without one (before notifications,
// or when sending failed) and removes it for people no longer waiting.
export const sendRegistrationReminders = async () => {
  const waiting = await prisma.user.findMany({ where: { status: "PENDING" }, select: { id: true, name: true } });
  await prisma.notification.deleteMany({
    where: {
      OR: [
        { key: { startsWith: "registration:", notIn: waiting.map((applicant) => registrationKey(applicant.id)) } },
        // shortcut: removes the unnamed notices test runs created before 2.6.0; drop this line after a release or two.
        { title: "New registration request", key: null },
      ],
    },
  });
  if (waiting.length === 0) return;
  const admins = await prisma.user.findMany({ where: { role: "ADMIN", status: "APPROVED" }, select: { id: true } });
  for (const applicant of waiting) {
    // Admins who already have it are skipped.
    await notifyUsers(admins.map((admin) => admin.id), registrationRequestMessage(applicant));
  }
};

// Housekeeping rides on the weekend reminder run, so it adds no database
// wake-ups. Dismissed updates and finished to-dos are deleted straight away;
// this clears expired to-dos, updates older than KEEP_NOTIFICATIONS_DAYS, and
// the record of old reminder runs. A to-do with no expiry stays until done.
export const cleanUpNotifications = async (now: Date) => {
  const cutoff = new Date(now.getTime() - KEEP_NOTIFICATIONS_DAYS * DAY_MS);
  await prisma.notification.deleteMany({
    where: { OR: [{ expiresAt: { lt: now } }, { kind: "UPDATE", createdAt: { lt: cutoff } }] },
  });
  await prisma.reminderRun.deleteMany({ where: { createdAt: { lt: cutoff } } });
};

let handledKey: string | null = null;
let running = false;

// Called on every /health ping. Sends each day's reminders once: the
// ReminderRun row stops a repeat after a restart.
export const runDueReminders = async (now: Date = new Date()) => {
  const key = dueReminderKey(now);
  if (!key || key === handledKey || running) return;
  running = true;
  // One attempt per day: retrying a failure on every ping would keep Neon awake.
  handledKey = key;
  try {
    const claimed = await prisma.reminderRun.createMany({ data: [{ key }], skipDuplicates: true });
    if (claimed.count === 0) return;
    // shortcut: a failed run skips that day's reminders; add a retry if it happens in practice.
    const day = key.slice("reminders:".length);
    const senders =
      calendarDate(day).getUTCDay() === 6
        ? [sendAttendanceReminders, sendCurriculumReminders, sendExamScoreReminders, sendPayRateReminders, sendBirthdayReminders, sendRegistrationReminders]
        : [sendAttendanceReminders, sendStudentDetailsReminders, sendMissedClassReminders, sendRegistrationReminders];
    // Each runs on its own: one failing doesn't stop the rest.
    for (const send of senders) {
      try {
        await send(day);
      } catch (error) {
        console.error(`${send.name} failed:`, (error as Error).message);
      }
    }
    await cleanUpNotifications(now);
  } catch (error) {
    console.error("Reminders failed:", (error as Error).message);
  } finally {
    running = false;
  }
};
