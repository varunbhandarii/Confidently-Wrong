import { existsSync, statSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";

import { NextRequest, NextResponse } from "next/server";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const segments = (await params).path;
  const filePath = path.join(process.cwd(), "public", "audio", ...segments);

  // Prevent path traversal
  if (!filePath.startsWith(path.join(process.cwd(), "public", "audio"))) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  if (!existsSync(filePath)) {
    return new NextResponse("Not found", { status: 404 });
  }

  const buffer = await readFile(filePath);
  const stat = statSync(filePath);

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "audio/mpeg",
      "Content-Length": String(stat.size),
      "Accept-Ranges": "bytes",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
