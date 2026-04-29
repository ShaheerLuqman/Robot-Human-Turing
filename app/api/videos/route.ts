import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import type { VideoLabel } from "@/lib/types";

export const runtime = "nodejs";

type VideoRow = {
  id: string;
  url: string;
  label: VideoLabel;
  method: string;
  environment: string;
};

export async function GET() {
  const result = await db.query<VideoRow>(
    `select id, url, label, method, environment from videos order by id asc`
  );
  return NextResponse.json(result.rows);
}
