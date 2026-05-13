import { NextResponse } from "next/server";
import { recordSnapshot } from "@/lib/actions/history";

// Called automatically by Vercel Cron every Monday at 08:00 (configured in vercel.json)
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await recordSnapshot();
  return NextResponse.json({ ok: true, ts: new Date().toISOString() });
}
