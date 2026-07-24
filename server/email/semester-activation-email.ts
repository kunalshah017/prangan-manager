import {
  CommittedDays,
  SubRole,
} from "../generated/prisma/index.js";

const LOGO_URL =
  "https://manager.pranganfoundation.org/images/logo/prangan-logo-light-mode.png";

const roleLabels: Record<SubRole, string> = {
  [SubRole.TRAINING_DEVELOPMENT]: "Training and development",
  [SubRole.RECRUITMENT]: "Recruitment",
  [SubRole.GROWTH_DEVELOPMENT]: "Growth and development",
  [SubRole.CURRICULUM_MENTOR]: "Curriculum mentor",
  [SubRole.TECH]: "Tech",
  [SubRole.CENTER_MANAGER]: "Centre manager",
  [SubRole.EDUCATOR]: "Educator",
};

const committedDayLabels: Record<CommittedDays, string> = {
  [CommittedDays.SATURDAY]: "Saturday",
  [CommittedDays.SUNDAY]: "Sunday",
  [CommittedDays.BOTH]: "Saturday and Sunday",
};

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const singleLine = (value: string) => value.replace(/[\r\n]+/g, " ").trim();

export type SemesterEmailAssignment = {
  subRole: SubRole;
  levelName?: string;
  committedDays?: CommittedDays;
};

export type SemesterActivationEmailInput = {
  recipientName: string;
  centerName: string;
  semesterName: string;
  decision: "ASSIGN" | "NOT_CONTINUING";
  assignments: SemesterEmailAssignment[];
  dailyRate: number | null;
};

const emailShell = ({
  eyebrow,
  title,
  body,
}: {
  eyebrow: string;
  title: string;
  body: string;
}) => `<!doctype html>
<html>
  <body style="margin:0;padding:24px 12px;background:#f3f6f8;color:#172033;font-family:Arial,Helvetica,sans-serif;line-height:1.55">
    <main style="max-width:600px;margin:0 auto;background:#fff;border-radius:14px;padding:32px;box-shadow:0 8px 24px rgba(23,32,51,.10)">
      <img src="${LOGO_URL}" alt="Prangan Foundation" style="display:block;max-width:160px;height:auto;margin:0 auto 26px" />
      <p style="margin:0 0 8px;color:#a94700;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:.08em">${eyebrow}</p>
      <h1 style="margin:0 0 20px;font-size:26px;line-height:1.25;color:#172033">${title}</h1>
      ${body}
      <footer style="margin-top:30px;padding-top:20px;border-top:1px solid #e5e7eb;color:#5d6675;font-size:13px">
        <p style="margin:0 0 6px"><strong>Prangan Foundation</strong></p>
        <p style="margin:0;color:#a94700">Inspire | Impart | Impact</p>
      </footer>
    </main>
  </body>
</html>`;

const assignmentLabel = (assignment: SemesterEmailAssignment) =>
  [
    roleLabels[assignment.subRole],
    assignment.levelName,
    assignment.committedDays
      ? committedDayLabels[assignment.committedDays]
      : undefined,
  ]
    .filter(Boolean)
    .join(" — ");

const formatDailyAmount = (amount: number) =>
  `${new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)} per day`;

export const renderSemesterActivationEmail = (
  input: SemesterActivationEmailInput,
) => {
  const name = escapeHtml(input.recipientName);
  const center = escapeHtml(input.centerName);
  const semester = escapeHtml(input.semesterName);

  if (input.decision === "NOT_CONTINUING") {
    return {
      subject: `Thank you from ${singleLine(input.centerName)} · Prangan Foundation`,
      html: emailShell({
        eyebrow: center,
        title: "Thank you for being part of Prangan",
        body: `
          <p>Dear <strong>${name}</strong>,</p>
          <p>As we prepare for ${semester}, we want to thank you for everything you have given to ${center}. Your contribution was immense and deeply appreciated by our children, families, and team.</p>
          <p>Although you will not be continuing with us in the new semester, Prangan is always open to you. You will always remain a valued part of our journey.</p>
          <p style="margin-top:24px">With heartfelt gratitude,<br><strong>The ${center} team</strong></p>`,
      }),
      text: `Dear ${input.recipientName},

As we prepare for ${input.semesterName}, thank you for everything you have given to ${input.centerName}. Your contribution was immense and deeply appreciated.

Although you will not be continuing in the new semester, Prangan is always open to you. You will always remain a valued part of our journey.

With heartfelt gratitude,
The ${input.centerName} team`,
    };
  }

  const labels = input.assignments.map(assignmentLabel);
  const assignmentItems = input.assignments
    .map(
      (assignment) =>
        `<li style="margin:8px 0">${escapeHtml(assignmentLabel(assignment))}</li>`,
    )
    .join("");
  const remuneration =
    input.dailyRate === null
      ? "Not applicable for the assigned role"
      : formatDailyAmount(input.dailyRate);

  return {
    subject: `Welcome to ${singleLine(input.semesterName)} · Prangan Foundation`,
    html: emailShell({
      eyebrow: center,
      title: `Welcome to ${semester}`,
      body: `
        <p>Dear <strong>${name}</strong>,</p>
        <p>We are delighted to welcome you to a new semester at ${center}. Thank you for continuing to learn, lead, and create impact with Prangan.</p>
        <section style="margin:24px 0;padding:20px;background:#fff8f0;border-left:4px solid #ea7a18;border-radius:8px">
          <h2 style="margin:0 0 10px;font-size:18px">Your assignments</h2>
          <ul style="margin:0;padding-left:20px">${assignmentItems}</ul>
          <p style="margin:18px 0 0"><strong>Remuneration:</strong> ${escapeHtml(remuneration)}</p>
          <p style="margin:6px 0 0;color:#5d6675;font-size:13px">Effective from the start of ${semester}.</p>
        </section>
        <p>We look forward to another meaningful year together.</p>
        <p style="margin-top:24px">Warmly,<br><strong>The ${center} team</strong></p>`,
    }),
    text: `Dear ${input.recipientName},

Welcome to ${input.semesterName} at ${input.centerName}.

Your assignments:
${labels.map((label) => `- ${label}`).join("\n")}

Remuneration: ${remuneration}
Effective from the start of ${input.semesterName}.

We look forward to another meaningful year together.

The ${input.centerName} team`,
  };
};

export type SemesterActivationEmailUser =
  SemesterActivationEmailInput & {
    userId: string;
    email: string;
    name: string;
  };

export const buildSemesterActivationEmailJobs = ({
  semesterId,
  semesterName,
  centerName,
  users,
}: {
  semesterId: string;
  semesterName: string;
  centerName: string;
  users: Omit<
    SemesterActivationEmailUser,
    "recipientName" | "centerName" | "semesterName"
  >[];
}) =>
  [...new Map(users.map((user) => [user.userId, user])).values()].map((user) => ({
    dedupeKey: `semester-activation:${semesterId}:${user.userId}`,
    to: user.email,
    fromName: `${singleLine(centerName)} · Prangan Foundation`,
    ...renderSemesterActivationEmail({
      recipientName: user.name,
      centerName,
      semesterName,
      decision: user.decision,
      assignments: user.assignments,
      dailyRate: user.dailyRate,
    }),
  }));
