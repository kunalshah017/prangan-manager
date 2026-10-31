import assert from "node:assert/strict";
import test from "node:test";

import { registerUser } from "../../controllers/user.controller.js";
import { AssessmentCycle } from "../../generated/prisma/index.js";
import { prisma } from "../../lib/prisma.js";
import { parseCreateExamRequest } from "../../security/exam-input.js";
import { getExams } from "../../service/exam.service.js";
import { calendarDate } from "../../utils/dateHelpers.js";

const createReply = () => {
  const response = { statusCode: 0 };
  const reply = {
    status(code: number) {
      response.statusCode = code;
      return this;
    },
    send() {
      return this;
    },
  };
  return { reply: reply as never, response };
};

test("a calendar day is stored as its UTC midnight, which a DATE column keeps as that day", () => {
  assert.equal(calendarDate("2026-11-30").toISOString(), "2026-11-30T00:00:00.000Z");
});

test("dates of birth are accepted only as YYYY-MM-DD", async () => {
  const { reply, response } = createReply();
  await registerUser(
    {
      body: {
        firstName: "Asha",
        middleName: "Kumar",
        lastName: "Shah",
        email: "asha@example.com",
        // India midnight sent as an instant: its UTC day is the day before.
        dob: "1990-03-11T18:30:00.000Z",
      },
    } as never,
    reply,
  );

  assert.equal(response.statusCode, 400);
});

test("exam dates carry no time or offset", () => {
  const exam = {
    projectId: "project-1",
    centerId: "center-1",
    semesterId: "semester-1",
    semesterLevelId: "semester-level-1",
    cycle: AssessmentCycle.SA_1,
    name: "English assessment",
    examDate: "2026-11-01",
    listeningMaxMarks: 10,
    speakingMaxMarks: 10,
    readingMaxMarks: 10,
    writingMaxMarks: 10,
  };

  assert.ok("data" in parseCreateExamRequest(exam));
  // Sunday in India, but Saturday 18:30 in UTC.
  assert.ok(
    "error" in parseCreateExamRequest({ ...exam, examDate: "2026-11-01T00:00:00+05:30" }),
  );
});

test("an exam date range keeps both of its bounds", async () => {
  const original = prisma.exam.findMany;
  let where: { examDate?: unknown } | undefined;
  prisma.exam.findMany = (async (query: { where: typeof where }) => {
    where = query.where;
    return [];
  }) as unknown as typeof prisma.exam.findMany;
  try {
    await getExams({ startDate: "2026-11-01", endDate: "2026-11-30" } as never);
    assert.deepEqual(where?.examDate, {
      gte: new Date("2026-11-01T00:00:00.000Z"),
      lte: new Date("2026-11-30T00:00:00.000Z"),
    });
  } finally {
    prisma.exam.findMany = original;
  }
});
