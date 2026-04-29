import { randomUUID } from "crypto";
import { Readable } from "stream";
import { NextRequest, NextResponse } from "next/server";
import { cloudinary } from "@/lib/cloudinary";
import { db } from "@/lib/db";
import type { VideoLabel } from "@/lib/types";

export const runtime = "nodejs";

function uploadMediaToCloudinary(fileBuffer: Buffer, filename: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const upload = cloudinary.uploader.upload_stream(
      {
        resource_type: "auto",
        folder: "robot-human-turing",
        public_id: `vid_${randomUUID().replace(/-/g, "")}`,
        use_filename: true,
        unique_filename: false,
        filename_override: filename
      },
      (error, result) => {
        if (error || !result?.secure_url) {
          reject(error || new Error("Cloudinary upload failed"));
          return;
        }
        resolve(result.secure_url);
      }
    );

    Readable.from(fileBuffer).pipe(upload);
  });
}

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const label = formData.get("label");
  const method = formData.get("method");
  const environment = formData.get("environment");
  const file = formData.get("video");
  const normalizedLabel = typeof label === "string" ? label.trim().toLowerCase() : "";
  const normalizedMethod = typeof method === "string" ? method.trim() : "";
  const normalizedEnvironment = typeof environment === "string" ? environment.trim() : "";

  if (
    (normalizedLabel !== "human" && normalizedLabel !== "robot") ||
    !normalizedMethod ||
    !normalizedEnvironment ||
    !(file instanceof File)
  ) {
    return NextResponse.json({ error: "Invalid form payload" }, { status: 400 });
  }

  const isVideo = file.type.startsWith("video/");
  const isGif = file.type === "image/gif";
  if (!isVideo && !isGif) {
    return NextResponse.json(
      { error: "Only video files or GIFs are allowed" },
      { status: 400 }
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const uploadedUrl = await uploadMediaToCloudinary(buffer, file.name);
  const videoId = `vid_${randomUUID().replace(/-/g, "")}`;

  await db.query(
    `insert into videos (id, url, label, method, environment) values ($1, $2, $3, $4, $5)`,
    [videoId, uploadedUrl, normalizedLabel as VideoLabel, normalizedMethod, normalizedEnvironment]
  );

  return NextResponse.json({
    id: videoId,
    url: uploadedUrl,
    label: normalizedLabel,
    method: normalizedMethod,
    environment: normalizedEnvironment
  });
}
