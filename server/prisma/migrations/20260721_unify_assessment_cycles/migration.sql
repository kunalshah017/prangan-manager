BEGIN;

LOCK TABLE "SyllabusTopic" IN ACCESS EXCLUSIVE MODE;
LOCK TABLE "Exam" IN ACCESS EXCLUSIVE MODE;

ALTER TYPE "ExamCycle" RENAME TO "AssessmentCycle";

DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "SyllabusTopic"
    WHERE "cycle" IS NULL
       OR "cycle" NOT IN ('SA-1', 'SA-2', 'SA-3')
  ) THEN
    RAISE EXCEPTION
      'Cannot migrate SyllabusTopic.cycle: null or invalid values exist; expected only SA-1, SA-2, or SA-3';
  END IF;
END
$migration$;

ALTER TABLE "SyllabusTopic"
  ALTER COLUMN "cycle" TYPE "AssessmentCycle"
  USING CASE "cycle"
    WHEN 'SA-1' THEN 'SA_1'::"AssessmentCycle"
    WHEN 'SA-2' THEN 'SA_2'::"AssessmentCycle"
    WHEN 'SA-3' THEN 'SA_3'::"AssessmentCycle"
  END,
  ALTER COLUMN "cycle" SET NOT NULL;

ALTER TABLE "SyllabusTopic"
  ADD CONSTRAINT "SyllabusTopic_cycle_curriculum_check"
  CHECK ("cycle" <> 'PRE_ASSESSMENT'::"AssessmentCycle");

DROP INDEX "Exam_projectId_centerId_semesterId_level_name_key";
DROP INDEX "Exam_projectId_centerId_semesterId_level_idx";

CREATE UNIQUE INDEX "Exam_projectId_centerId_semesterId_level_cycle_name_key"
  ON "Exam"("projectId", "centerId", "semesterId", "level", "cycle", "name");

CREATE INDEX "Exam_projectId_centerId_semesterId_level_cycle_idx"
  ON "Exam"("projectId", "centerId", "semesterId", "level", "cycle");

COMMIT;