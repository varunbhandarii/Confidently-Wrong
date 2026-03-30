import { NextResponse } from "next/server";

import { getPublishedEpisodes } from "@/lib/app-data";

export async function GET() {
  return NextResponse.json(await getPublishedEpisodes());
}

