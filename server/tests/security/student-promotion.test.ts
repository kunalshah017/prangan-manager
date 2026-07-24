import assert from "node:assert/strict";
import test from "node:test";

import {
  selectLatestAssessment,
  suggestStudentProgression,
} from "../../lib/student-promotion.js";

const academicLevels = [
  { id: "academic-1", journeyOrder: 100 },
  { id: "academic-2", journeyOrder: 200 },
  { id: "academic-3", journeyOrder: 300 },
];
const targetLevels = academicLevels.map((level) => ({
  id: `semester-${level.id}`,
  academicLevelId: level.id,
}));
const scored = (totalScore: number, totalMaxMarks = 100) => ({
  examId: "exam-latest",
  examName: "Pre-assessment",
  examDate: new Date("2026-07-20T00:00:00.000Z"),
  totalScore,
  totalMaxMarks,
  isAbsent: false,
});

test("latest assessment is selected by exam date and creation time", () => {
  const result = selectLatestAssessment([
    {
      ...scored(95),
      examId: "older",
      examDate: new Date("2026-07-10T00:00:00.000Z"),
      createdAt: new Date("2026-07-12T00:00:00.000Z"),
    },
    {
      ...scored(80),
      examId: "latest-created",
      createdAt: new Date("2026-07-21T00:00:00.000Z"),
    },
    {
      ...scored(75),
      examId: "earlier-created",
      createdAt: new Date("2026-07-20T00:00:00.000Z"),
    },
  ]);

  assert.equal(result?.examId, "latest-created");
});

test("a score strictly above 70 percent suggests the next journey level", () => {
  assert.deepEqual(
    suggestStudentProgression({
      assessment: scored(70.01),
      sourceAcademicLevel: academicLevels[0],
      activeAcademicLevels: academicLevels,
      targetSemesterLevels: targetLevels,
    }),
    {
      decision: "PROMOTE",
      targetSemesterLevelId: "semester-academic-2",
      evidence: {
        status: "SCORED",
        reason: "ABOVE_THRESHOLD",
        threshold: 70,
        percentage: 70.01,
        examId: "exam-latest",
        examName: "Pre-assessment",
        examDate: new Date("2026-07-20T00:00:00.000Z"),
      },
    },
  );
});

test("scores at or below 70 percent suggest retaining the same level", () => {
  for (const totalScore of [70, 69.99]) {
    const result = suggestStudentProgression({
      assessment: scored(totalScore),
      sourceAcademicLevel: academicLevels[0],
      activeAcademicLevels: academicLevels,
      targetSemesterLevels: targetLevels,
    });
    assert.equal(result.decision, "RETAIN");
    assert.equal(result.targetSemesterLevelId, "semester-academic-1");
    assert.equal(result.evidence.reason, "AT_OR_BELOW_THRESHOLD");
  }
});

test("missing and absent results require manual review", () => {
  const common = {
    sourceAcademicLevel: academicLevels[0],
    activeAcademicLevels: academicLevels,
    targetSemesterLevels: targetLevels,
  };
  assert.equal(
    suggestStudentProgression({ ...common, assessment: null }).decision,
    "REVIEW",
  );
  const absent = suggestStudentProgression({
    ...common,
    assessment: { ...scored(0), isAbsent: true },
  });
  assert.equal(absent.decision, "REVIEW");
  assert.equal(absent.evidence.status, "ABSENT");
});

test("a missing required target level requires review instead of passing out", () => {
  const result = suggestStudentProgression({
    assessment: scored(90),
    sourceAcademicLevel: academicLevels[0],
    activeAcademicLevels: academicLevels,
    targetSemesterLevels: [targetLevels[0], targetLevels[2]],
  });
  assert.equal(result.decision, "REVIEW");
  assert.equal(result.evidence.reason, "NEXT_LEVEL_UNAVAILABLE");
});

test("a qualifying student at the final active level is marked passed out", () => {
  const result = suggestStudentProgression({
    assessment: scored(90),
    sourceAcademicLevel: academicLevels[2],
    activeAcademicLevels: academicLevels,
    targetSemesterLevels: targetLevels,
  });
  assert.equal(result.decision, "PASSED_OUT");
  assert.equal(result.targetSemesterLevelId, undefined);
  assert.equal(result.evidence.reason, "FINAL_LEVEL_COMPLETED");
});
