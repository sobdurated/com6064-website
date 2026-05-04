import { NextResponse } from "next/server";

export function apiOk<T>(data: T) {
  return NextResponse.json(data);
}

export function apiError(message: string, status = 500) {
  return NextResponse.json({ error: message }, { status });
}
