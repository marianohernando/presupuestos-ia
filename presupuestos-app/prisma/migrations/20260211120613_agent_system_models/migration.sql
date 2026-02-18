-- CreateEnum
CREATE TYPE "FlowType" AS ENUM ('CONSULTORIA', 'DIAGNOSTICO');

-- CreateEnum
CREATE TYPE "ClientStatus" AS ENUM ('NUEVO', 'EN_PROCESO', 'PRESUPUESTADO', 'CERRADO', 'ARCHIVADO');

-- CreateEnum
CREATE TYPE "BudgetStatus" AS ENUM ('BORRADOR', 'ENVIADO', 'ACEPTADO', 'RECHAZADO', 'EXPIRADO');

-- CreateEnum
CREATE TYPE "DiagnosticRecommendation" AS ENUM ('PILOTO', 'DESARROLLO_COMPLETO', 'PIVOTAR_CONSULTORIA');

-- CreateEnum
CREATE TYPE "MaintenanceType" AS ENUM ('HORAS', 'TOKENS', 'INCIDENCIAS', 'SLA');

-- CreateEnum
CREATE TYPE "Department" AS ENUM ('MARKETING', 'ATENCION_CLIENTE', 'INFRAESTRUCTURA', 'NEGOCIO', 'OTRO');

-- CreateEnum
CREATE TYPE "PointStatus" AS ENUM ('PENDIENTE', 'MATCHED', 'UNKNOWN', 'VALIDATED', 'REJECTED');

-- CreateEnum
CREATE TYPE "AgentState" AS ENUM ('INICIO', 'CLASIFICANDO', 'DECIDIDO', 'NORMALIZANDO', 'MATCHING', 'INVESTIGANDO', 'CLARIFICANDO', 'GENERANDO', 'COMPLETADO');

-- CreateTable
CREATE TABLE "clients" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "company" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "notes" TEXT,
    "flowType" "FlowType",
    "status" "ClientStatus" NOT NULL DEFAULT 'NUEVO',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "internalReference" TEXT,
    "category" TEXT,
    "descriptionPublic" TEXT,
    "descriptionInternal" TEXT,
    "price" DECIMAL(10,2) NOT NULL,
    "cost" DECIMAL(10,2),
    "estimatedHours" DECIMAL(6,2),
    "unitOfMeasure" TEXT,
    "tags" TEXT[],
    "embedding" DOUBLE PRECISION[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "budgets" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" "BudgetStatus" NOT NULL DEFAULT 'BORRADOR',
    "summary" TEXT,
    "scope" TEXT,
    "assumptions" TEXT,
    "risks" TEXT,
    "validUntil" TIMESTAMP(3),
    "subtotal" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "discount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "taxes" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "maintenanceType" "MaintenanceType",
    "maintenanceTokens" INTEGER,
    "maintenanceHours" DECIMAL(6,2),
    "maintenanceMonthly" DECIMAL(10,2),
    "maintenanceSLA" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "budgets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "budget_items" (
    "id" TEXT NOT NULL,
    "budgetId" TEXT NOT NULL,
    "productId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitPrice" DECIMAL(10,2) NOT NULL,
    "hoursMin" DECIMAL(6,2),
    "hoursMed" DECIMAL(6,2),
    "hoursMax" DECIMAL(6,2),
    "assumptions" TEXT,
    "risks" TEXT,
    "aiGenerated" BOOLEAN NOT NULL DEFAULT false,
    "aiReasoning" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "budget_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "budget_versions" (
    "id" TEXT NOT NULL,
    "budgetId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "snapshot" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,

    CONSTRAINT "budget_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "thread_contexts" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "state" "AgentState" NOT NULL DEFAULT 'INICIO',
    "flowType" "FlowType",
    "history" JSONB NOT NULL DEFAULT '[]',
    "lastAgentRun" TIMESTAMP(3),
    "totalTokensUsed" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "thread_contexts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meeting_versions" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "title" TEXT,
    "rawNotes" TEXT NOT NULL,
    "isNormalized" BOOLEAN NOT NULL DEFAULT false,
    "normalizedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "meeting_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "normalized_points" (
    "id" TEXT NOT NULL,
    "meetingVersionId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "department" "Department" NOT NULL DEFAULT 'OTRO',
    "status" "PointStatus" NOT NULL DEFAULT 'PENDIENTE',
    "priority" INTEGER NOT NULL DEFAULT 0,
    "aiConfidence" DOUBLE PRECISION,
    "aiReasoning" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "normalized_points_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_matches" (
    "id" TEXT NOT NULL,
    "normalizedPointId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isValidated" BOOLEAN NOT NULL DEFAULT false,
    "validatedAt" TIMESTAMP(3),
    "isRejected" BOOLEAN NOT NULL DEFAULT false,
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_matches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "unknown_items" (
    "id" TEXT NOT NULL,
    "normalizedPointId" TEXT NOT NULL,
    "webResearch" TEXT,
    "webSources" TEXT[],
    "estimatedHours" DECIMAL(6,2),
    "estimatedPrice" DECIMAL(10,2),
    "estimationReason" TEXT,
    "similarProductIds" TEXT[],
    "isApproved" BOOLEAN NOT NULL DEFAULT false,
    "userAdjustedPrice" DECIMAL(10,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "unknown_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clarification_questions" (
    "id" TEXT NOT NULL,
    "budgetId" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "suggestedAnswers" TEXT[],
    "answer" TEXT,
    "answeredAt" TIMESTAMP(3),
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clarification_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_actions" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "input" JSONB NOT NULL,
    "output" JSONB NOT NULL,
    "model" TEXT NOT NULL,
    "tokens" INTEGER,
    "duration" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "clientId" TEXT,
    "budgetId" TEXT,

    CONSTRAINT "ai_actions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "products_internalReference_key" ON "products"("internalReference");

-- CreateIndex
CREATE UNIQUE INDEX "thread_contexts_clientId_key" ON "thread_contexts"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "meeting_versions_clientId_version_key" ON "meeting_versions"("clientId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "product_matches_normalizedPointId_key" ON "product_matches"("normalizedPointId");

-- CreateIndex
CREATE UNIQUE INDEX "unknown_items_normalizedPointId_key" ON "unknown_items"("normalizedPointId");

-- AddForeignKey
ALTER TABLE "budgets" ADD CONSTRAINT "budgets_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "budget_items" ADD CONSTRAINT "budget_items_budgetId_fkey" FOREIGN KEY ("budgetId") REFERENCES "budgets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "budget_items" ADD CONSTRAINT "budget_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "budget_versions" ADD CONSTRAINT "budget_versions_budgetId_fkey" FOREIGN KEY ("budgetId") REFERENCES "budgets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "thread_contexts" ADD CONSTRAINT "thread_contexts_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meeting_versions" ADD CONSTRAINT "meeting_versions_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "normalized_points" ADD CONSTRAINT "normalized_points_meetingVersionId_fkey" FOREIGN KEY ("meetingVersionId") REFERENCES "meeting_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_matches" ADD CONSTRAINT "product_matches_normalizedPointId_fkey" FOREIGN KEY ("normalizedPointId") REFERENCES "normalized_points"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_matches" ADD CONSTRAINT "product_matches_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "unknown_items" ADD CONSTRAINT "unknown_items_normalizedPointId_fkey" FOREIGN KEY ("normalizedPointId") REFERENCES "normalized_points"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clarification_questions" ADD CONSTRAINT "clarification_questions_budgetId_fkey" FOREIGN KEY ("budgetId") REFERENCES "budgets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_actions" ADD CONSTRAINT "ai_actions_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_actions" ADD CONSTRAINT "ai_actions_budgetId_fkey" FOREIGN KEY ("budgetId") REFERENCES "budgets"("id") ON DELETE SET NULL ON UPDATE CASCADE;
