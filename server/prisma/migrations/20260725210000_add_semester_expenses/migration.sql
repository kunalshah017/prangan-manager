CREATE TYPE "ExpenseStatus" AS ENUM ('ACTIVE', 'VOIDED');

CREATE TABLE "Expense" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "centerId" TEXT NOT NULL,
    "semesterId" TEXT NOT NULL,
    "expenseType" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "incurredOn" DATE NOT NULL,
    "notes" TEXT,
    "payeeUserId" TEXT,
    "sourceKey" TEXT,
    "metadata" JSONB,
    "status" "ExpenseStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdBy" TEXT NOT NULL,
    "voidedBy" TEXT,
    "voidedAt" TIMESTAMP(3),
    "voidReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Expense_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Expense_amount_nonnegative" CHECK ("amount" >= 0),
    CONSTRAINT "Expense_void_metadata_complete" CHECK (
      (
        "status" = 'ACTIVE'
        AND "voidedBy" IS NULL
        AND "voidedAt" IS NULL
        AND "voidReason" IS NULL
      )
      OR
      (
        "status" = 'VOIDED'
        AND "voidedBy" IS NOT NULL
        AND "voidedAt" IS NOT NULL
        AND "voidReason" IS NOT NULL
        AND btrim("voidReason") <> ''
      )
    )
);

CREATE UNIQUE INDEX "Expense_sourceKey_key" ON "Expense"("sourceKey");
CREATE INDEX "Expense_projectId_centerId_semesterId_incurredOn_idx"
ON "Expense"("projectId", "centerId", "semesterId", "incurredOn");
CREATE INDEX "Expense_semesterId_expenseType_status_incurredOn_idx"
ON "Expense"("semesterId", "expenseType", "status", "incurredOn");
CREATE INDEX "Expense_payeeUserId_semesterId_incurredOn_idx"
ON "Expense"("payeeUserId", "semesterId", "incurredOn");

ALTER TABLE "Expense"
ADD CONSTRAINT "Expense_projectId_fkey"
FOREIGN KEY ("projectId") REFERENCES "Projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Expense"
ADD CONSTRAINT "Expense_centerId_fkey"
FOREIGN KEY ("centerId") REFERENCES "Centers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Expense"
ADD CONSTRAINT "Expense_semesterId_fkey"
FOREIGN KEY ("semesterId") REFERENCES "Semesters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Expense"
ADD CONSTRAINT "Expense_payeeUserId_fkey"
FOREIGN KEY ("payeeUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Expense"
ADD CONSTRAINT "Expense_createdBy_fkey"
FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Expense"
ADD CONSTRAINT "Expense_voidedBy_fkey"
FOREIGN KEY ("voidedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
