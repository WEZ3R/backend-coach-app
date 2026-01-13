-- CreateTable
CREATE TABLE "client_coaches" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "coachId" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "client_coaches_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "client_coaches_clientId_coachId_key" ON "client_coaches"("clientId", "coachId");

-- AddForeignKey
ALTER TABLE "client_coaches" ADD CONSTRAINT "client_coaches_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "client_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_coaches" ADD CONSTRAINT "client_coaches_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "coach_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Migrate existing data: copy existing coach relationships to the new table
INSERT INTO "client_coaches" ("id", "clientId", "coachId", "isPrimary", "startDate", "isActive", "createdAt", "updatedAt")
SELECT
    gen_random_uuid(),
    "id" as "clientId",
    "coachId",
    true as "isPrimary",
    CURRENT_TIMESTAMP as "startDate",
    true as "isActive",
    CURRENT_TIMESTAMP as "createdAt",
    CURRENT_TIMESTAMP as "updatedAt"
FROM "client_profiles"
WHERE "coachId" IS NOT NULL;
