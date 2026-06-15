-- CreateTable
CREATE TABLE "opportunities" (
    "id" TEXT NOT NULL,
    "client" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "opportunity" TEXT NOT NULL,
    "description" TEXT,
    "amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "statusCode" INTEGER NOT NULL,
    "company" TEXT NOT NULL,
    "probability" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "weightedPipeline" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "owner" TEXT NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'Spain',
    "expectedClosingDate" TIMESTAMP(3),
    "blHardware" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "blIa" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "blBim" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "blTtioOm" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "blEvents" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "blProservices" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "acceptanceDate" TIMESTAMP(3),
    "week" INTEGER,
    "nextYears" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "costs" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "materialCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "peopleCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "margin" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalInvoiced" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "pendingToInvoice" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "wipStatus" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "observations" TEXT,
    "endDate" TIMESTAMP(3),
    "totalPercentage" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isInternal" BOOLEAN NOT NULL DEFAULT false,
    "driveFolderId" TEXT,
    "serviceType" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "opportunities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clients" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'Spain',
    "primaryOwner" TEXT NOT NULL DEFAULT '',
    "lastActivity" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employees" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "factorialName" TEXT,
    "company" TEXT NOT NULL DEFAULT 'MTI',
    "department" TEXT NOT NULL DEFAULT 'General',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "observations" TEXT,
    "email" TEXT,
    "hourlyCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "monthlySalary" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "availability" DOUBLE PRECISION NOT NULL DEFAULT 100,
    "factorialId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "salaries" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "salaryForecast" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "salaryReal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "hoursMonthForecast" DOUBLE PRECISION NOT NULL DEFAULT 146.5,
    "percent" DOUBLE PRECISION NOT NULL DEFAULT 100,
    "hoursMonthReal" DOUBLE PRECISION,
    "hoursPercent" DOUBLE PRECISION,
    "costHour" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "salaries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "import_history" (
    "id" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "uploadedBy" TEXT NOT NULL,
    "recordsTotal" INTEGER NOT NULL DEFAULT 0,
    "recordsOk" INTEGER NOT NULL DEFAULT 0,
    "recordsError" INTEGER NOT NULL DEFAULT 0,
    "recordsWarning" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "errorLog" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "import_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app_config" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "description" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "app_config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "factorial_project_mappings" (
    "id" TEXT NOT NULL,
    "internalProjectId" TEXT NOT NULL,
    "factorialProjectId" INTEGER,
    "factorialProjectCode" TEXT,
    "factorialProjectName" TEXT,
    "matchStatus" TEXT NOT NULL DEFAULT 'unmatched',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "factorial_project_mappings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_time_entries" (
    "id" TEXT NOT NULL,
    "internalProjectId" TEXT NOT NULL,
    "internalEmployeeId" TEXT,
    "factorialTimeRecordId" TEXT NOT NULL,
    "factorialProjectId" INTEGER,
    "factorialEmployeeId" INTEGER,
    "date" TIMESTAMP(3) NOT NULL,
    "imputedMinutes" INTEGER NOT NULL DEFAULT 0,
    "imputedHours" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "hourlyCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "calculatedCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "source" TEXT NOT NULL DEFAULT 'factorial',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_time_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_cost_summaries" (
    "id" TEXT NOT NULL,
    "internalProjectId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "totalMinutes" INTEGER NOT NULL DEFAULT 0,
    "totalHours" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalPeopleCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "employeesCount" INTEGER NOT NULL DEFAULT 0,
    "lastSyncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_cost_summaries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "billing_configs" (
    "id" TEXT NOT NULL,
    "internalProjectId" TEXT NOT NULL,
    "billingType" TEXT NOT NULL DEFAULT 'fixed',
    "monthlyAmount" DOUBLE PRECISION,
    "billingStartDate" TIMESTAMP(3),
    "billingEndDate" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "billing_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "billing_milestones" (
    "id" TEXT NOT NULL,
    "billingConfigId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "dueDate" TIMESTAMP(3),
    "invoicedAt" TIMESTAMP(3),
    "invoiceRef" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "billing_milestones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounting_entries" (
    "id" TEXT NOT NULL,
    "accountCode" TEXT NOT NULL,
    "accountName" TEXT NOT NULL,
    "entryDate" TIMESTAMP(3),
    "asiento" INTEGER,
    "concept" TEXT NOT NULL DEFAULT '',
    "rawAnalyticCode" TEXT NOT NULL,
    "resolvedProjectCode" TEXT,
    "internalProjectId" TEXT,
    "debit" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "credit" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "balance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isGeneralExpense" BOOLEAN NOT NULL DEFAULT false,
    "generalExpenseEntity" TEXT,
    "entryType" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "accounting_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activity_log" (
    "id" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "oldValue" TEXT,
    "newValue" TEXT,
    "performedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "opportunities_statusCode_idx" ON "opportunities"("statusCode");

-- CreateIndex
CREATE INDEX "opportunities_company_idx" ON "opportunities"("company");

-- CreateIndex
CREATE INDEX "opportunities_owner_idx" ON "opportunities"("owner");

-- CreateIndex
CREATE INDEX "opportunities_country_idx" ON "opportunities"("country");

-- CreateIndex
CREATE INDEX "opportunities_client_idx" ON "opportunities"("client");

-- CreateIndex
CREATE INDEX "opportunities_serviceType_idx" ON "opportunities"("serviceType");

-- CreateIndex
CREATE UNIQUE INDEX "clients_name_key" ON "clients"("name");

-- CreateIndex
CREATE UNIQUE INDEX "employees_name_key" ON "employees"("name");

-- CreateIndex
CREATE INDEX "employees_company_idx" ON "employees"("company");

-- CreateIndex
CREATE INDEX "employees_department_idx" ON "employees"("department");

-- CreateIndex
CREATE INDEX "employees_isActive_idx" ON "employees"("isActive");

-- CreateIndex
CREATE INDEX "salaries_employeeId_idx" ON "salaries"("employeeId");

-- CreateIndex
CREATE INDEX "salaries_year_month_idx" ON "salaries"("year", "month");

-- CreateIndex
CREATE UNIQUE INDEX "salaries_employeeId_year_month_key" ON "salaries"("employeeId", "year", "month");

-- CreateIndex
CREATE UNIQUE INDEX "app_config_key_key" ON "app_config"("key");

-- CreateIndex
CREATE UNIQUE INDEX "factorial_project_mappings_internalProjectId_key" ON "factorial_project_mappings"("internalProjectId");

-- CreateIndex
CREATE INDEX "factorial_project_mappings_matchStatus_idx" ON "factorial_project_mappings"("matchStatus");

-- CreateIndex
CREATE UNIQUE INDEX "project_time_entries_factorialTimeRecordId_key" ON "project_time_entries"("factorialTimeRecordId");

-- CreateIndex
CREATE INDEX "project_time_entries_internalProjectId_idx" ON "project_time_entries"("internalProjectId");

-- CreateIndex
CREATE INDEX "project_time_entries_internalEmployeeId_idx" ON "project_time_entries"("internalEmployeeId");

-- CreateIndex
CREATE INDEX "project_time_entries_date_idx" ON "project_time_entries"("date");

-- CreateIndex
CREATE INDEX "project_time_entries_internalProjectId_date_idx" ON "project_time_entries"("internalProjectId", "date");

-- CreateIndex
CREATE INDEX "project_cost_summaries_internalProjectId_idx" ON "project_cost_summaries"("internalProjectId");

-- CreateIndex
CREATE UNIQUE INDEX "project_cost_summaries_internalProjectId_startDate_endDate_key" ON "project_cost_summaries"("internalProjectId", "startDate", "endDate");

-- CreateIndex
CREATE UNIQUE INDEX "billing_configs_internalProjectId_key" ON "billing_configs"("internalProjectId");

-- CreateIndex
CREATE INDEX "billing_milestones_billingConfigId_idx" ON "billing_milestones"("billingConfigId");

-- CreateIndex
CREATE INDEX "accounting_entries_internalProjectId_idx" ON "accounting_entries"("internalProjectId");

-- CreateIndex
CREATE INDEX "accounting_entries_entryDate_idx" ON "accounting_entries"("entryDate");

-- CreateIndex
CREATE INDEX "accounting_entries_accountCode_idx" ON "accounting_entries"("accountCode");

-- CreateIndex
CREATE INDEX "accounting_entries_entryType_idx" ON "accounting_entries"("entryType");

-- CreateIndex
CREATE INDEX "activity_log_entityType_entityId_idx" ON "activity_log"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "activity_log_createdAt_idx" ON "activity_log"("createdAt");

-- AddForeignKey
ALTER TABLE "salaries" ADD CONSTRAINT "salaries_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_time_entries" ADD CONSTRAINT "project_time_entries_internalProjectId_fkey" FOREIGN KEY ("internalProjectId") REFERENCES "factorial_project_mappings"("internalProjectId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_cost_summaries" ADD CONSTRAINT "project_cost_summaries_internalProjectId_fkey" FOREIGN KEY ("internalProjectId") REFERENCES "factorial_project_mappings"("internalProjectId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_configs" ADD CONSTRAINT "billing_configs_internalProjectId_fkey" FOREIGN KEY ("internalProjectId") REFERENCES "opportunities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_milestones" ADD CONSTRAINT "billing_milestones_billingConfigId_fkey" FOREIGN KEY ("billingConfigId") REFERENCES "billing_configs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounting_entries" ADD CONSTRAINT "accounting_entries_internalProjectId_fkey" FOREIGN KEY ("internalProjectId") REFERENCES "opportunities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

