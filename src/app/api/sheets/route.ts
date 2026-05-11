import { NextRequest, NextResponse } from "next/server";
import { readSheet, writeSheet } from "@/lib/sheets";

export async function GET(req: NextRequest) {
  const sheet = req.nextUrl.searchParams.get("sheet");
  if (!sheet) return NextResponse.json({ error: "sheet param required" }, { status: 400 });
  try {
    const data = await readSheet(sheet);
    return NextResponse.json(data, {
      headers: { "Cache-Control": "s-maxage=300, stale-while-revalidate" },
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { sheet, data } = await req.json();
  if (!sheet || !data) return NextResponse.json({ error: "sheet and data required" }, { status: 400 });
  try {
    await writeSheet(sheet, data);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
