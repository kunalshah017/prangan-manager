import assert from "node:assert/strict";
import test from "node:test";

import {
  buildRemunerationPaymentEmailJob,
  renderRemunerationPaymentEmail,
} from "../../email/remuneration-payment-email.js";

test("remuneration payment email escapes names and formats the INR payment", () => {
  const message = renderRemunerationPaymentEmail({
    recipientName: "<Kunal>",
    centerName: "Prangan & Co",
    semesterName: '"Monsoon" Semester',
    paymentMonth: "2026-07",
    presentDayCount: 3,
    amount: 1250.5,
    paymentDate: "2026-07-25",
  });

  assert.match(message.subject, /July 2026/);
  assert.match(message.html, /&lt;Kunal&gt;/);
  assert.match(message.html, /Prangan &amp; Co/);
  assert.match(message.html, /₹1,250\.50/);
  assert.doesNotMatch(message.html, /<Kunal>/);
  assert.match(message.text, /3 present days/);
});

test("remuneration payment jobs derive their dedupe key from the expense source", () => {
  const job = buildRemunerationPaymentEmailJob({
    sourceKey:
      "remuneration:semester-1:user-1:2026-07-01:2026-07-31",
    email: "person@example.org",
    recipientName: "Person",
    centerName: "Prangan",
    semesterName: "Semester 1",
    paymentMonth: "2026-07",
    presentDayCount: 2,
    amount: 1000,
    paymentDate: "2026-07-25",
  });

  assert.equal(
    job.dedupeKey,
    "remuneration-payment:remuneration:semester-1:user-1:2026-07-01:2026-07-31",
  );
  assert.equal(job.to, "person@example.org");
});
