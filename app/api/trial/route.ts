import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import type { TrialPayload } from "@/lib/types";

export const runtime = "nodejs";

type VideoRow = {
  id: string;
  url: string;
};

export async function GET() {
  const videoResult = await db.query<VideoRow>(
    `
    select id, url
    from videos
    order by random()
    limit 1
    `
  );

  if (!videoResult.rows.length) {
    return NextResponse.json({ error: "No videos available" }, { status: 404 });
  }

  const video = videoResult.rows[0];
  const payload: TrialPayload = { id: video.id, url: video.url };
  return NextResponse.json(payload);
}
