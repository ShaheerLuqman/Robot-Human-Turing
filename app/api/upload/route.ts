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
  const file = formData.get("video");

  if ((label !== "human" && label !== "robot") || !(file instanceof File)) {
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
    `insert into videos (id, url, label) values ($1, $2, $3)`,
    [videoId, uploadedUrl, label as VideoLabel]
  );

  return NextResponse.json({
    id: videoId,
    url: uploadedUrl,
    label
  });
}
