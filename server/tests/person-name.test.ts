import assert from "node:assert/strict";
import test from "node:test";

import {
  composePersonName,
  normalizePersonName,
  parseLegacyPersonName,
  resolvePersonNameCreate,
  resolvePersonNameUpdate,
} from "../lib/person-name.js";

test("parses legacy names deterministically by token count", () => {
  const cases = [
    ["Asha", { firstName: "Asha", middleName: null, lastName: null }],
    ["Asha Shah", { firstName: "Asha", middleName: null, lastName: "Shah" }],
    [
      "Asha Rani Shah",
      { firstName: "Asha", middleName: "Rani", lastName: "Shah" },
    ],
    [
      "  Asha   Rani  Devi   Shah  ",
      { firstName: "Asha", middleName: "Rani Devi", lastName: "Shah" },
    ],
  ] as const;

  for (const [legacyName, expected] of cases) {
    assert.deepEqual(parseLegacyPersonName(legacyName), expected);
    assert.equal(composePersonName(expected), normalizePersonName(legacyName));
  }
});

test("preserves spelling, case, apostrophes, and hyphens", () => {
  assert.deepEqual(parseLegacyPersonName("Mary-Jane O'Neil"), {
    firstName: "Mary-Jane",
    middleName: null,
    lastName: "O'Neil",
  });
  assert.equal(normalizePersonName("  de  Silva "), "de Silva");
});

test("rejects an empty legacy or structured first name", () => {
  assert.throws(() => parseLegacyPersonName("   "), /First name is required/);
  assert.throws(
    () => resolvePersonNameCreate({ firstName: "  " }),
    /First name is required/,
  );
});

test("normalizes structured create input and optional empty values", () => {
  assert.deepEqual(
    resolvePersonNameCreate({
      firstName: "  Asha ",
      middleName: "  ",
      lastName: "  Shah  ",
    }),
    {
      name: "Asha Shah",
      firstName: "Asha",
      middleName: null,
      lastName: "Shah",
    },
  );
});

test("supports legacy-only create input", () => {
  assert.deepEqual(resolvePersonNameCreate({ name: "Asha Rani Shah" }), {
    name: "Asha Rani Shah",
    firstName: "Asha",
    middleName: "Rani",
    lastName: "Shah",
  });
});

test("accepts agreeing mixed input and rejects conflicts", () => {
  assert.deepEqual(
    resolvePersonNameCreate({
      name: " Asha  Shah ",
      firstName: "Asha",
      lastName: "Shah",
    }),
    {
      name: "Asha Shah",
      firstName: "Asha",
      middleName: null,
      lastName: "Shah",
    },
  );

  assert.throws(
    () =>
      resolvePersonNameCreate({
        name: "Asha Patel",
        firstName: "Asha",
        lastName: "Shah",
      }),
    /does not match structured name fields/,
  );
});

test("returns null when an update contains no name fields", () => {
  assert.equal(
    resolvePersonNameUpdate(
      { phone: "9000000000" } as Record<string, unknown>,
      { firstName: "Asha", middleName: null, lastName: "Shah" },
    ),
    null,
  );
});

test("merges partial structured updates and clears optional values", () => {
  const current = {
    firstName: "Asha",
    middleName: "Rani",
    lastName: "Shah",
  };

  assert.deepEqual(resolvePersonNameUpdate({ middleName: null }, current), {
    name: "Asha Shah",
    firstName: "Asha",
    middleName: null,
    lastName: "Shah",
  });
  assert.deepEqual(resolvePersonNameUpdate({ lastName: "" }, current), {
    name: "Asha Rani",
    firstName: "Asha",
    middleName: "Rani",
    lastName: null,
  });
});

test("supports legacy-only updates and rejects conflicting mixed updates", () => {
  const current = {
    firstName: "Asha",
    middleName: null,
    lastName: "Shah",
  };

  assert.deepEqual(resolvePersonNameUpdate({ name: "Asha Patel" }, current), {
    name: "Asha Patel",
    firstName: "Asha",
    middleName: null,
    lastName: "Patel",
  });
  assert.throws(
    () =>
      resolvePersonNameUpdate(
        { name: "Asha Patel", lastName: "Shah" },
        current,
      ),
    /does not match structured name fields/,
  );
});
