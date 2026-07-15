-- DropIndex
DROP INDEX "EventSponsor_eventId_companyId_key";

-- CreateIndex
CREATE UNIQUE INDEX "EventSponsor_eventId_companyId_tier_key" ON "EventSponsor"("eventId", "companyId", "tier");
