import { NextResponse } from 'next/server';

async function probe(url: string, apiKey: string): Promise<{
  url: string; status: number; ok: boolean; snippet: string;
}> {
  try {
    const res = await fetch(url, {
      headers: { 'x-api-key': apiKey, Accept: 'application/json' },
      redirect: 'follow',
    });
    let snippet = '';
    try { snippet = (await res.text()).slice(0, 300); } catch { /* ignore */ }
    return { url, status: res.status, ok: res.ok, snippet };
  } catch (err) {
    return { url, status: 0, ok: false, snippet: err instanceof Error ? err.message : 'Network error' };
  }
}

export async function GET() {
  const apiKey = process.env.FACTORIAL_API_KEY ?? '';
  if (!apiKey) return NextResponse.json({ error: 'FACTORIAL_API_KEY not set' }, { status: 400 });

  const base = (process.env.FACTORIAL_API_BASE_URL || 'https://api.factorialhr.com').replace(/\/$/, '');

  const versions = ['2025-07-01', '2025-10-01', '2026-04-01', '2026-07-01'];
  const worklогResources = [
    'worklogs',
    'work-logs',
    'time-entries',
    'time-records',
    'imputations',
    'project-entries',
    'tracked-times',
    'time-trackings',
  ];

  // Build worklog paths for all version × resource combinations
  const worklогPaths = versions.flatMap(v =>
    worklогResources.map(r => `/api/${v}/resources/project-management/${r}`),
  );

  // Known-good anchor paths + worklog candidates
  const paths = [
    // Confirmed working (anchor)
    `/api/2026-04-01/resources/employees/employees`,
    `/api/2025-07-01/resources/project-management/projects`,
    `/api/2025-07-01/resources/project-management/project-workers`,
    // Budget strategies (confirmed in changelog)
    `/api/2026-04-01/resources/project-management/budget-strategies`,
    // All worklog candidates
    ...worklогPaths,
  ];

  const results = await Promise.all(paths.map(p => probe(`${base}${p}`, apiKey)));

  const working   = results.filter(r => r.ok);
  const forbidden = results.filter(r => r.status === 403);
  const notFound  = results.filter(r => r.status === 404);
  const other     = results.filter(r => ![0, 200, 201, 403, 404].includes(r.status));

  return NextResponse.json({
    baseUrl: base,
    authMethod: 'x-api-key header',
    working:   working.map(r => ({ url: r.url, snippet: r.snippet.slice(0, 150) })),
    forbidden: forbidden.map(r => ({ url: r.url, snippet: r.snippet })),
    notFound:  notFound.map(r => r.url),
    other:     other.map(r => ({ url: r.url, status: r.status, snippet: r.snippet })),
    diagnosis: working.length > 0
      ? `✅ ${working.length} rutas funcionando`
      : forbidden.length > 0
      ? '🔐 API accesible pero SIN PERMISOS'
      : '❌ Todas las rutas fallan',
  });
}
