import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { prisma } from "../../lib/prisma.js";
import { notifyRemunerationPaidInBackground } from "../../service/expense.service.js";
import { notifyUsers, registrationRequestMessage } from "../../service/notification.service.js";
import { dismissNotifications, newRoleMessage, parsePushSubscription } from "../../service/notification.service.js";
import {
  dueReminderKey,
  endOfIndiaDay,
  resolveAttendanceReminders,
  resolveCurriculumReminders,
  resolveStudentDetailsReminders,
  runDueReminders,
  sendAttendanceReminders,
  sendCurriculumReminders,
  sendStudentDetailsReminders,
  STUDENT_DETAIL_CHECKS,
  birthdayWeek,
  cleanUpNotifications,
  sendRegistrationReminders,
  resolveExamScoreReminders,
  resolvePayRateReminders,
  sendBirthdayReminders,
  sendExamScoreReminders,
  sendMissedClassReminders,
  sendPayRateReminders,
  studentsMissingClasses,
} from "../../service/reminder.service.js";

// Importing Prisma loads the real .env (and push keys): no test may reach the
// database, so the push lookup that follows every saved notification is stubbed.
(prisma as any).pushSubscription.findMany = async () => [];
// Nobody has a keyed notification yet unless a test says otherwise.
(prisma as any).notification.findMany = async () => [];

// Swaps prisma methods for the length of one test.
const stub = (methods: Record<string, (...args: any[]) => unknown>) => {
  const db = prisma as any;
  const originals = Object.keys(methods).map((path) => {
    const [model, method] = path.split(".");
    const original = db[model][method];
    db[model][method] = methods[path];
    return () => (db[model][method] = original);
  });
  return () => originals.forEach((restore) => restore());
};

type Sent = { userId: string; title: string; body: string; href: string; kind?: string; key?: string; actionLabel?: string; expiresAt?: Date };
const capture = (sent: Sent[]) => async ({ data }: { data: Sent[] }) => {
  sent.push(...data);
  return { count: data.length };
};

const keys = { p256dh: "BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlUls0VJXg7A8u-Ts1XbjhazAkj7I99e8QcYP7DkM", auth: "tBHItJI5svbpez7KI4CCXg" };

test("push subscriptions are accepted only for real push services", () => {
  assert.deepEqual(parsePushSubscription({ endpoint: "https://fcm.googleapis.com/fcm/send/abc", keys }), {
    endpoint: "https://fcm.googleapis.com/fcm/send/abc",
    ...keys,
  });
  assert.ok(parsePushSubscription({ endpoint: "https://web.push.apple.com/QG", keys }));
  for (const endpoint of [
    "http://fcm.googleapis.com/fcm/send/abc",
    "https://example.com/push",
    "https://fcm.googleapis.com.evil.example/push",
    "https://localhost/push",
    "not a url",
  ]) {
    assert.equal(parsePushSubscription({ endpoint, keys }), null, endpoint);
  }
  assert.equal(parsePushSubscription({ endpoint: "https://fcm.googleapis.com/x", keys: { p256dh: "a b", auth: keys.auth } }), null);
  assert.equal(parsePushSubscription({ endpoint: "https://fcm.googleapis.com/x" }), null);
  assert.equal(parsePushSubscription(null), null);
});

test("a new role names its place; several roles are summed up", () => {
  const role = {
    subRole: "EDUCATOR" as const,
    projectId: "p",
    centerId: "c",
    semesterId: "s",
    center: { name: "Tulip" },
    semester: { name: "Semester 2026-27" },
  };
  assert.deepEqual(newRoleMessage([role]), {
    title: "New role at Tulip",
    body: "Educator in Semester 2026-27",
    href: "/projects/p/centers/c/semesters/s/dashboard",
  });
  assert.equal(newRoleMessage([role, role])?.title, "You have new roles");
  assert.equal(newRoleMessage([]), null);
});

test("attendance reminders are due Saturday 6 pm and Sunday 10 am in India, and expire at midnight", () => {
  // Saturday 31 Oct 2026; 12:30 UTC is 6 pm in India.
  assert.equal(dueReminderKey(new Date("2026-10-31T12:30:00Z")), "reminders:2026-10-31");
  assert.equal(dueReminderKey(new Date("2026-10-31T12:29:00Z")), null);
  // Late Saturday UTC is already early Sunday in India: not due yet.
  assert.equal(dueReminderKey(new Date("2026-10-31T20:00:00Z")), null);
  // Sunday 1 Nov; 04:30 UTC is 10 am in India.
  assert.equal(dueReminderKey(new Date("2026-11-01T04:30:00Z")), "reminders:2026-11-01");
  assert.equal(dueReminderKey(new Date("2026-11-01T04:29:00Z")), null);
  // Monday in India.
  assert.equal(dueReminderKey(new Date("2026-11-02T08:00:00Z")), null);
  // Midnight in India at the end of Saturday.
  assert.equal(endOfIndiaDay("2026-10-31").toISOString(), "2026-10-31T18:30:00.000Z");
});

// Saturday: level-1 marked, level-2 not; educator-1 marked as staff,
// educator-2 not, educator-3 only works Sundays.
const mockSemesterDay = () => {
  const db = prisma as any;
  const originals = {
    semesters: db.semesters.findMany,
    enrollments: db.studentEnrollments.findMany,
    studentAttendance: db.studentAttendance.findMany,
    assignments: db.userRoleAssignments.findMany,
    userAttendance: db.userAttendance.findMany,
  };
  db.semesters.findMany = async () => [{ id: "s", centerId: "c", center: { name: "Tulip", projectId: "p" } }];
  db.studentEnrollments.findMany = async () => [{ semesterLevelId: "level-1" }, { semesterLevelId: "level-2" }];
  db.studentAttendance.findMany = async () => [{ enrollment: { semesterLevelId: "level-1" } }];
  db.userRoleAssignments.findMany = async () => [
    { userId: "educator-1", subRole: "EDUCATOR", semesterLevelId: "level-1", committedDays: "BOTH" },
    { userId: "educator-2", subRole: "EDUCATOR", semesterLevelId: "level-2", committedDays: "BOTH" },
    { userId: "educator-3", subRole: "EDUCATOR", semesterLevelId: "level-1", committedDays: "SUNDAY" },
    { userId: "manager", subRole: "CENTER_MANAGER", semesterLevelId: null, committedDays: "BOTH" },
  ];
  db.userAttendance.findMany = async () => [{ userId: "educator-1" }, { userId: "manager" }];
  return () => {
    db.semesters.findMany = originals.semesters;
    db.studentEnrollments.findMany = originals.enrollments;
    db.studentAttendance.findMany = originals.studentAttendance;
    db.userRoleAssignments.findMany = originals.assignments;
    db.userAttendance.findMany = originals.userAttendance;
  };
};

test("reminders are to-dos for educators of unmarked levels and centre managers, gone at midnight", async () => {
  const db = prisma as any;
  const restore = mockSemesterDay();
  const originalCreate = db.notification.createMany;
  const sent: Array<{ userId: string; title: string; body: string; href: string | null; kind: string; key: string; actionLabel: string; expiresAt: Date }> = [];
  db.notification.createMany = async ({ data }: { data: typeof sent }) => {
    sent.push(...data);
    return { count: data.length };
  };

  try {
    await sendAttendanceReminders("2026-10-31");
    const student = sent.filter((item) => item.title === "Mark student attendance");
    const staff = sent.filter((item) => item.title === "Mark staff attendance");
    assert.deepEqual(student.map((item) => item.userId).sort(), ["educator-2", "manager"]);
    assert.equal(student[0].href, "/projects/p/centers/c/semesters/s/dashboard/student-attendance/mark");
    assert.equal(student[0].key, "attendance-students:s:2026-10-31");
    assert.equal(student[0].actionLabel, "Mark attendance");
    assert.deepEqual(staff.map((item) => item.userId), ["manager"]);
    assert.equal(staff[0].body, "Tulip: not marked yet today.");
    for (const item of sent) {
      assert.equal(item.kind, "TASK");
      assert.equal(item.expiresAt.toISOString(), "2026-10-31T18:30:00.000Z");
    }
  } finally {
    restore();
    db.notification.createMany = originalCreate;
  }
});

test("saving attendance clears the to-dos of people with nothing left to mark", async () => {
  const db = prisma as any;
  const restore = mockSemesterDay();
  const originals = { count: db.notification.count, deleteMany: db.notification.deleteMany };
  let openReminders = 0;
  let cleared: unknown = null;
  db.notification.count = async () => openReminders;
  db.notification.deleteMany = async (args: unknown) => {
    cleared = args;
    return { count: 1 };
  };

  try {
    // No reminders that day: nothing else is read.
    await resolveAttendanceReminders("s", "2026-10-31");
    assert.equal(cleared, null);

    openReminders = 3;
    await resolveAttendanceReminders("s", "2026-10-31");
    assert.deepEqual(cleared, {
      where: {
        OR: [
          { key: "attendance-students:s:2026-10-31", userId: { notIn: ["educator-2", "manager"] } },
          // educator-2 is still unmarked, so the manager keeps the staff to-do.
          { key: "attendance-staff:s:2026-10-31", userId: { notIn: ["manager"] } },
        ],
      },
    });

    // Once educator-2 is marked, the Sunday-only educator doesn't hold it open.
    (prisma as any).userAttendance.findMany = async () => [{ userId: "educator-1" }, { userId: "educator-2" }, { userId: "manager" }];
    await resolveAttendanceReminders("s", "2026-10-31");
    assert.deepEqual((cleared as any).where.OR[1], { key: "attendance-staff:s:2026-10-31", userId: { notIn: [] } });
  } finally {
    restore();
    db.notification.count = originals.count;
    db.notification.deleteMany = originals.deleteMany;
  }
});

test("only updates can be dismissed", async () => {
  const db = prisma as any;
  const original = db.notification.deleteMany;
  const calls: unknown[] = [];
  db.notification.deleteMany = async (args: unknown) => {
    calls.push(args);
    return { count: 1 };
  };
  try {
    await dismissNotifications("u", "n1");
    await dismissNotifications("u");
    assert.deepEqual(calls, [
      { where: { userId: "u", kind: "UPDATE", id: "n1" } },
      { where: { userId: "u", kind: "UPDATE" } },
    ]);
  } finally {
    db.notification.deleteMany = original;
  }
});

test("a day's reminders run once, and pings outside the window never touch the database", async () => {
  const db = prisma as any;
  const originals = { claim: db.reminderRun.createMany, semesters: db.semesters.findMany };
  let claims = 0;
  let semesterQueries = 0;
  db.reminderRun.createMany = async () => {
    claims += 1;
    return { count: 0 }; // already sent, e.g. before a restart
  };
  db.semesters.findMany = async () => {
    semesterQueries += 1;
    return [];
  };

  try {
    await runDueReminders(new Date("2026-11-02T08:00:00Z")); // Monday: not due
    assert.equal(claims, 0);
    await runDueReminders(new Date("2026-11-07T13:00:00Z")); // Saturday 6:30 pm: claim attempted
    await runDueReminders(new Date("2026-11-07T13:05:00Z")); // next ping: remembered
    assert.equal(claims, 1);
    assert.equal(semesterQueries, 0);
  } finally {
    db.reminderRun.createMany = originals.claim;
    db.semesters.findMany = originals.semesters;
  }
});

test("a failing reminder run is not retried on every ping", async () => {
  const db = prisma as any;
  const original = db.reminderRun.createMany;
  let attempts = 0;
  db.reminderRun.createMany = async () => {
    attempts += 1;
    throw new Error('relation "ReminderRun" does not exist');
  };
  const originalError = console.error;
  console.error = () => {};

  try {
    await runDueReminders(new Date("2026-11-14T13:00:00Z")); // Saturday 6:30 pm
    await runDueReminders(new Date("2026-11-14T13:05:00Z"));
    await runDueReminders(new Date("2026-11-14T13:10:00Z"));
    assert.equal(attempts, 1);
  } finally {
    db.reminderRun.createMany = original;
    console.error = originalError;
  }
});

// Saturday 31 Oct: Level 1 last moved Sun 18 Oct (13 days, 2 weekends);
// Level 2 on Mon 12 Oct (19 days, 3 weekends); Level 3 on Sun 25 Oct (fine).
const semester = { id: "s", centerId: "c", center: { name: "Tulip", projectId: "p" } };
const topic = (level: string, name: string, syllabusId: string, lastUpdate: string) => ({
  updatedAt: new Date("2026-09-01T00:00:00Z"),
  progressLogs: [{ createdAt: new Date(lastUpdate) }],
  syllabus: {
    id: syllabusId,
    semesterId: "s",
    semesterLevelId: level,
    semesterLevel: { academicLevel: { name } },
    semester,
  },
});

const mockCurriculum = (topics: unknown[]) => {
  const db = prisma as any;
  const originals = {
    topics: db.syllabusTopic.findMany,
    assignments: db.userRoleAssignments.findMany,
    count: db.notification.count,
    deleteMany: db.notification.deleteMany,
    createMany: db.notification.createMany,
  };
  const sent: Array<{ userId: string; title: string; body: string; href: string; kind: string; key: string; actionLabel: string; expiresAt: Date }> = [];
  const deleted: unknown[] = [];
  db.syllabusTopic.findMany = async () => topics;
  db.userRoleAssignments.findMany = async () => [
    { userId: "educator-1", subRole: "EDUCATOR", semesterId: "s", semesterLevelId: "level-1" },
    { userId: "educator-2", subRole: "EDUCATOR", semesterId: "s", semesterLevelId: "level-2" },
    { userId: "manager", subRole: "CENTER_MANAGER", semesterId: "s", semesterLevelId: null },
  ];
  db.notification.count = async () => 2;
  db.notification.deleteMany = async (args: unknown) => {
    deleted.push(args);
    return { count: 1 };
  };
  db.notification.createMany = async ({ data }: { data: typeof sent }) => {
    sent.push(...data);
    return { count: data.length };
  };
  const restore = () => {
    db.syllabusTopic.findMany = originals.topics;
    db.userRoleAssignments.findMany = originals.assignments;
    db.notification.count = originals.count;
    db.notification.deleteMany = originals.deleteMany;
    db.notification.createMany = originals.createMany;
  };
  return { sent, deleted, restore };
};

test("curriculum: educators hear after 2 weekends, the centre manager a week later", async () => {
  const { sent, deleted, restore } = mockCurriculum([
    topic("level-1", "Level 1", "syllabus-1", "2026-10-18T06:00:00Z"),
    topic("level-2", "Level 2", "syllabus-2", "2026-10-12T06:00:00Z"),
    topic("level-2", "Level 2", "syllabus-3", "2026-10-10T06:00:00Z"),
    topic("level-3", "Level 3", "syllabus-4", "2026-10-25T06:00:00Z"),
  ]);
  try {
    await sendCurriculumReminders("2026-10-31");
    const byUser = Object.fromEntries(sent.map((item) => [item.userId, item]));
    assert.equal(byUser["educator-1"].body, "Level 1: not updated for 2 weekends.");
    assert.equal(byUser["educator-1"].href, "/projects/p/centers/c/semesters/s/dashboard/syllabus/syllabus-1/progress");
    assert.equal(byUser["educator-2"].body, "Level 2: not updated for 3 weekends.");
    // Two syllabi for the level: the list, not one syllabus.
    assert.equal(byUser["educator-2"].href, "/projects/p/centers/c/semesters/s/dashboard/syllabus");
    assert.equal(byUser.manager.body, "Tulip: Level 2 not updated for 3 weekends.");
    assert.equal(byUser["educator-1"].actionLabel, "Update progress");
    assert.equal(byUser.manager.actionLabel, "Check progress");
    assert.equal(sent.length, 3);
    for (const item of sent) {
      assert.equal(item.kind, "TASK");
      // Lasts until the night after next Saturday's check.
      assert.equal(item.expiresAt.toISOString(), "2026-11-07T18:30:00.000Z");
    }
    // Last week's to-dos are replaced, not stacked.
    assert.deepEqual(deleted, [
      { where: { key: { in: ["curriculum:level-1", "curriculum:level-2", "curriculum-centre:s"] } } },
    ]);
  } finally {
    restore();
  }
});

test("curriculum: updating progress clears the to-dos once nothing is behind", async () => {
  const stillBehind = mockCurriculum([topic("level-2", "Level 2", "syllabus-2", "2026-10-01T06:00:00Z")]);
  try {
    // Level 1 is done; Level 2 still holds the centre manager's to-do.
    await resolveCurriculumReminders("s", "level-1");
    assert.deepEqual(stillBehind.deleted, [{ where: { key: { in: ["curriculum:level-1"] } } }]);
  } finally {
    stillBehind.restore();
  }

  const allDone = mockCurriculum([]);
  try {
    await resolveCurriculumReminders("s", "level-2");
    assert.deepEqual(allDone.deleted, [{ where: { key: { in: ["curriculum:level-2", "curriculum-centre:s"] } } }]);
  } finally {
    allDone.restore();
  }
});

test("student details: Sunday to-dos for centre managers, using the Needs details fields", async () => {
  const db = prisma as any;
  const originals = {
    semesters: db.semesters.findMany,
    count: db.students.count,
    assignments: db.userRoleAssignments.findMany,
    deleteMany: db.notification.deleteMany,
    createMany: db.notification.createMany,
  };
  const sent: Array<{ userId: string; title: string; body: string; href: string; kind: string; key: string; actionLabel: string; expiresAt: Date }> = [];
  let missingWhere: unknown = null;
  db.semesters.findMany = async () => [
    { id: "s1", centerId: "c", center: { name: "Tulip", projectId: "p" } },
    { id: "s2", centerId: "c2", center: { name: "Lotus", projectId: "p" } },
  ];
  db.students.count = async ({ where }: { where: { enrollments: { some: { semesterId: string } }; OR: [] } }) => {
    missingWhere = { OR: where.OR };
    return where.enrollments.some.semesterId === "s1" ? 8 : 0;
  };
  db.userRoleAssignments.findMany = async () => [{ userId: "manager", semesterId: "s1" }];
  db.notification.deleteMany = async () => ({ count: 0 });
  db.notification.createMany = async ({ data }: { data: typeof sent }) => {
    sent.push(...data);
    return { count: data.length };
  };

  try {
    await sendStudentDetailsReminders("2026-11-01");
    assert.equal(sent.length, 1);
    assert.equal(sent[0].userId, "manager");
    assert.equal(sent[0].title, "Complete student details");
    assert.equal(sent[0].body, "Tulip: 8 students need details.");
    assert.equal(sent[0].href, "/projects/p/centers/c/semesters/s1/dashboard/students?view=incomplete");
    assert.equal(sent[0].kind, "TASK");
    assert.equal(sent[0].actionLabel, "Complete details");
    assert.equal(sent[0].expiresAt.toISOString(), "2026-11-08T18:30:00.000Z");

    // The same checks the Students page counts as "Needs details".
    const client = readFileSync(new URL("../../../client/src/lib/student-profile.ts", import.meta.url), "utf8");
    const clientChecks = [...client.matchAll(/\[\[([^\]]+)\], "/g)].map((match) => match[1].replace(/[\s"]/g, "").split(","));
    assert.deepEqual(clientChecks, STUDENT_DETAIL_CHECKS.map((fields) => [...fields]));
    // One parent is enough: both names must be empty for it to count as missing.
    assert.deepEqual((missingWhere as { OR: unknown[] }).OR[5], {
      AND: [{ OR: [{ fatherName: null }, { fatherName: "" }] }, { OR: [{ motherName: null }, { motherName: "" }] }],
    });
  } finally {
    db.semesters.findMany = originals.semesters;
    db.students.count = originals.count;
    db.userRoleAssignments.findMany = originals.assignments;
    db.notification.deleteMany = originals.deleteMany;
    db.notification.createMany = originals.createMany;
  }
});

test("student details: saving a student keeps the count current and clears it at zero", async () => {
  const db = prisma as any;
  const originals = {
    enrollments: db.studentEnrollments.findMany,
    notificationCount: db.notification.count,
    studentCount: db.students.count,
    updateMany: db.notification.updateMany,
    deleteMany: db.notification.deleteMany,
  };
  const calls: unknown[] = [];
  let missing = 3;
  db.studentEnrollments.findMany = async () => [{ semesterId: "s1", semester: { center: { name: "Tulip" } } }];
  db.notification.count = async () => 1;
  db.students.count = async () => missing;
  db.notification.updateMany = async (args: unknown) => {
    calls.push(["update", args]);
    return { count: 1 };
  };
  db.notification.deleteMany = async (args: unknown) => {
    calls.push(["delete", args]);
    return { count: 1 };
  };

  try {
    await resolveStudentDetailsReminders("student");
    missing = 0;
    await resolveStudentDetailsReminders("student");
    assert.deepEqual(calls, [
      ["update", { where: { key: "student-details:s1" }, data: { body: "Tulip: 3 students need details." } }],
      ["delete", { where: { key: "student-details:s1" } }],
    ]);
  } finally {
    db.studentEnrollments.findMany = originals.enrollments;
    db.notification.count = originals.notificationCount;
    db.students.count = originals.studentCount;
    db.notification.updateMany = originals.updateMany;
    db.notification.deleteMany = originals.deleteMany;
  }
});

const tulip = { id: "s1", centerId: "c", center: { name: "Tulip", projectId: "p" } };

test("exam scores: Saturday to-dos for centre managers, kept current as scores come in", async () => {
  const sent: Sent[] = [];
  const updates: unknown[] = [];
  let withoutScores = 12;
  const exam = {
    id: "e1",
    name: "SA-1 English",
    semesterId: "s1",
    semesterLevelId: "level-2",
    examDate: new Date("2026-10-24T00:00:00Z"),
    semesterLevel: { academicLevel: { name: "Level 2" } },
  };
  let examWhere: any = null;
  let countWhere: any = null;
  const restore = stub({
    "exam.findMany": async ({ where }: any) => {
      examWhere = where;
      return [{ ...exam, semester: tulip }];
    },
    "exam.findUnique": async () => exam,
    "studentEnrollments.count": async ({ where }: any) => {
      countWhere = where;
      return withoutScores;
    },
    "userRoleAssignments.findMany": async () => [{ userId: "manager", semesterId: "s1" }],
    "notification.deleteMany": async () => ({ count: 0 }),
    "notification.createMany": capture(sent),
    "notification.count": async () => 1,
    "notification.updateMany": async (args: unknown) => {
      updates.push(args);
      return { count: 1 };
    },
  });
  try {
    await sendExamScoreReminders("2026-10-31");
    // Only exams already held.
    assert.deepEqual(examWhere.examDate, { lt: new Date("2026-10-31T00:00:00Z") });
    // Students who joined after the exam can't have a score.
    assert.deepEqual(countWhere.enrolledAt, { lt: new Date("2026-10-24T18:30:00.000Z") });
    assert.equal(sent.length, 1);
    assert.equal(sent[0].userId, "manager");
    assert.equal(sent[0].title, "Enter exam scores");
    assert.equal(sent[0].body, "SA-1 English (Level 2): 12 students without scores.");
    assert.equal(sent[0].href, "/projects/p/centers/c/semesters/s1/dashboard/exams/e1/scores");
    assert.equal(sent[0].actionLabel, "Enter scores");
    assert.equal(sent[0].kind, "TASK");

    withoutScores = 1;
    await resolveExamScoreReminders("e1");
    assert.deepEqual(updates, [
      { where: { key: "exam-scores:e1" }, data: { body: "SA-1 English (Level 2): 1 student without scores." } },
    ]);
  } finally {
    restore();
  }
});

test("pay rates: admins get a to-do per person with present days no rate covers", async () => {
  const sent: Sent[] = [];
  const cleared: unknown[] = [];
  let periods = [
    // Covers October only: 7 November is uncovered.
    { userId: "educator-1", effectiveFrom: new Date("2026-10-01T00:00:00Z"), effectiveTo: new Date("2026-10-31T00:00:00Z") },
    { userId: "educator-2", effectiveFrom: new Date("2026-10-01T00:00:00Z"), effectiveTo: null },
  ];
  const record = (userId: string, name: string, date: string) => ({ userId, date: new Date(`${date}T00:00:00Z`), user: { name } });
  const restore = stub({
    "semesters.findMany": async () => [tulip],
    "user.findMany": async () => [{ id: "admin" }],
    "userAttendance.findMany": async () => [
      record("educator-1", "Neha", "2026-10-31"),
      record("educator-1", "Neha", "2026-11-07"),
      record("educator-2", "Ravi", "2026-11-07"),
      record("manager", "Kiran", "2026-11-07"),
    ],
    "semesterRemunerationPeriod.findMany": async () => periods,
    "notification.deleteMany": async (args: unknown) => {
      cleared.push(args);
      return { count: 0 };
    },
    "notification.createMany": capture(sent),
    "notification.count": async () => 2,
  });
  try {
    await sendPayRateReminders("2026-11-07");
    assert.deepEqual(cleared, [{ where: { key: { startsWith: "pay-rate:" } } }]);
    assert.deepEqual(
      sent.map((item) => [item.userId, item.title, item.body, item.href, item.actionLabel, item.key]),
      [
        ["admin", "Pay rate missing", "Neha has no pay rate at Tulip.", "/users/educator-1/edit", "Set rate", "pay-rate:s1:educator-1"],
        ["admin", "Pay rate missing", "Kiran has no pay rate at Tulip.", "/users/manager/edit", "Set rate", "pay-rate:s1:manager"],
      ],
    );

    // Neha gets a rate; Kiran is still missing one.
    periods = [...periods, { userId: "educator-1", effectiveFrom: new Date("2026-11-01T00:00:00Z"), effectiveTo: null }];
    cleared.length = 0;
    await resolvePayRateReminders("s1");
    assert.deepEqual(cleared, [{ where: { key: { startsWith: "pay-rate:s1:", notIn: ["pay-rate:s1:manager"] } } }]);
  } finally {
    restore();
  }
});

test("missed classes: a streak of three absent weekends ending last weekend is reported once", () => {
  const day = (date: string, status: string, studentId = "asha") => ({ studentId, date: new Date(`${date}T00:00:00Z`), status });
  // Weekends (Saturdays): 3, 10, 17, 24 Oct. Last weekend is 24 Oct.
  const threeInARow = [day("2026-10-03", "PRESENT"), day("2026-10-10", "ABSENT"), day("2026-10-11", "ABSENT"), day("2026-10-17", "ABSENT"), day("2026-10-25", "ABSENT")];
  assert.deepEqual(studentsMissingClasses(threeInARow, "2026-10-24"), ["asha"]);
  // Four in a row was already reported a week ago.
  assert.deepEqual(studentsMissingClasses([...threeInARow.slice(1), day("2026-10-04", "ABSENT")], "2026-10-24"), []);
  // Present on either day of a weekend counts as attending it.
  assert.deepEqual(studentsMissingClasses([...threeInARow, day("2026-10-18", "PRESENT")], "2026-10-24"), []);
  // Holidays and unmarked weekends are skipped, not counted.
  assert.deepEqual(studentsMissingClasses([day("2026-10-10", "ABSENT"), day("2026-10-17", "HOLIDAY"), day("2026-10-03", "ABSENT"), day("2026-10-24", "ABSENT")], "2026-10-24"), ["asha"]);
  // The streak must end last weekend.
  assert.deepEqual(studentsMissingClasses(threeInARow.slice(0, 4), "2026-10-24"), []);
});

test("missed classes: centre managers see every name, educators their level's, lock screens none", async () => {
  const sent: Sent[] = [];
  const restore = stub({
    "semesters.findMany": async () => [tulip],
    "studentAttendance.findMany": async () =>
      ["2026-10-10", "2026-10-17", "2026-10-24"].flatMap((date) => [
        { studentId: "asha", date: new Date(`${date}T00:00:00Z`), status: "ABSENT", student: { name: "Asha" }, enrollment: { semesterLevelId: "level-1" } },
        { studentId: "ravi", date: new Date(`${date}T00:00:00Z`), status: "ABSENT", student: { name: "Ravi" }, enrollment: { semesterLevelId: "level-2" } },
      ]),
    "userRoleAssignments.findMany": async () => [
      { userId: "manager", subRole: "CENTER_MANAGER", semesterLevelId: null },
      { userId: "educator-1", subRole: "EDUCATOR", semesterLevelId: "level-1" },
    ],
    "notification.createMany": capture(sent),
  });
  try {
    await sendMissedClassReminders("2026-11-01");
    const byUser = Object.fromEntries(sent.map((item) => [item.userId, item]));
    assert.equal(byUser.manager.body, "Tulip: Asha, Ravi missed 3 weekends in a row.");
    assert.equal(byUser["educator-1"].body, "Tulip: Asha missed 3 weekends in a row.");
    assert.equal(byUser.manager.title, "Missing class");
    assert.equal(byUser.manager.kind, undefined); // an update, so it can be dismissed
    assert.ok(!("pushBody" in byUser.manager), "the lock-screen text isn't stored");
  } finally {
    restore();
  }
});

test("birthdays: the week from Saturday, with day names and 29 February on the 28th", () => {
  const week = birthdayWeek("2026-10-31");
  assert.deepEqual(week.get("10-31"), { dayName: "Sat", order: 0 });
  assert.deepEqual(week.get("11-06"), { dayName: "Fri", order: 6 });
  assert.equal(week.get("11-07"), undefined);
  assert.deepEqual(birthdayWeek("2027-02-27").get("02-29"), { dayName: "Sun", order: 1 });
  assert.equal(birthdayWeek("2028-02-26").get("02-29")?.dayName, "Tue");
});

test("birthdays: educators see their level's students and the staff, never their own", async () => {
  const sent: Sent[] = [];
  const restore = stub({
    "semesters.findMany": async () => [tulip],
    "studentEnrollments.findMany": async () => [
      { semesterLevelId: "level-1", student: { name: "Asha", dob: new Date("2015-11-03T00:00:00Z") } },
      { semesterLevelId: "level-2", student: { name: "Ravi", dob: new Date("2014-11-01T00:00:00Z") } },
      { semesterLevelId: "level-2", student: { name: "Mira", dob: new Date("2014-12-25T00:00:00Z") } },
    ],
    "userRoleAssignments.findMany": async () => [
      { userId: "manager", subRole: "CENTER_MANAGER", semesterLevelId: null, user: { name: "Kiran", dob: null } },
      { userId: "educator-1", subRole: "EDUCATOR", semesterLevelId: "level-1", user: { name: "Neha", dob: new Date("1999-11-02T00:00:00Z") } },
    ],
    "notification.createMany": capture(sent),
  });
  try {
    await sendBirthdayReminders("2026-10-31");
    const byUser = Object.fromEntries(sent.map((item) => [item.userId, item]));
    assert.equal(byUser.manager.body, "Ravi (Sun), Neha (Mon), Asha (Tue)");
    assert.equal(byUser["educator-1"].body, "Asha (Tue)");
    assert.equal(byUser.manager.title, "Birthdays this week");
  } finally {
    restore();
  }
});

test("remuneration paid: the person paid is told the amount and month", async () => {
  const sent: Sent[] = [];
  const restore = stub({
    "semesters.findUnique": async () => ({ center: { name: "Tulip" } }),
    "notification.createMany": capture(sent),
  });
  try {
    notifyRemunerationPaidInBackground(
      { projectId: "p", centerId: "c", semesterId: "s1", month: "2026-10", userIds: ["educator-1", "educator-2"] },
      [
        { userId: "educator-1", status: "PAID", amount: 4500, presentDayCount: 9, paidAt: new Date() },
        { userId: "educator-2", status: "ALREADY_PAID" },
      ],
    );
    await new Promise((resolve) => setTimeout(resolve, 20));
    assert.equal(sent.length, 1);
    assert.equal(sent[0].userId, "educator-1");
    assert.equal(sent[0].title, "Remuneration paid");
    assert.equal(sent[0].body, "₹4,500.00 for October 2026 at Tulip.");
    assert.equal(sent[0].href, "/profile#activity");
  } finally {
    restore();
  }
});

test("cleanup deletes expired to-dos, old updates and old reminder runs", async () => {
  const calls: unknown[] = [];
  const restore = stub({
    "notification.deleteMany": async (args: unknown) => {
      calls.push(["notification", args]);
      return { count: 0 };
    },
    "reminderRun.deleteMany": async (args: unknown) => {
      calls.push(["reminderRun", args]);
      return { count: 0 };
    },
  });
  try {
    const now = new Date("2026-11-07T12:30:00Z");
    const cutoff = new Date("2026-09-08T12:30:00Z");
    await cleanUpNotifications(now);
    assert.deepEqual(calls, [
      ["notification", { where: { OR: [{ expiresAt: { lt: now } }, { kind: "UPDATE", createdAt: { lt: cutoff } }] } }],
      ["reminderRun", { where: { createdAt: { lt: cutoff } } }],
    ]);
  } finally {
    restore();
  }
});

test("a sign-up is a to-do naming the person, sent to each admin once", async () => {
  assert.deepEqual(registrationRequestMessage({ id: "u1", name: "Neha Patil" }), {
    title: "New registration request",
    body: "Neha Patil asked to join Prangan Manager.",
    href: "/users/u1/review",
    actionLabel: "Review request",
    kind: "TASK",
    key: "registration:u1",
  });

  const sent: Sent[] = [];
  const restore = stub({
    "notification.findMany": async () => [{ userId: "admin-1" }],
    "notification.createMany": capture(sent),
  });
  try {
    await notifyUsers(["admin-1", "admin-2"], registrationRequestMessage({ id: "u1", name: "Neha Patil" }));
    assert.deepEqual(sent.map((item) => item.userId), ["admin-2"]);
  } finally {
    restore();
  }
});

test("the weekend check adds missing sign-up to-dos and removes ones no longer waiting", async () => {
  const sent: Sent[] = [];
  const cleared: unknown[] = [];
  const restore = stub({
    "user.findMany": async ({ where }: any) =>
      where.status === "PENDING" ? [{ id: "u1", name: "Neha Patil" }] : [{ id: "admin-1" }],
    "notification.deleteMany": async (args: unknown) => {
      cleared.push(args);
      return { count: 0 };
    },
    "notification.findMany": async () => [],
    "notification.createMany": capture(sent),
  });
  try {
    await sendRegistrationReminders();
    assert.deepEqual(cleared, [
      {
        where: {
          OR: [
            { key: { startsWith: "registration:", notIn: ["registration:u1"] } },
            { title: "New registration request", key: null },
          ],
        },
      },
    ]);
    assert.deepEqual(sent.map((item) => [item.userId, item.body]), [["admin-1", "Neha Patil asked to join Prangan Manager."]]);
  } finally {
    restore();
  }
});
