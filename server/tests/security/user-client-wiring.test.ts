import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const readHooks = () =>
  readFile(
    new URL("../../../client/src/hooks/useUserQueries.ts", import.meta.url),
    "utf8",
  );

const readClientPage = (path: string) =>
  readFile(
    new URL(`../../../client/src/pages/${path}`, import.meta.url),
    "utf8",
  );

test("admin user save separates profile and privilege requests", async () => {
  const source = await readHooks();
  const updateSource = source.match(
    /export const useUpdateUser[\s\S]*?^};/m,
  )?.[0];

  assert.ok(updateSource);
  assert.match(updateSource, /const \{ role, \.\.\.profileData \} = userData/);
  assert.match(
    updateSource,
    /api\.put[\s\S]*`\/users\/\$\{userId\}`[\s\S]*profileData/,
  );
  assert.doesNotMatch(
    updateSource,
    /`\/users\/\$\{userId\}`[\s\S]*\{[\s\S]*\.\.\.userData[\s\S]*roleAssignments/,
  );
  assert.match(
    updateSource,
    /`\/users\/\$\{userId\}\/management`[\s\S]*\{[\s\S]*\brole,?[\s\S]*\broleAssignments,?[\s\S]*\}/,
  );
  assert.match(
    updateSource,
    /role !== undefined \|\| roleAssignments !== undefined/,
  );
  assert.match(updateSource, /return profileResult/);
});

test("no client hook targets the nonexistent user role route", async () => {
  const source = await readHooks();

  assert.doesNotMatch(source, /`\/users\/\$\{userId\}\/role`/);
});

test("only the admin users page consumes the global users hook", async () => {
  const [usersSource, dashboardSource, attendanceSource] = await Promise.all([
    readClientPage("users/Users.tsx"),
    readClientPage("semesters/Dashboard.tsx"),
    readClientPage("attendance/ViewAttendance.tsx"),
  ]);

  assert.match(usersSource, /\buseUsers\(\)/);
  assert.doesNotMatch(dashboardSource, /\buseUsers\b/);
  assert.doesNotMatch(attendanceSource, /\buseUsers\b/);
});

test("dashboard uses scoped context staff with loading and error states", async () => {
  const [typesSource, hooksSource, dashboardSource] = await Promise.all([
    readFile(
      new URL("../../../client/src/types/api.ts", import.meta.url),
      "utf8",
    ),
    readHooks(),
    readClientPage("semesters/Dashboard.tsx"),
  ]);

  assert.match(typesSource, /export interface ContextStaffUser/);
  assert.match(typesSource, /export type ContextStaffResponse/);
  assert.match(hooksSource, /export const useContextStaff/);
  assert.match(hooksSource, /\/users\/context-staff\?/);
  assert.match(
    hooksSource,
    /queryKey:[\s\S]*context-staff[\s\S]*projectId[\s\S]*centerId[\s\S]*semesterId/,
  );
  assert.match(
    hooksSource,
    /enabled:[\s\S]*projectId[\s\S]*centerId[\s\S]*semesterId/,
  );

  assert.match(
    dashboardSource,
    /useContextStaff\(\{[\s\S]*projectId[\s\S]*centerId[\s\S]*semesterId/,
  );
  assert.match(
    dashboardSource,
    /useContextStaff\(\{[\s\S]*enabled: dashboardModel\.visibility\.staff/,
  );
  assert.match(
    dashboardSource,
    /dashboardModel\.visibility\.staff && staffQuery\.isLoading/,
  );
  assert.match(
    dashboardSource,
    /dashboardModel\.visibility\.staff \? staffQuery\.error : null/,
  );
});
