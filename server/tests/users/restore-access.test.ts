import assert from "node:assert/strict";
import test from "node:test";

import { restoreUserAccessController } from "../../controllers/user.controller.js";
import { prisma } from "../../lib/prisma.js";

const reply = () => {
  const sent: { status: number; body: any } = { status: 200, body: null };
  const value = {
    status(code: number) {
      sent.status = code;
      return value;
    },
    code(code: number) {
      sent.status = code;
      return value;
    },
    send(body: unknown) {
      sent.body = body;
      return value;
    },
  };
  return { reply: value as never, sent };
};

const call = async (body: unknown, user = { id: "admin", role: "ADMIN" }) => {
  const { reply: response, sent } = reply();
  await restoreUserAccessController({ user, params: { userId: "u1" }, body } as never, response);
  return sent;
};

// Runs the transaction against the given stand-in and records emails.
const stubDatabase = (revoked: boolean) => {
  const db = prisma as any;
  const emails: Array<{ dedupeKey: string; subject: string; recipient: string; html: string }> = [];
  const originals = { transaction: db.$transaction, findUnique: db.user.findUnique };
  const tx = {
    user: {
      updateMany: async ({ where }: any) => ({ count: revoked && where.status === "REJECTED" ? 1 : 0 }),
      findUnique: async () => ({ id: "u1", email: "neha@example.com", name: "Neha Patil" }),
    },
    userRoleAssignments: { updateMany: async () => ({ count: 0 }), create: async () => ({}) },
    emailJob: {
      upsert: async ({ create }: any) => {
        emails.push(create);
        return create;
      },
    },
  };
  db.$transaction = async (work: (client: typeof tx) => unknown) => work(tx);
  db.user.findUnique = async () => ({ id: "u1", name: "Neha Patil", status: "APPROVED", roleAssignments: [] });
  return {
    emails,
    restore: () => {
      db.$transaction = originals.transaction;
      db.user.findUnique = originals.findUnique;
    },
  };
};

test("only admins can restore access, with a role and, for volunteers, an assignment", async () => {
  assert.equal((await call({ role: "ADMIN" }, { id: "x", role: "USER" })).status, 403);
  assert.equal((await call({})).status, 400);
  assert.equal((await call({ role: "USER", roleAssignments: [] })).status, 400);
});

test("restoring someone whose access isn't revoked is refused", async () => {
  const database = stubDatabase(false);
  try {
    assert.equal((await call({ role: "ADMIN" })).status, 409);
    assert.equal(database.emails.length, 0);
  } finally {
    database.restore();
  }
});

test("restoring approves them again, and emails them unless told not to", async () => {
  const database = stubDatabase(true);
  try {
    const quiet = await call({ role: "ADMIN", sendEmail: false });
    assert.equal(quiet.status, 200);
    assert.equal(database.emails.length, 0);

    const told = await call({ role: "ADMIN" });
    assert.equal(told.status, 200);
    assert.equal(database.emails.length, 1);
    // The acceptance email's template, worded for a returning person.
    assert.equal(database.emails[0].subject, "🌟 Access Restored - Welcome back to Prangan Foundation");
    assert.match(database.emails[0].html, /Welcome back to Prangan/);
    assert.match(database.emails[0].html, />Sign in</);
    assert.doesNotMatch(database.emails[0].html, /Set your password/);
    assert.equal(database.emails[0].recipient, "neha@example.com");
    assert.match(database.emails[0].dedupeKey, /^access-restored:u1:\d+$/);
  } finally {
    database.restore();
  }
});

test("a daily rate is only accepted for a paid role given in the same request", async () => {
  const sent = await call({
    role: "ADMIN",
    remunerationPeriods: [{ projectId: "p", centerId: "c", semesterId: "s1", amountPerDay: 500, effectiveFrom: "2026-06-01" }],
  });
  assert.equal(sent.status, 400);
  assert.match(JSON.stringify(sent.body), /educator or centre manager role in that semester/);
});

test("the welcome email lists each role, with the daily rate on the first paid role of a semester", async () => {
  const { buildRegistrationRoleDetails } = await import("../../controllers/user.controller.js");
  const db = prisma as any;
  const originals = { project: db.projects.findUnique, centre: db.centers.findUnique, semester: db.semesters.findUnique };
  db.projects.findUnique = async () => ({ id: "p", name: "Chanchalmann" });
  db.centers.findUnique = async () => ({ id: "c", name: "Tulip" });
  db.semesters.findUnique = async () => ({
    id: "s1",
    name: "Semester 2026-27",
    startDate: new Date("2026-06-01T00:00:00Z"),
    endDate: new Date("2027-03-31T00:00:00Z"),
  });
  try {
    const html = await buildRegistrationRoleDetails(
      [
        { subRole: "CENTER_MANAGER", projectId: "p", centerId: "c", semesterId: "s1", committedDays: "BOTH" },
        { subRole: "CURRICULUM_MENTOR", projectId: "p", centerId: "c", semesterId: "s1" },
      ] as never,
      [{ projectId: "p", centerId: "c", semesterId: "s1", amountPerDay: 500, effectiveFrom: "2026-11-01" }],
    );
    assert.match(html, /Center Manager/);
    assert.match(html, /Tulip/);
    assert.match(html, /💰 Remuneration:<\/strong> ₹500\.00 per day present, from 1 Nov 2026/);
    assert.equal(html.match(/Remuneration:/g)?.length, 1);
  } finally {
    db.projects.findUnique = originals.project;
    db.centers.findUnique = originals.centre;
    db.semesters.findUnique = originals.semester;
  }
});
