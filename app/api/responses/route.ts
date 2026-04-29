import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import type { VideoLabel } from "@/lib/types";

export const runtime = "nodejs";

type VideoRow = {
  id: string;
  label: VideoLabel;
};

type SubmitPayload = {
  video_id: string;
  selected_label: VideoLabel;
};

export async function POST(req: NextRequest) {
  let payload: SubmitPayload;
  try {
    payload = (await req.json()) as SubmitPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (
    !payload?.video_id ||
    !["human", "robot"].includes(payload?.selected_label)
  ) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const videoResult = await db.query<VideoRow>(
    `select id, label from videos where id = $1 limit 1`,
    [payload.video_id]
  );

  if (!videoResult.rows.length) {
    return NextResponse.json({ error: "Video not found" }, { status: 404 });
  }

  const video = videoResult.rows[0];
  const responseId = `resp_${randomUUID().replaceAll("-", "")}`;

  await db.query(
    `
    insert into responses (id, video_id, selected_label)
    values ($1, $2, $3)
    `,
    [responseId, payload.video_id, payload.selected_label]
  );

  return NextResponse.json({
    response_id: responseId,
    actual_label: video.label
  });
}
