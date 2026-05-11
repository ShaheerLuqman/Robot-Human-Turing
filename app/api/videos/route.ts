import { NextResponse } from "next/server";
import videos from "@/lib/videos.json";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json(videos);
}
