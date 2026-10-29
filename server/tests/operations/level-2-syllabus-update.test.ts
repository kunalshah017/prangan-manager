import assert from "node:assert/strict";
import test from "node:test";

import {
  parseUpdateArgs,
  planBookTopicChanges,
} from "../../scripts/update-level-2-communicate-syllabus.js";

const topic = (
  id: string,
  parentId: string | null,
  title: string,
  status: "PENDING" | "ONGOING" | "COMPLETED" = "PENDING",
) => ({ id, parentId, serialNumber: id, title, status });

test("level 2 syllabus update is a dry run unless apply is explicit", () => {
  assert.deepEqual(parseUpdateArgs([]), { apply: false });
  assert.deepEqual(parseUpdateArgs(["--apply"]), { apply: true });
  assert.throws(() => parseUpdateArgs(["--force"]), /Unknown argument/);
});

test("replaced texts restart progress while spelling fixes keep it", () => {
  const { changes, unrecognized } = planBookTopicChanges([
    topic("1", null, "Communicate with Cambridge"),
    topic("1.1", "1", "The Camel and The Trader", "COMPLETED"),
    topic("1.3", "1", "Well Done,Polly!", "ONGOING"),
    topic("4.2", "1", "The King and the Spider", "COMPLETED"),
    topic("2", null, "Poem"),
    topic("2.1", "2", "How they Sleep", "ONGOING"),
    topic("2.9", "2", "A Custom Poem"),
    topic("3", null, "Grammar Gear"),
    topic("3.1", "3", "The Swing"),
  ]);

  assert.deepEqual(
    changes.map(({ id, to, nextStatus }) => ({ id, to, nextStatus })),
    [
      { id: "1.1", to: "The Magical Pearl", nextStatus: "PENDING" },
      { id: "1.3", to: "Well Done, Polly!", nextStatus: "ONGOING" },
      { id: "2.1", to: "The Jumblies", nextStatus: "PENDING" },
    ],
  );
  assert.deepEqual(
    unrecognized.map(({ id }) => id),
    ["2.9"],
  );
});

test("level 2 syllabus update is idempotent", () => {
  const { changes, unrecognized } = planBookTopicChanges([
    topic("1", null, "Communicate with Cambridge"),
    topic("1.1", "1", "The Magical Pearl"),
    topic("1.3", "1", "Well Done, Polly!"),
    topic("2", null, "Poem"),
    topic("2.2", "2", "Frogs at School"),
  ]);
  assert.deepEqual(changes, []);
  assert.deepEqual(unrecognized, []);
});
