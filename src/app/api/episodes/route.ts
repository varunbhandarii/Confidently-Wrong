import { NextResponse } from "next/server";

import { getPublishedEpisodes } from "@/lib/app-data";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(await getPublishedEpisodes());
}

