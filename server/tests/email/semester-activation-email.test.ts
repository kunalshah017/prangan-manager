import assert from "node:assert/strict";
import test from "node:test";
import { CommittedDays, SubRole } from "../../generated/prisma/index.js";
import {
  buildSemesterActivationEmailJobs,
  renderSemesterActivationEmail,
} from "../../email/semester-activation-email.js";

test("one continuing message consolidates every next-semester assignment", () => {
  const message = renderSemesterActivationEmail({
    recipientName: "Aditi",
    centerName: "Tulip Centre",
    semesterName: "Year 2026-27",
    decision: "ASSIGN",
    assignments: [
      {
        subRole: SubRole.EDUCATOR,
        levelName: "Primary B",
        committedDays: CommittedDays.SATURDAY,
      },
      {
        subRole: SubRole.CENTER_MANAGER,
        committedDays: CommittedDays.BOTH,
      },
    ],
    dailyRate: 750,
  });

  assert.match(message.subject, /welcome.*2026-27/i);
  assert.match(message.html, /Aditi/);
  assert.match(message.html, /Tulip Centre/);
  assert.match(message.html, /Educator/);
  assert.match(message.html, /Primary B/);
  assert.match(message.html, /Saturday/);
  assert.match(message.html, /Centre manager/);
  assert.match(message.html, /Saturday and Sunday/);
  assert.match(message.html, /₹750\.00 per day/);
  assert.match(message.text, /Educator — Primary B — Saturday/);
  assert.match(message.text, /Centre manager — Saturday and Sunday/);
});

test("a departing user receives an appreciative centre farewell", () => {
  const message = renderSemesterActivationEmail({
    recipientName: "Rossni",
    centerName: "Tulip Centre",
    semesterName: "Year 2026-27",
    decision: "NOT_CONTINUING",
    assignments: [],
    dailyRate: null,
  });

  assert.match(message.subject, /thank you/i);
  assert.match(message.html, /Tulip Centre/);
  assert.match(message.html, /contribution.*immense/i);
  assert.match(message.html, /Prangan.*always open/i);
  assert.doesNotMatch(message.html, /₹/);
});

test("semester messages escape persisted names and labels", () => {
  const message = renderSemesterActivationEmail({
    recipientName: '<img src=x onerror="alert(1)">',
    centerName: "Tulip & Rose",
    semesterName: "<New Year>",
    decision: "ASSIGN",
    assignments: [
      {
        subRole: SubRole.EDUCATOR,
        levelName: "<Primary>",
      },
    ],
    dailyRate: 0,
  });

  assert.doesNotMatch(message.html, /<img src=x/);
  assert.match(message.html, /&lt;img src=x onerror=&quot;alert\(1\)&quot;&gt;/);
  assert.match(message.html, /Tulip &amp; Rose/);
  assert.match(message.html, /&lt;Primary&gt;/);
});

test("job building produces one deduplicated message per transition user", () => {
  const jobs = buildSemesterActivationEmailJobs({
    semesterId: "semester-2",
    semesterName: "Year 2026-27",
    centerName: "Tulip Centre",
    users: [
      {
        userId: "user-1",
        email: "aditi@example.org",
        name: "Aditi",
        decision: "ASSIGN",
        assignments: [
          { subRole: SubRole.EDUCATOR, levelName: "Primary B" },
          { subRole: SubRole.CENTER_MANAGER },
        ],
        dailyRate: 750,
      },
      {
        userId: "user-2",
        email: "rossni@example.org",
        name: "Rossni",
        decision: "NOT_CONTINUING",
        assignments: [],
        dailyRate: null,
      },
    ],
  });

  assert.equal(jobs.length, 2);
  assert.deepEqual(
    jobs.map(({ dedupeKey, to, fromName }) => ({
      dedupeKey,
      to,
      fromName,
    })),
    [
      {
        dedupeKey: "semester-activation:semester-2:user-1",
        to: "aditi@example.org",
        fromName: "Tulip Centre · Prangan Foundation",
      },
      {
        dedupeKey: "semester-activation:semester-2:user-2",
        to: "rossni@example.org",
        fromName: "Tulip Centre · Prangan Foundation",
      },
    ],
  );
  assert.equal(jobs[0].html.match(/Educator/g)?.length, 1);
  assert.equal(jobs[0].html.match(/Centre manager/g)?.length, 1);
});

test("job building refuses to produce multiple emails for a repeated user", () => {
  const repeatedUser = {
    userId: "user-1",
    email: "aditi@example.org",
    name: "Aditi",
    decision: "ASSIGN" as const,
    assignments: [{ subRole: SubRole.EDUCATOR, levelName: "Primary B" }],
    dailyRate: 750,
  };

  const jobs = buildSemesterActivationEmailJobs({
    semesterId: "semester-2",
    semesterName: "Year 2026-27",
    centerName: "Tulip Centre",
    users: [repeatedUser, repeatedUser],
  });

  assert.equal(jobs.length, 1);
  assert.equal(
    jobs[0].dedupeKey,
    "semester-activation:semester-2:user-1",
  );
});
