import { NextRequest, NextResponse } from 'next/server';
import { getAllTimeRecords } from '@/lib/factorial/client';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const startDate = searchParams.get('startDate') ?? undefined;
  const endDate   = searchParams.get('endDate')   ?? undefined;

  try {
    const records = await getAllTimeRecords({ startDate, endDate });
    return NextResponse.json({ count: records.length, records });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error fetching time records';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
