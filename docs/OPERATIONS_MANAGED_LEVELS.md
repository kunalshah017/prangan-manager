# Managed semester levels operations

`semesterLevelId` is the only operational level reference. The contract
migration removes the former compatibility columns from role assignments,
student enrollments, syllabi, and exams.

## Hard-cutover procedure

Use a maintenance window because the previous application release cannot run
after the compatibility columns are removed.

1. Confirm the expand/backfill rollout completed under the previous release.
2. Take and record a Neon restore point, then test the restore procedure.
3. Stop operational writes and retain the previous release for rollback.
4. From the candidate server, run `npm run db:verify:semester-level-integrity`.
5. Review the pending SQL with `npx prisma migrate status`.
6. Apply it with `npx prisma migrate deploy` using the intended production
   `DATABASE_URL`.
7. Deploy the canonical-only server and client together.
8. Run `npm run db:verify:semester-level-integrity` again.
9. Smoke test `/health`, user management, student enrollment, syllabus, exams,
   and attendance before restoring writes.

Do not apply the contract migration if the integrity command reports missing
educator scope, orphaned, cross-semester, or duplicate canonical references. The migration
also checks these conditions while holding exclusive table locks and aborts
before dropping columns if any check fails.

The Azure deployment workflow does not apply migrations. An approved operator
must execute this sequence separately. General migration policy is documented
in [`OPERATIONS.md`](OPERATIONS.md).
