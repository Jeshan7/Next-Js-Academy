import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

// Progress is persisted to a JSON file on disk (in addition to the
// browser's localStorage) so it survives across browsers/machines and
// can be backed up like any other file — this app has no server database.
const FILE = path.join(process.cwd(), "data", "progress.json");

export async function GET() {
  try {
    const raw = await fs.readFile(FILE, "utf-8");
    return NextResponse.json(JSON.parse(raw));
  } catch {
    return NextResponse.json(null);
  }
}

export async function POST(req: Request) {
  const body = await req.json();
  await fs.mkdir(path.dirname(FILE), { recursive: true });
  await fs.writeFile(FILE, JSON.stringify(body, null, 2), "utf-8");
  return NextResponse.json({ ok: true });
}
