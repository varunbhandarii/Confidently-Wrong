import { existsSync, statSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";

import { NextRequest, NextResponse } from "next/server";

const MIME_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
};

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const segments = (await params).path;
  const filePath = path.join(process.cwd(), "public", "images", ...segments);

  // Prevent path traversal
  if (!filePath.startsWith(path.join(process.cwd(), "public", "images"))) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  if (!existsSync(filePath)) {
    return new NextResponse("Not found", { status: 404 });
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || "application/octet-stream";
  const buffer = await readFile(filePath);
  const stat = statSync(filePath);

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": contentType,
      "Content-Length": String(stat.size),
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
