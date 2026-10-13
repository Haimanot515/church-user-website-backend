CREATE TYPE "MisbakStatus" AS ENUM ('DRAFT', 'PUBLISHED');

CREATE TABLE "Misbak" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "verse" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "meaning" TEXT NOT NULL,
    "status" "MisbakStatus" NOT NULL DEFAULT 'DRAFT',
    "languageId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Misbak_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Misbak_date_languageId_key" ON "Misbak"("date", "languageId");

CREATE INDEX "Misbak_languageId_status_date_idx" ON "Misbak"("languageId", "status", "date");

ALTER TABLE "Misbak" ADD CONSTRAINT "Misbak_languageId_fkey" FOREIGN KEY ("languageId") REFERENCES "Language"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
