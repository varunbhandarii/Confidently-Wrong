import { NextResponse } from "next/server";

import { getPipelineStatus } from "@/lib/app-data";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(await getPipelineStatus());
}

