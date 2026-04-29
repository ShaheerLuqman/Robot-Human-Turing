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
  left_video_id: string;
  right_video_id: string;
  selected_video_id: string;
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
    !payload?.left_video_id ||
    !payload?.right_video_id ||
    !payload?.selected_video_id ||
    !["human", "robot"].includes(payload?.selected_label)
  ) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const videosResult = await db.query<VideoRow>(
    `select id, label from videos where id = any($1::text[])`,
    [[payload.left_video_id, payload.right_video_id]]
  );

  if (videosResult.rows.length !== 2) {
    return NextResponse.json({ error: "Trial videos not found" }, { status: 404 });
  }

  const trialById = new Map(videosResult.rows.map((video) => [video.id, video]));
  if (!trialById.has(payload.selected_video_id)) {
    return NextResponse.json({ error: "Selected video must be one of the trial videos" }, { status: 400 });
  }

  const humanVideo = videosResult.rows.find((video) => video.label === "human");
  const robotVideo = videosResult.rows.find((video) => video.label === "robot");
  if (!humanVideo || !robotVideo) {
    return NextResponse.json(
      { error: "Trial must include one human video and one robot video" },
      { status: 400 }
    );
  }

  const selectedVideo = trialById.get(payload.selected_video_id)!;
  const responseId = `resp_${randomUUID().replace(/-/g, "")}`;

  await db.query(
    `
    insert into responses (id, selected_video_id, human_video_id, robot_video_id, selected_label)
    values ($1, $2, $3, $4, $5)
    `,
    [responseId, payload.selected_video_id, humanVideo.id, robotVideo.id, payload.selected_label]
  );

  return NextResponse.json({
    response_id: responseId,
    actual_label: selectedVideo.label
  });
}
