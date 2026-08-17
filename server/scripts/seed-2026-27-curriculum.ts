import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

const PROJECT_NAME = "Chanchalmann";
const SOURCE_SEMESTER_NAME = "Semester Year 2025-26";
const TARGET_SEMESTER_NAME = "Semester Year 2026-27";
const CLONED_LEVEL_CODES = ["LEVEL_1", "LEVEL_2", "LEVEL_3", "LEVEL_4"];
const PRIMARY_LEVEL_CODES = ["PRIMARY_A", "PRIMARY_B", "PRIMARY_C"];
const ALL_LEVEL_CODES = [...PRIMARY_LEVEL_CODES, ...CLONED_LEVEL_CODES];

type Cycle = "SA_1" | "SA_2" | "SA_3";
type TopicStatus = "PENDING" | "ONGOING" | "COMPLETED";
type TopicRow = {
  id: string;
  syllabusId: string;
  parentId: string | null;
  serialNumber: string;
  title: string;
  cycle: Cycle;
  status: TopicStatus;
  orderIndex: number;
  metadata: unknown;
};
type SourceTopic = Omit<TopicRow, "syllabusId">;
type PrimaryItem = {
  sourceNumber: number;
  title: string;
  page: number;
  section: string;
  cycle: Cycle;
};
type PrimaryVolume = {
  isbn: string;
  semester: number;
  items: PrimaryItem[];
};
type CambridgeFixture = {
  levels: Record<string, PrimaryVolume[]>;
};

export const parseCurriculumArgs = (
  args: string[],
): { apply: boolean } => {
  let apply = false;
  for (const argument of args) {
    if (argument === "--apply") apply = true;
    else throw new Error(`Unknown argument: ${argument}`);
  }
  return { apply };
};

export const buildClonedTopicRows = (
  syllabusId: string,
  topics: SourceTopic[],
  createId: () => string = randomUUID,
): TopicRow[] => {
  const ids = new Map(topics.map((topic) => [topic.id, createId()]));
  return topics
    .map((topic) => ({
      ...topic,
      id: ids.get(topic.id)!,
      syllabusId,
      parentId: topic.parentId ? (ids.get(topic.parentId) ?? null) : null,
      status: "PENDING" as const,
    }))
    .sort((left, right) => Number(Boolean(left.parentId)) - Number(Boolean(right.parentId)));
};

export const selectSourceSyllabus = <T extends { centerId: string }>(
  candidates: T[],
  targetCenterId: string,
): T | null =>
  candidates.find((candidate) => candidate.centerId === targetCenterId) ??
  candidates[0] ??
  null;

export const classifyExistingSyllabus = (
  existingTopicCount: number | null,
  expectedTopicCount: number,
): "create" | "skip" => {
  if (existingTopicCount === null || existingTopicCount === 0) return "create";
  if (existingTopicCount === expectedTopicCount) return "skip";
  throw new Error(
    `Curriculum is partially populated (${existingTopicCount}/${expectedTopicCount}); refusing to overwrite it.`,
  );
};

export const buildPrimaryTopicRows = (
  syllabusId: string,
  volumes: PrimaryVolume[],
  createId: () => string = randomUUID,
): TopicRow[] => {
  const groups = new Map<
    string,
    { id: string; volume: PrimaryVolume; section: string; cycle: Cycle; items: PrimaryItem[] }
  >();

  for (const volume of volumes) {
    for (const item of volume.items) {
      const key = `${volume.semester}:${item.cycle}:${item.section}`;
      const group = groups.get(key) ?? {
        id: createId(),
        volume,
        section: item.section,
        cycle: item.cycle,
        items: [],
      };
      group.items.push(item);
      groups.set(key, group);
    }
  }

  const grouped = [...groups.values()];
  const parents: TopicRow[] = grouped.map((group, index) => ({
    id: group.id,
    syllabusId,
    parentId: null,
    serialNumber: `S${group.volume.semester}-${group.cycle}-${index + 1}`,
    title: `${group.section} — Semester ${group.volume.semester} (${group.cycle.replace("_", "-")})`,
    cycle: group.cycle,
    status: "PENDING",
    orderIndex: index,
    metadata: {
      source: "Learn with Cambridge",
      isbn: group.volume.isbn,
      semester: group.volume.semester,
      section: group.section,
    },
  }));
  const children = grouped.flatMap((group) =>
    group.items.map((item, index) => ({
      id: createId(),
      syllabusId,
      parentId: group.id,
      serialNumber: `${group.volume.semester}.${item.sourceNumber}`,
      title: item.title,
      cycle: item.cycle,
      status: "PENDING" as const,
      orderIndex: index,
      metadata: {
        source: "Learn with Cambridge",
        isbn: group.volume.isbn,
        semester: group.volume.semester,
        page: item.page,
        sourceNumber: item.sourceNumber,
        section: item.section,
      },
    })),
  );
  return [...parents, ...children];
};

const levelName = (code: string): string =>
  code
    .toLowerCase()
    .split("_")
    .map((part) => part[0]!.toUpperCase() + part.slice(1))
    .join(" ");

const seedSyllabus = async (
  prisma: any,
  input: {
    target: any;
    semesterLevelId: string;
    code: string;
    name: string;
    description: string;
    rows: TopicRow[];
    apply: boolean;
  },
): Promise<"create" | "skip"> => {
  const key = {
    projectId: input.target.center.projectId,
    centerId: input.target.centerId,
    semesterId: input.target.id,
    semesterLevelId: input.semesterLevelId,
    name: input.name,
  };
  const existing = await prisma.syllabus.findUnique({
    where: {
      projectId_centerId_semesterId_semesterLevelId_name: key,
    },
    select: { id: true, _count: { select: { topics: true } } },
  });

  try {
    const decision = classifyExistingSyllabus(
      existing?._count.topics ?? null,
      input.rows.length,
    );
    if (decision === "skip") return decision;
  } catch (error) {
    throw new Error(
      `${input.target.center.name} ${input.code}: ${(error as Error).message}`,
    );
  }
  if (!input.apply) return "create";

  await prisma.$transaction(async (transaction: any) => {
    const syllabus =
      existing ??
      (await transaction.syllabus.create({
        data: {
          ...key,
          description: input.description,
        },
        select: { id: true },
      }));
    const rows = input.rows.map((row) => ({
      ...row,
      syllabusId: syllabus.id,
    }));
    const parents = rows.filter((row) => row.parentId === null);
    const children = rows.filter((row) => row.parentId !== null);
    if (parents.length) await transaction.syllabusTopic.createMany({ data: parents });
    if (children.length) await transaction.syllabusTopic.createMany({ data: children });
  });
  return "create";
};

export const runCurriculumSeed = async (
  options: { apply: boolean },
  prisma: any,
  fixture: CambridgeFixture,
) => {
  const project = await prisma.projects.findFirst({
    where: { name: PROJECT_NAME },
    select: { id: true },
  });
  if (!project) throw new Error(`Project "${PROJECT_NAME}" was not found.`);

  const targets = await prisma.semesters.findMany({
    where: {
      name: TARGET_SEMESTER_NAME,
      center: { projectId: project.id },
    },
    include: { center: { select: { id: true, name: true, projectId: true } } },
    orderBy: { center: { name: "asc" } },
  });
  if (!targets.length) {
    throw new Error(`No "${TARGET_SEMESTER_NAME}" semesters were found.`);
  }

  const results: Array<{
    center: string;
    academicLevelCode: string;
    topics: number;
    action: "create" | "skip" | "disabled";
  }> = [];

  for (const target of targets) {
    const activeMemberships = await prisma.semesterLevel.findMany({
      where: {
        semesterId: target.id,
        isActive: true,
        academicLevel: { code: { in: ALL_LEVEL_CODES } },
      },
      select: {
        id: true,
        academicLevel: { select: { code: true } },
      },
    });
    const memberships = new Map<string, string>(
      activeMemberships.map((membership: any) => [
        membership.academicLevel.code,
        membership.id,
      ]),
    );

    for (const code of CLONED_LEVEL_CODES) {
      const semesterLevelId = memberships.get(code);
      if (!semesterLevelId) {
        results.push({
          center: target.center.name,
          academicLevelCode: code,
          topics: 0,
          action: "disabled",
        });
        continue;
      }
      const candidates = (await prisma.syllabus.findMany({
        where: {
          projectId: project.id,
          semester: { name: SOURCE_SEMESTER_NAME },
          semesterLevel: { academicLevel: { code } },
          isActive: true,
        },
        include: {
          topics: { orderBy: [{ parentId: "asc" }, { orderIndex: "asc" }] },
        },
        orderBy: [{ createdAt: "asc" }],
      })) as Array<{
        centerId: string;
        name: string;
        topics: SourceTopic[];
      }>;
      const source = selectSourceSyllabus(candidates, target.centerId);
      if (!source) {
        throw new Error(`No ${SOURCE_SEMESTER_NAME} ${code} curriculum exists.`);
      }
      const rows = buildClonedTopicRows("pending", source.topics);
      const action = await seedSyllabus(prisma, {
        target,
        semesterLevelId,
        code,
        name: source.name,
        description: `Carried forward from ${SOURCE_SEMESTER_NAME}; progress reset for ${TARGET_SEMESTER_NAME}.`,
        rows,
        apply: options.apply,
      });
      results.push({
        center: target.center.name,
        academicLevelCode: code,
        topics: rows.length,
        action,
      });
    }

    for (const code of PRIMARY_LEVEL_CODES) {
      const semesterLevelId = memberships.get(code);
      if (!semesterLevelId) {
        results.push({
          center: target.center.name,
          academicLevelCode: code,
          topics: 0,
          action: "disabled",
        });
        continue;
      }
      const volumes = fixture.levels[code];
      if (!volumes?.length) throw new Error(`Cambridge fixture is missing ${code}.`);
      const rows = buildPrimaryTopicRows("pending", volumes);
      const action = await seedSyllabus(prisma, {
        target,
        semesterLevelId,
        code,
        name: `${levelName(code)} Complete Syllabus`,
        description: `Learn with Cambridge Semesters 1 and 2 curriculum for ${TARGET_SEMESTER_NAME}.`,
        rows,
        apply: options.apply,
      });
      results.push({
        center: target.center.name,
        academicLevelCode: code,
        topics: rows.length,
        action,
      });
    }
  }

  return {
    mode: options.apply ? "apply" : "dry-run",
    semester: TARGET_SEMESTER_NAME,
    results,
  };
};

const main = async (): Promise<void> => {
  const options = parseCurriculumArgs(process.argv.slice(2));
  const fixture = JSON.parse(
    await readFile(
      new URL("../prisma/fixtures/learn-with-cambridge-2026-27.json", import.meta.url),
      "utf8",
    ),
  ) as CambridgeFixture;
  const { prisma } = await import("../lib/prisma.js");
  try {
    console.log(JSON.stringify(await runCurriculumSeed(options, prisma, fixture), null, 2));
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
