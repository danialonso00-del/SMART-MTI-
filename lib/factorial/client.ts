import type {
  FactorialProject,
  FactorialEmployee,
  FactorialTimeRecord,
  FactorialProjectWorker,
} from './types';

// Factorial uses date-based API versioning, released quarterly
const API_VERSION_EMPLOYEES = '2026-04-01';
const API_VERSION_PROJECTS  = '2025-07-01'; // also works for project-workers and time-records

const BASE_URL = (process.env.FACTORIAL_API_BASE_URL || 'https://api.factorialhr.com').replace(/\/$/, '');

// All Factorial calls go through here
// Auth: x-api-key header (NOT Authorization: Bearer)
export async function factorialFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const apiKey = process.env.FACTORIAL_API_KEY;
  if (!apiKey) throw new Error('FACTORIAL_API_KEY not configured in environment variables');

  const url = `${BASE_URL}${path}`;
  console.log(`[Factorial] ${options?.method || 'GET'} ${path}`);

  const response = await fetch(url, {
    ...options,
    headers: {
      'x-api-key':    apiKey,
      'Accept':       'application/json',
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (response.status === 401) throw new Error('Factorial: Unauthorized — API key inválida o expirada');
  if (response.status === 403) throw new Error('Factorial: Forbidden — la API key no tiene permisos suficientes');
  if (response.status === 404) throw new Error(`Factorial: Recurso no encontrado (${path})`);
  if (response.status === 429) {
    const retry = response.headers.get('Retry-After');
    throw new Error(`Factorial: Rate limited${retry ? ` (retry after ${retry}s)` : ''}`);
  }
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`Factorial: HTTP ${response.status}${text ? ` — ${text.slice(0, 200)}` : ''}`);
  }

  const json = await response.json();
  // Factorial wraps responses in { data: [...], meta: {...} }
  return (Array.isArray(json?.data) ? json.data : json) as T;
}

// Factorial returns up to 100 records per page
const PAGE_SIZE = 100;

async function fetchAllPages<T>(basePath: string): Promise<T[]> {
  const results: T[] = [];
  const sep = basePath.includes('?') ? '&' : '?';

  // Fetch pages until we get an empty response.
  // We do NOT stop early when a page returns < PAGE_SIZE because Factorial can return
  // uneven page sizes on intermediate pages while still having more data on subsequent pages.
  // Cap at 100 pages (10,000 records) to prevent runaway loops.
  for (let page = 1; page <= 100; page++) {
    const batch = await factorialFetch<T[]>(`${basePath}${sep}page=${page}`);
    if (!Array.isArray(batch) || batch.length === 0) break;
    results.push(...batch);
  }

  return results;
}

function deduplicateById<T extends { id: number }>(items: T[]): T[] {
  const seen = new Set<number>();
  return items.filter(item => seen.has(item.id) ? false : !!seen.add(item.id));
}

export async function getFactorialEmployees(): Promise<FactorialEmployee[]> {
  const all = await fetchAllPages<FactorialEmployee>(
    `/api/${API_VERSION_EMPLOYEES}/resources/employees/employees`,
  );
  return deduplicateById(all);
}

export async function getFactorialProjects(): Promise<FactorialProject[]> {
  const all = await fetchAllPages<FactorialProject>(
    `/api/${API_VERSION_PROJECTS}/resources/project-management/projects`,
  );
  return deduplicateById(all);
}

export async function getAllProjectWorkers(): Promise<FactorialProjectWorker[]> {
  const all = await fetchAllPages<FactorialProjectWorker>(
    `/api/${API_VERSION_PROJECTS}/resources/project-management/project-workers`,
  );
  return deduplicateById(all);
}

export interface TimeRecordParams {
  startDate?: string; // YYYY-MM-DD
  endDate?: string;
  projectWorkerId?: number;
}

export async function getAllTimeRecords(
  params: Omit<TimeRecordParams, 'page'>,
): Promise<FactorialTimeRecord[]> {
  const qs = new URLSearchParams();
  if (params.startDate)       qs.set('date_gteq',        params.startDate);
  if (params.endDate)         qs.set('date_lteq',         params.endDate);
  if (params.projectWorkerId) qs.set('project_worker_id', String(params.projectWorkerId));

  const basePath = `/api/${API_VERSION_PROJECTS}/resources/project-management/time-records${qs.toString() ? '?' + qs.toString() : ''}`;
  return fetchAllPages<FactorialTimeRecord>(basePath);
}

export async function testFactorialConnection(): Promise<{
  ok: boolean;
  projectsCount?: number;
  employeesCount?: number;
  error?: string;
}> {
  try {
    const [projects, employees] = await Promise.all([
      getFactorialProjects(),
      getFactorialEmployees(),
    ]);
    return {
      ok: true,
      projectsCount: Array.isArray(projects) ? projects.length : 0,
      employeesCount: Array.isArray(employees) ? employees.length : 0,
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

// Build a lookup map for Factorial projects supporting three matching strategies:
// 1. Exact code match: code="25-009" → "25-009"
// 2. Code prefix match: code="25-016_TTiO-TICKETING" → "25-016"
// 3. Name prefix match: name="25-088_TEKIA_..." with code=null → "25-088"
//    (fallback for projects where the API returns code as null but name encodes it)
export function buildProjectCodeMap(
  factorialProjects: FactorialProject[],
): Map<string, FactorialProject> {
  const map = new Map<string, FactorialProject>();

  // Pass 1: exact and code-prefix matches (higher priority)
  for (const fp of factorialProjects) {
    if (!fp.code) continue;
    const code = fp.code.trim();
    if (!map.has(code)) map.set(code, fp);
    const prefix = code.match(/^(\d{2}-\d{3})/)?.[1];
    if (prefix && !map.has(prefix)) map.set(prefix, fp);
  }

  // Pass 2: name-prefix fallback for projects where code is null/empty
  for (const fp of factorialProjects) {
    if (fp.code) continue; // already handled above
    const prefix = fp.name?.match(/^(\d{2}-\d{3})/)?.[1];
    if (prefix && !map.has(prefix)) map.set(prefix, fp);
  }

  return map;
}

export async function addProjectWorker(projectId: number, employeeId: number): Promise<FactorialProjectWorker> {
  return factorialFetch<FactorialProjectWorker>(
    `/api/${API_VERSION_PROJECTS}/resources/project-management/project-workers`,
    {
      method: 'POST',
      body: JSON.stringify({ project_id: projectId, employee_id: employeeId }),
    },
  );
}

export async function createFactorialProject(data: {
  name: string;
  code?: string;
  description?: string;
  status?: 'active' | 'archived' | 'closed';
}): Promise<FactorialProject> {
  return factorialFetch<FactorialProject>(
    `/api/${API_VERSION_PROJECTS}/resources/project-management/projects`,
    {
      method: 'POST',
      body: JSON.stringify({
        name: data.name,
        ...(data.code        ? { code: data.code }               : {}),
        ...(data.description ? { description: data.description } : {}),
        status: data.status ?? 'active',
      }),
    },
  );
}

export function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}
