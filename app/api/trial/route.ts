import { NextResponse } from "next/server";
import videos from "@/lib/videos.json";
import type { TrialPayload } from "@/lib/types";

export const runtime = "nodejs";

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export async function GET() {
  const humanVideos = videos.filter((v) => v.label === "human");
  const robotVideos = videos.filter((v) => v.label === "robot");

  if (!humanVideos.length || !robotVideos.length) {
    return NextResponse.json(
      { error: "Need at least one human and one robot video", human_count: humanVideos.length, robot_count: robotVideos.length },
      { status: 404 }
    );
  }

  const pair = [pickRandom(humanVideos), pickRandom(robotVideos)].sort(() => Math.random() - 0.5);

  const payload: TrialPayload = {
    left: { id: pair[0].id, url: pair[0].url },
    right: { id: pair[1].id, url: pair[1].url }
  };
  return NextResponse.json(payload);
}
