import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";

type TrialAnswer = {
  trial_id: string;
  environment: string;
  video_a: { id: string; url: string; method: string; label: string };
  video_b: { id: string; url: string; method: string; label: string };
  selected: "a" | "b";
  correct: boolean;
  feedback: string;
};

type SubmitPayload = {
  name: string;
  email: string;
  test_type: "turing" | "ranking";
  answers: TrialAnswer[];
  overall_feedback?: string;
  is_final?: boolean;
};

export async function POST(req: NextRequest) {
  let payload: SubmitPayload;
  try {
    payload = (await req.json()) as SubmitPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (
    !payload?.name?.trim() ||
    !payload?.email?.trim() ||
    !["turing", "ranking"].includes(payload?.test_type) ||
    !Array.isArray(payload?.answers) ||
    payload.answers.length === 0
  ) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const id = `${payload.test_type}_${randomUUID().replace(/-/g, "")}`;
  const submittedAt = new Date().toISOString();

  const isFinalized = payload.is_final ?? true;

  const data = {
    id,
    submitted_at: submittedAt,
    name: payload.name.trim(),
    email: payload.email.trim(),
    test_type: payload.test_type,
    is_final: isFinalized,
    overall_feedback: payload.overall_feedback?.trim() ?? "",
    answers: payload.answers,
  };

  await db.query(
    `insert into responses (id, submitted_at, name, email, test_type, is_final, data)
     values ($1, $2, $3, $4, $5, $6, $7)`,
    [id, submittedAt, data.name, data.email, data.test_type, isFinalized, JSON.stringify(data)]
  );

  return NextResponse.json({ id });
}
