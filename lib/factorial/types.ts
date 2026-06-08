// Factorial API response types

export interface FactorialProject {
  id: number;
  name: string;
  code: string | null;
  description: string | null;
  status: string; // "active" | "archived" | "closed"
  company_id: number;
}

export interface FactorialEmployee {
  id: number;
  first_name: string;
  last_name: string;
  full_name?: string;
  email: string | null;
  company_id: number;
}

// Actual shape from /api/.../resources/project-management/project-workers
export interface FactorialProjectWorker {
  id: number;
  project_id: number;
  employee_id: number;
  assigned: boolean;
  inputed_minutes: number; // note: "inputed" is the spelling Factorial uses
  labor_cost_cents: number | null;
  company_labor_cost_cents: number | null;
}

// Actual shape from /api/.../resources/project-management/time-records
export interface FactorialTimeRecord {
  id: number;
  project_worker_id: number; // joins to FactorialProjectWorker.id
  attendance_shift_id: number | null;
  subproject_id: number | null;
  date: string; // "YYYY-MM-DD"
  imputed_minutes: number | null;
}

// Internal types for sync operations

export interface EmployeeMatchResult {
  factorialEmployeeId: number;
  factorialName: string;
  factorialEmail: string | null;
  internalEmployeeId: string | null;
  internalName: string | null;
  matchMethod: 'factorialId' | 'email' | 'name' | 'unmatched';
  hourlyCost: number;
  needsReview: boolean;
}

export interface ProjectMatchResult {
  internalProjectId: string;
  internalName: string;
  factorialProjectId: number | null;
  factorialCode: string | null;
  factorialName: string | null;
  matchMethod: 'code' | 'manual' | 'unmatched';
}

export interface SyncPreviewResult {
  internalProjectsCount: number;
  factorialProjectsCount: number;
  matchedProjectsCount: number;
  unmatchedProjects: { id: string; name: string }[];
  factorialProjectsWithoutCode: { id: number; name: string }[];
  employeesMatchedCount: number;
  employeesUnmatched: { factorialId: number; name: string; email: string | null }[];
  timeRecordsTotal: number;
  timeRecordsValid: number;
  timeRecordsIgnored: number;
  estimatedTotalCost: number;
  projectCosts: { projectId: string; projectName: string; hours: number; cost: number }[];
  warnings: string[];
  errors: string[];
}

export interface SyncResult {
  projectsProcessed: number;
  timeEntriesUpserted: number;
  costSummariesUpdated: number;
  warnings: string[];
  errors: string[];
  projectSummaries: {
    projectId: string;
    totalHours: number;
    totalPeopleCost: number;
    employeesCount: number;
  }[];
}
