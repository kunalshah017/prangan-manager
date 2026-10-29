import { pathToFileURL } from "node:url";

const PROJECT_NAME = "Chanchalmann";
const TARGET_SEMESTER_NAME = "Semester Year 2026-27";
const LEVEL_CODE = "LEVEL_2";
const BOOK_PARENT_TITLES = ["Communicate with Cambridge", "Poem"];

type TopicStatus = "PENDING" | "ONGOING" | "COMPLETED";
type Topic = {
  id: string;
  parentId: string | null;
  serialNumber: string;
  title: string;
  status: TopicStatus;
};
type Replacement = { title: string; resetProgress: boolean };
export type TopicChange = {
  id: string;
  serialNumber: string;
  from: string;
  to: string;
  status: TopicStatus;
  nextStatus: TopicStatus;
};

const normalize = (title: string): string =>
  title.toLowerCase().replace(/[^a-z0-9]/g, "");

// Coursebook 2 (ISBN 978-1-009-83371-4) replaces these older-edition texts.
// Spelling-only fixes keep progress; replaced stories and poems restart.
const REPLACEMENTS = new Map<string, Replacement>(
  [
    ["The Camel and The Trader", "The Magical Pearl", true],
    ["Bukka Learns a Lesson", "Where is My Pet?", true],
    ["Well Done,Polly!", "Well Done, Polly!", false],
    ["How they Sleep", "The Jumblies", true],
    ["A worm in my Pocket", "Cats", true],
    ["The Swing", "A Good Boy", true],
    ["Kiki and Croc", "Belling the Cat", true],
    ["Spectacles for the Headman", "The Tale of Dog and Wolf", true],
    ["Frogs At School", "Frogs at School", false],
  ].map(([from, title, resetProgress]) => [
    normalize(from as string),
    { title: title as string, resetProgress: resetProgress as boolean },
  ]),
);
const CURRENT_TITLES = new Set([
  "The King and the Spider",
  "The Banyan Tree",
  "The Growing River",
  "The Chain of Smiles",
  "The Two Frogs",
  "What Makes You Laugh?",
  ...[...REPLACEMENTS.values()].map((replacement) => replacement.title),
]);

export const parseUpdateArgs = (args: string[]): { apply: boolean } => {
  let apply = false;
  for (const argument of args) {
    if (argument === "--apply") apply = true;
    else throw new Error(`Unknown argument: ${argument}`);
  }
  return { apply };
};

export const planBookTopicChanges = (
  topics: Topic[],
): { changes: TopicChange[]; unrecognized: Topic[] } => {
  const parentIds = new Set(
    topics
      .filter(
        (topic) =>
          topic.parentId === null && BOOK_PARENT_TITLES.includes(topic.title),
      )
      .map((topic) => topic.id),
  );
  const changes: TopicChange[] = [];
  const unrecognized: Topic[] = [];

  for (const topic of topics) {
    if (!topic.parentId || !parentIds.has(topic.parentId)) continue;
    if (CURRENT_TITLES.has(topic.title)) continue;
    const replacement = REPLACEMENTS.get(normalize(topic.title));
    if (!replacement) {
      unrecognized.push(topic);
      continue;
    }
    changes.push({
      id: topic.id,
      serialNumber: topic.serialNumber,
      from: topic.title,
      to: replacement.title,
      status: topic.status,
      nextStatus: replacement.resetProgress ? "PENDING" : topic.status,
    });
  }
  return { changes, unrecognized };
};

export const runLevel2SyllabusUpdate = async (
  options: { apply: boolean },
  prisma: any,
) => {
  const syllabi = (await prisma.syllabus.findMany({
    where: {
      project: { name: PROJECT_NAME },
      semester: { name: TARGET_SEMESTER_NAME },
      semesterLevel: { academicLevel: { code: LEVEL_CODE } },
    },
    select: {
      id: true,
      name: true,
      center: { select: { name: true } },
      topics: {
        select: {
          id: true,
          parentId: true,
          serialNumber: true,
          title: true,
          status: true,
        },
        orderBy: [{ orderIndex: "asc" }],
      },
    },
    orderBy: { center: { name: "asc" } },
  })) as Array<{
    id: string;
    name: string;
    center: { name: string };
    topics: Topic[];
  }>;
  if (!syllabi.length) {
    throw new Error(
      `No ${LEVEL_CODE} syllabus was found for "${TARGET_SEMESTER_NAME}".`,
    );
  }

  const results = [];
  for (const syllabus of syllabi) {
    const { changes, unrecognized } = planBookTopicChanges(syllabus.topics);
    if (options.apply && changes.length) {
      await prisma.$transaction(
        changes.map((change) =>
          prisma.syllabusTopic.update({
            where: { id: change.id },
            data: { title: change.to, status: change.nextStatus },
          }),
        ),
      );
    }
    results.push({
      center: syllabus.center.name,
      syllabus: syllabus.name,
      changes: changes.map(
        (change) =>
          `${change.serialNumber} "${change.from}" -> "${change.to}" (${change.status} -> ${change.nextStatus})`,
      ),
      unrecognized: unrecognized.map(
        (topic) => `${topic.serialNumber} "${topic.title}" (left unchanged)`,
      ),
    });
  }

  return {
    mode: options.apply ? "apply" : "dry-run",
    semester: TARGET_SEMESTER_NAME,
    results,
  };
};

const main = async (): Promise<void> => {
  const options = parseUpdateArgs(process.argv.slice(2));
  const { prisma } = await import("../lib/prisma.js");
  try {
    console.log(
      JSON.stringify(await runLevel2SyllabusUpdate(options, prisma), null, 2),
    );
  } finally {
    await prisma.$disconnect();
  }
};

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  void main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
