import { NextResponse } from 'next/server';
import { testFactorialConnection } from '@/lib/factorial/client';

export async function GET() {
  if (!process.env.FACTORIAL_API_KEY) {
    return NextResponse.json(
      { ok: false, error: 'FACTORIAL_API_KEY not configured' },
      { status: 400 },
    );
  }

  try {
    const result = await testFactorialConnection();
    return NextResponse.json(result, { status: result.ok ? 200 : 502 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
