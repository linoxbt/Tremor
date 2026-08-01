import { NextRequest, NextResponse } from "next/server";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4021";
const API_KEY = process.env.INTERNAL_API_KEY || "";

async function proxy(req: NextRequest, path: string[]) {
  const target = `${API_URL}/internal/${path.join("/")}${req.nextUrl.search}`;
  try {
    const res = await fetch(target, {
      method: req.method,
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        "x-api-key": API_KEY,
        Accept: "application/json",
        ...(req.method !== "GET" && req.method !== "HEAD"
          ? { "Content-Type": "application/json" }
          : {}),
      },
      body:
        req.method !== "GET" && req.method !== "HEAD"
          ? await req.text()
          : undefined,
      cache: "no-store",
    });
    const text = await res.text();
    return new NextResponse(text, {
      status: res.status,
      headers: {
        "Content-Type": res.headers.get("Content-Type") || "application/json",
      },
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to reach Tremor API";
    return NextResponse.json(
      {
        error: `Tremor API unreachable at ${API_URL} (${message}). Start tremor-api on :4021.`,
      },
      { status: 502 },
    );
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: { path: string[] } },
) {
  return proxy(req, params.path);
}

export async function POST(
  req: NextRequest,
  { params }: { params: { path: string[] } },
) {
  return proxy(req, params.path);
}
