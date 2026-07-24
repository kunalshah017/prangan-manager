import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const serverFile = (path: string) =>
  new URL(`../../${path}`, import.meta.url);

test("semester transition endpoints are authenticated and admin-owned", async () => {
  const [routes, controller] = await Promise.all([
    readFile(serverFile("routes/semester.routes.ts"), "utf8"),
    readFile(serverFile("controllers/semester-transition.controller.ts"), "utf8"),
  ]);

  for (const route of [
    '"/semesters/center/:centerId/setup-summaries"',
    '"/semesters/:id/setup"',
    '"/semesters/:id/setup/students"',
    '"/semesters/:id/setup/staff"',
    '"/semesters/:id/setup/activate"',
  ]) {
    assert.match(routes, new RegExp(route.replaceAll("/", "\\/")));
  }
  assert.match(routes, /preHandler:\s*authChecker/);
  assert.match(controller, /admin\.role !== Role\.ADMIN/);
  assert.match(controller, /parseStudentTransitionPlan/);
  assert.match(controller, /parseStaffTransitionPlan/);
  assert.match(controller, /getCenterSemesterTransitionSummaries/);
  assert.ok(
    routes.indexOf('"/semesters/center/:centerId/setup-summaries"') <
      routes.indexOf('"/semesters/:id"'),
    "the static center summary route must be registered before /semesters/:id",
  );
});

test("semester transition activation is transactional and leaves its source untouched", async () => {
  const service = await readFile(
    serverFile("service/semester-transition.service.ts"),
    "utf8",
  );

  assert.match(service, /export const activateSemesterTransition/);
  assert.match(service, /prisma\.\$transaction/);
  assert.match(service, /studentEnrollments\.upsert/);
  assert.match(service, /userRoleAssignments\.create/);
  assert.match(service, /semesterRemunerationRate\.upsert/);
  assert.match(service, /semesterRemunerationPeriod\.upsert/);
  assert.match(service, /SemesterStatus\.ACTIVE/);
  assert.match(service, /SemesterTransitionStatus\.COMPLETED/);
  assert.doesNotMatch(
    service,
    /sourceSemester[\s\S]{0,120}\.(?:update|delete)/,
  );
});

test("new semesters accept a source and initialize a draft transition", async () => {
  const [input, controller, service] = await Promise.all([
    readFile(serverFile("security/semester-input.ts"), "utf8"),
    readFile(serverFile("controllers/semester.controller.ts"), "utf8"),
    readFile(serverFile("service/semester.service.ts"), "utf8"),
  ]);

  assert.match(input, /sourceSemesterId/);
  assert.match(controller, /CreateSemester\(parsed\.data,\s*user\.id\)/);
  assert.match(service, /SemesterStatus\.DRAFT/);
  assert.match(service, /initializeSemesterTransition/);
});

test("semester setup derives promotion suggestions from authoritative pre-assessment results", async () => {
  const service = await readFile(
    serverFile("service/semester-transition.service.ts"),
    "utf8",
  );

  assert.match(service, /AssessmentCycle\.PRE_ASSESSMENT/);
  assert.match(service, /suggestStudentProgression/);
  assert.match(service, /studentScores/);
  assert.match(service, /promotionSuggestion/);
  assert.match(service, /examDate:\s*"desc"/);
  assert.match(service, /createdAt:\s*"desc"/);
});

test("remuneration rates have an authenticated scoped update endpoint", async () => {
  const [routes, controller, service] = await Promise.all([
    readFile(serverFile("routes/user.route.ts"), "utf8"),
    readFile(serverFile("controllers/user.controller.ts"), "utf8"),
    readFile(serverFile("service/user.service.ts"), "utf8"),
  ]);

  assert.match(routes, /"\/users\/remuneration\/rates"/);
  assert.match(routes, /updateRemunerationRatesController/);
  assert.match(controller, /canAccessScope/);
  assert.match(controller, /updateSemesterRemunerationRates/);
  assert.match(service, /export const updateSemesterRemunerationRates/);
  assert.match(service, /semesterRemunerationRate\.upsert/);
});
