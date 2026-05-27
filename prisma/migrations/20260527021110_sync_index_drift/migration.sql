-- DropIndex
DROP INDEX "occurrences_type_lastReportedAt_idx";

-- CreateIndex
CREATE INDEX "occurrences_type_lastReportedAt_idx" ON "occurrences"("type", "lastReportedAt");
