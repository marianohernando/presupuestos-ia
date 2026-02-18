-- CreateEnum
CREATE TYPE "ConsultationStatus" AS ENUM ('EN_PROGRESO', 'LISTO_PRESUPUESTO', 'PRESUPUESTADO', 'ARCHIVADO');

-- CreateEnum
CREATE TYPE "MeetingStatus" AS ENUM ('SUGERIDA', 'PENDIENTE', 'PROGRAMADA', 'COMPLETADA', 'CANCELADA');

-- AlterEnum
ALTER TYPE "ClientStatus" ADD VALUE 'PENDIENTE_CONSULTORIA';

-- CreateTable
CREATE TABLE "consultations" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "type" "FlowType" NOT NULL,
    "status" "ConsultationStatus" NOT NULL DEFAULT 'EN_PROGRESO',
    "orgChartFileUrl" TEXT,
    "orgChartFileName" TEXT,
    "orgChartData" JSONB,
    "generalScript" TEXT,
    "initialNotes" TEXT,
    "executiveSummary" TEXT,
    "totalTokensUsed" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "budgetId" TEXT,

    CONSTRAINT "consultations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meetings" (
    "id" TEXT NOT NULL,
    "consultationId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "attendees" TEXT[],
    "department" "Department",
    "status" "MeetingStatus" NOT NULL DEFAULT 'PENDIENTE',
    "suggestedByAI" BOOLEAN NOT NULL DEFAULT false,
    "script" TEXT,
    "questionsToAsk" TEXT[],
    "scheduledAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "meetings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "note_versions" (
    "id" TEXT NOT NULL,
    "meetingId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "note_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "key_points" (
    "id" TEXT NOT NULL,
    "consultationId" TEXT NOT NULL,
    "meetingId" TEXT,
    "noteVersionId" TEXT,
    "description" TEXT NOT NULL,
    "department" "Department" NOT NULL DEFAULT 'OTRO',
    "priority" INTEGER NOT NULL DEFAULT 0,
    "status" "PointStatus" NOT NULL DEFAULT 'PENDIENTE',
    "suggestedProductId" TEXT,
    "matchConfidence" DOUBLE PRECISION,
    "isValidated" BOOLEAN NOT NULL DEFAULT false,
    "isRejected" BOOLEAN NOT NULL DEFAULT false,
    "isUnknown" BOOLEAN NOT NULL DEFAULT false,
    "estimatedPrice" DECIMAL(10,2),
    "userAdjustedPrice" DECIMAL(10,2),
    "aiConfidence" DOUBLE PRECISION,
    "aiReasoning" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "key_points_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "suggested_products" (
    "id" TEXT NOT NULL,
    "consultationId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "matchReason" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "isValidated" BOOLEAN NOT NULL DEFAULT false,
    "isRejected" BOOLEAN NOT NULL DEFAULT false,
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "suggested_products_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "note_versions_meetingId_version_key" ON "note_versions"("meetingId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "suggested_products_consultationId_productId_key" ON "suggested_products"("consultationId", "productId");

-- AddForeignKey
ALTER TABLE "consultations" ADD CONSTRAINT "consultations_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meetings" ADD CONSTRAINT "meetings_consultationId_fkey" FOREIGN KEY ("consultationId") REFERENCES "consultations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "note_versions" ADD CONSTRAINT "note_versions_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "meetings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "key_points" ADD CONSTRAINT "key_points_consultationId_fkey" FOREIGN KEY ("consultationId") REFERENCES "consultations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "key_points" ADD CONSTRAINT "key_points_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "meetings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "key_points" ADD CONSTRAINT "key_points_noteVersionId_fkey" FOREIGN KEY ("noteVersionId") REFERENCES "note_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "key_points" ADD CONSTRAINT "key_points_suggestedProductId_fkey" FOREIGN KEY ("suggestedProductId") REFERENCES "suggested_products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "suggested_products" ADD CONSTRAINT "suggested_products_consultationId_fkey" FOREIGN KEY ("consultationId") REFERENCES "consultations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "suggested_products" ADD CONSTRAINT "suggested_products_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
