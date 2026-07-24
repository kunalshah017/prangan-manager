import assert from "node:assert/strict";
import test from "node:test";

import {
  classifyPersonNameRow,
  parseBackfillArgs,
} from "../../scripts/backfill-person-names.js";

test("backfill defaults to a read-only dry run", () => {
  assert.deepEqual(parseBackfillArgs([]), {
    apply: false,
    normalizeName: false,
    reportPath: null,
  });
});

test("write modes require explicit apply and a protected report path", () => {
  assert.throws(
    () => parseBackfillArgs(["--apply"]),
    /--report is required with --apply/,
  );
  assert.throws(
    () => parseBackfillArgs(["--normalize-name"]),
    /requires --apply/,
  );
  assert.deepEqual(
    parseBackfillArgs([
      "--apply",
      "--normalize-name",
      "--report=/protected/names.jsonl",
    ]),
    {
      apply: true,
      normalizeName: true,
      reportPath: "/protected/names.jsonl",
    },
  );
});

test("rejects unsupported CLI arguments", () => {
  assert.throws(() => parseBackfillArgs(["--force"]), /Unknown argument/);
});

test("classifies empty legacy names as blocking", () => {
  assert.deepEqual(
    classifyPersonNameRow({
      id: "user-1",
      name: "   ",
      firstName: null,
      middleName: null,
      lastName: null,
    }),
    {
      action: "blocked",
      reasons: ["empty-name"],
      proposed: null,
    },
  );
});

test("proposes deterministic backfill and flags ambiguous token counts", () => {
  assert.deepEqual(
    classifyPersonNameRow({
      id: "user-1",
      name: "Asha",
      firstName: null,
      middleName: null,
      lastName: null,
    }),
    {
      action: "backfill",
      reasons: ["single-token-review"],
      proposed: {
        name: "Asha",
        firstName: "Asha",
        middleName: null,
        lastName: null,
      },
    },
  );

  assert.deepEqual(
    classifyPersonNameRow({
      id: "student-1",
      name: "Asha Rani Devi Shah",
      firstName: null,
      middleName: null,
      lastName: null,
    }),
    {
      action: "backfill",
      reasons: ["four-plus-token-review"],
      proposed: {
        name: "Asha Rani Devi Shah",
        firstName: "Asha",
        middleName: "Rani Devi",
        lastName: "Shah",
      },
    },
  );
});

test("leaves valid populated rows unchanged", () => {
  assert.deepEqual(
    classifyPersonNameRow({
      id: "user-1",
      name: "Asha Shah",
      firstName: "Asha",
      middleName: null,
      lastName: "Shah",
    }),
    { action: "none", reasons: [], proposed: null },
  );
});

test("flags populated rows with blank parts or composition mismatches", () => {
  assert.deepEqual(
    classifyPersonNameRow({
      id: "user-1",
      name: "Asha Patel",
      firstName: " Asha ",
      middleName: " ",
      lastName: "Shah",
    }),
    {
      action: "normalize",
      reasons: ["blank-optional-part", "composition-mismatch"],
      proposed: {
        name: "Asha Shah",
        firstName: "Asha",
        middleName: null,
        lastName: "Shah",
      },
    },
  );
});
