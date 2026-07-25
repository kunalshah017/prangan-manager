const LOGO_URL =
  "https://manager.pranganfoundation.org/images/logo/prangan-logo-light-mode.png";

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const singleLine = (value: string) => value.replace(/[\r\n]+/g, " ").trim();

const monthLabel = (month: string) => {
  const [year, monthNumber] = month.split("-").map(Number);
  return new Intl.DateTimeFormat("en-IN", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, monthNumber - 1, 1)));
};

const formatAmount = (amount: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);

export type RemunerationPaymentEmailInput = {
  recipientName: string;
  centerName: string;
  semesterName: string;
  paymentMonth: string;
  presentDayCount: number;
  amount: number;
  paymentDate: string;
};

export const renderRemunerationPaymentEmail = (
  input: RemunerationPaymentEmailInput,
) => {
  const paymentMonth = monthLabel(input.paymentMonth);
  const amount = formatAmount(input.amount);
  const days = `${input.presentDayCount} present ${
    input.presentDayCount === 1 ? "day" : "days"
  }`;

  return {
    subject: `${paymentMonth} remuneration paid · Prangan Foundation`,
    html: `<!doctype html>
<html>
  <body style="margin:0;padding:24px 12px;background:#f3f6f8;color:#172033;font-family:Arial,Helvetica,sans-serif;line-height:1.55">
    <main style="max-width:600px;margin:0 auto;background:#fff;border-radius:14px;padding:32px">
      <img src="${LOGO_URL}" alt="Prangan Foundation" style="display:block;max-width:160px;height:auto;margin:0 auto 26px" />
      <p style="margin:0 0 8px;color:#a94700;font-size:13px;font-weight:700">${escapeHtml(input.centerName)}</p>
      <h1 style="margin:0 0 20px;font-size:26px;color:#172033">Your remuneration has been paid</h1>
      <p>Dear <strong>${escapeHtml(input.recipientName)}</strong>,</p>
      <p>Your remuneration for ${escapeHtml(paymentMonth)} in ${escapeHtml(input.semesterName)} has been recorded as paid.</p>
      <section style="margin:24px 0;padding:20px;background:#fff8f0;border-left:4px solid #ea7a18;border-radius:8px">
        <p style="margin:0 0 6px"><strong>Present days:</strong> ${input.presentDayCount}</p>
        <p style="margin:0 0 6px"><strong>Amount paid:</strong> ${amount}</p>
        <p style="margin:0"><strong>Payment date:</strong> ${escapeHtml(input.paymentDate)}</p>
      </section>
      <p>Thank you for the care and commitment you bring to Prangan.</p>
      <p style="margin-top:24px">With appreciation,<br><strong>The Prangan team</strong></p>
    </main>
  </body>
</html>`,
    text: `Dear ${input.recipientName},

Your ${paymentMonth} remuneration for ${input.semesterName} has been recorded as paid.

Present days: ${days}
Amount paid: ${amount}
Payment date: ${input.paymentDate}

Thank you for the care and commitment you bring to Prangan.

The Prangan team`,
  };
};

export const buildRemunerationPaymentEmailJob = (
  input: RemunerationPaymentEmailInput & {
    sourceKey: string;
    email: string;
  },
) => ({
  dedupeKey: `remuneration-payment:${input.sourceKey}`,
  to: input.email,
  fromName: `${singleLine(input.centerName)} · Prangan Foundation`,
  ...renderRemunerationPaymentEmail(input),
});
