import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import type { TrialPayload } from "@/lib/types";

export const runtime = "nodejs";

type VideoRow = {
  id: string;
  url: string;
};

export async function GET() {
  const pairResult = await db.query<{ human_id: string; human_url: string; robot_id: string; robot_url: string }>(
    `
    with
      human_pick as (
        select id, url
        from videos
        where lower(trim(label)) = 'human'
        order by random()
        limit 1
      ),
      robot_pick as (
        select id, url
        from videos
        where lower(trim(label)) = 'robot'
        order by random()
        limit 1
      )
    select
      human_pick.id as human_id,
      human_pick.url as human_url,
      robot_pick.id as robot_id,
      robot_pick.url as robot_url
    from human_pick
    cross join robot_pick
    `
  );

  if (!pairResult.rows.length) {
    const counts = await db.query<{ human_count: string; robot_count: string }>(
      `
      select
        count(*) filter (where lower(trim(label)) = 'human')::text as human_count,
        count(*) filter (where lower(trim(label)) = 'robot')::text as robot_count
      from videos
      `
    );
    return NextResponse.json(
      {
        error: "Need at least one human and one robot video",
        human_count: Number(counts.rows[0]?.human_count || 0),
        robot_count: Number(counts.rows[0]?.robot_count || 0)
      },
      { status: 404 }
    );
  }

  const pairRow = pairResult.rows[0];
  const pair: VideoRow[] = [
    { id: pairRow.human_id, url: pairRow.human_url },
    { id: pairRow.robot_id, url: pairRow.robot_url }
  ].sort(() => Math.random() - 0.5);

  const payload: TrialPayload = {
    left: pair[0],
    right: pair[1]
  };
  return NextResponse.json(payload);
}
