import { NextResponse } from 'next/server';

export type JsonObject = Record<string, unknown>;

export async function readJsonObject(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new Error('JSON inválido');
  }
  return body as JsonObject;
}

export function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

export function cleanText(value: unknown, maxLength = 255) {
  if (value === undefined || value === null) return undefined;
  const text = String(value).replace(/\p{C}/gu, '').trim();
  return text.slice(0, maxLength);
}

export function requiredText(body: JsonObject, field: string, maxLength = 255) {
  const value = cleanText(body[field], maxLength);
  if (!value) throw new Error(`${field} es obligatorio`);
  return value;
}

export function optionalText(body: JsonObject, field: string, maxLength = 255) {
  const value = cleanText(body[field], maxLength);
  return value === undefined ? undefined : value;
}

export function optionalBoolean(body: JsonObject, field: string) {
  if (body[field] === undefined) return undefined;
  return body[field] === true;
}

export function optionalNumber(body: JsonObject, field: string, fallback?: number) {
  if (body[field] === undefined || body[field] === null || body[field] === '') return fallback;
  const value = Number(body[field]);
  if (!Number.isFinite(value)) throw new Error(`${field} debe ser numérico`);
  return value;
}

export function optionalDate(body: JsonObject, field: string) {
  const value = body[field];
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;

  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) throw new Error(`${field} debe ser una fecha válida`);
  return date;
}

export function limitedSearchParam(value: string | null, maxLength = 100) {
  return cleanText(value ?? undefined, maxLength);
}
