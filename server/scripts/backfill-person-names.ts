import { appendFileSync, closeSync, openSync } from "node:fs";
import { isAbsolute } from "node:path";
import { pathToFileURL } from "node:url";

import {
  composePersonName,
  normalizePersonName,
  parseLegacyPersonName,
  type ResolvedPersonName,
} from "../lib/person-name.js";

export interface BackfillArgs {
  apply: boolean;
  normalizeName: boolean;
  reportPath: string | null;
}

export interface PersonNameRow {
  id: string;
  name: string;
  firstName: string | null;
  middleName: string | null;
  lastName: string | null;
}

export interface PersonNameRowClassification {
  action: "none" | "blocked" | "backfill" | "normalize";
  reasons: string[];
  proposed: ResolvedPersonName | null;
}

export const parseBackfillArgs = (args: string[]): BackfillArgs => {
  const result: BackfillArgs = {
    apply: false,
    normalizeName: false,
    reportPath: null,
  };

  for (const argument of args) {
    if (argument === "--apply") {
      result.apply = true;
    } else if (argument === "--normalize-name") {
      result.normalizeName = true;
    } else if (argument.startsWith("--report=")) {
      result.reportPath = argument.slice("--report=".length);
    } else {
      throw new Error(`Unknown argument: ${argument}`);
    }
  }

  if (result.normalizeName && !result.apply) {
    throw new Error("--normalize-name requires --apply.");
  }
  if (result.apply && !result.reportPath) {
    throw new Error("--report is required with --apply.");
  }
  if (result.reportPath && !isAbsolute(result.reportPath)) {
    throw new Error("--report must be an absolute protected path.");
  }
  return result;
};

const normalizeOptionalPart = (value: string | null): string | null =>
  value === null ? null : normalizePersonName(value) || null;

export const classifyPersonNameRow = (
  row: PersonNameRow,
): PersonNameRowClassification => {
  const normalizedFirstName = row.firstName
    ? normalizePersonName(row.firstName)
    : "";

  if (!normalizedFirstName) {
    let parsed;
    try {
      parsed = parseLegacyPersonName(row.name);
    } catch {
      return {
        action: "blocked",
        reasons: ["empty-name"],
        proposed: null,
      };
    }

    const tokenCount = normalizePersonName(row.name).split(" ").length;
    const reasons =
      tokenCount === 1
        ? ["single-token-review"]
        : tokenCount >= 4
          ? ["four-plus-token-review"]
          : [];
    return {
      action: "backfill",
      reasons,
      proposed: { name: composePersonName(parsed), ...parsed },
    };
  }

  const proposed = {
    firstName: normalizedFirstName,
    middleName: normalizeOptionalPart(row.middleName),
    lastName: normalizeOptionalPart(row.lastName),
  };
  const composedName = composePersonName(proposed);
  const reasons: string[] = [];
  if (row.middleName !== null && normalizePersonName(row.middleName) === "") {
    reasons.push("blank-optional-part");
  }
  if (row.lastName !== null && normalizePersonName(row.lastName) === "") {
    if (!reasons.includes("blank-optional-part")) {
      reasons.push("blank-optional-part");
    }
  }
  if (normalizePersonName(row.name) !== composedName) {
    reasons.push("composition-mismatch");
  }

  const partsNeedNormalization =
    row.firstName !== proposed.firstName ||
    row.middleName !== proposed.middleName ||
    row.lastName !== proposed.lastName;
  if (!partsNeedNormalization && reasons.length === 0) {
    return { action: "none", reasons: [], proposed: null };
  }

  return {
    action: "normalize",
    reasons,
    proposed: { name: composedName, ...proposed },
  };
};

type ModelName = "User" | "Students";

type BackfillSummary = {
  scanned: number;
  unchanged: number;
  pendingBackfill: number;
  pendingNormalization: number;
  reviewIds: string[];
  blockingIds: string[];
  updated: number;
  conflicts: number;
};

const emptySummary = (): BackfillSummary => ({
  scanned: 0,
  unchanged: 0,
  pendingBackfill: 0,
  pendingNormalization: 0,
  reviewIds: [],
  blockingIds: [],
  updated: 0,
  conflicts: 0,
});

const runBackfill = async (options: BackfillArgs): Promise<number> => {
  const { prisma } = await import("../lib/prisma.js");
  const reportDescriptor = options.reportPath
    ? openSync(options.reportPath, "wx", 0o600)
    : null;

  const summaries: Record<ModelName, BackfillSummary> = {
    User: emptySummary(),
    Students: emptySummary(),
  };

  const processModel = async (modelName: ModelName): Promise<void> => {
    const delegate = modelName === "User" ? prisma.user : prisma.students;
    const summary = summaries[modelName];
    let cursor: string | undefined;

    while (true) {
      const rows = (await (delegate.findMany as Function)({
        take: 200,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        orderBy: { id: "asc" },
        select: {
          id: true,
          name: true,
          firstName: true,
          middleName: true,
          lastName: true,
        },
      })) as PersonNameRow[];
      if (rows.length === 0) break;

      for (const row of rows) {
        summary.scanned += 1;
        const classification = classifyPersonNameRow(row);
        if (classification.action === "none") {
          summary.unchanged += 1;
          continue;
        }
        if (classification.action === "blocked") {
          summary.blockingIds.push(row.id);
          continue;
        }
        if (classification.reasons.length > 0) {
          summary.reviewIds.push(row.id);
        }
        if (classification.action === "backfill") {
          summary.pendingBackfill += 1;
        } else {
          summary.pendingNormalization += 1;
        }

        const shouldWrite =
          options.apply &&
          (classification.action === "backfill" || options.normalizeName);
        if (!shouldWrite || !classification.proposed) continue;

        const proposedData = {
          firstName: classification.proposed.firstName,
          middleName: classification.proposed.middleName,
          lastName: classification.proposed.lastName,
          ...(options.normalizeName
            ? { name: classification.proposed.name }
            : {}),
        };
        appendFileSync(
          reportDescriptor!,
          `${JSON.stringify({
            model: modelName,
            original: row,
            proposed: proposedData,
            reasons: classification.reasons,
          })}\n`,
          "utf8",
        );

        const result = await (delegate.updateMany as Function)({
          where: {
            id: row.id,
            name: row.name,
            firstName: row.firstName,
            middleName: row.middleName,
            lastName: row.lastName,
          },
          data: proposedData,
        });
        if (result.count === 1) summary.updated += 1;
        else summary.conflicts += 1;
      }

      cursor = rows[rows.length - 1]?.id;
    }
  };

  try {
    await processModel("User");
    await processModel("Students");
  } finally {
    if (reportDescriptor !== null) closeSync(reportDescriptor);
    await prisma.$disconnect();
  }

  for (const [modelName, summary] of Object.entries(summaries)) {
    console.log(`${modelName}:`, {
      scanned: summary.scanned,
      unchanged: summary.unchanged,
      pendingBackfill: summary.pendingBackfill,
      pendingNormalization: summary.pendingNormalization,
      updated: summary.updated,
      conflicts: summary.conflicts,
      blockingIds: summary.blockingIds,
      reviewIds: summary.reviewIds,
    });
  }

  return Object.values(summaries).some(
    (summary) => summary.blockingIds.length > 0 || summary.conflicts > 0,
  )
    ? 1
    : 0;
};

const isMain =
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

const main = async (): Promise<void> => {
  try {
    const options = parseBackfillArgs(process.argv.slice(2));
    process.exitCode = await runBackfill(options);
  } catch (error) {
    console.error((error as Error).message);
    process.exitCode = 1;
  }
};

if (isMain) {
  void main();
}
