"use client";

import { FormEvent, useState } from "react";
import type { VideoLabel } from "@/lib/types";

type UploadResult = {
  id: string;
  url: string;
  label: VideoLabel;
};

export default function UploadPage() {
  const [label, setLabel] = useState<VideoLabel>("human");
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [result, setResult] = useState<UploadResult | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file) {
      setMessage("Please choose a video or GIF file.");
      return;
    }

    setSubmitting(true);
    setMessage("");
    setResult(null);

    const formData = new FormData();
    formData.append("video", file);
    formData.append("label", label);

    const res = await fetch("/api/upload", {
      method: "POST",
      body: formData
    });

    if (!res.ok) {
      setMessage("Upload failed.");
      setSubmitting(false);
      return;
    }

    const payload: UploadResult = await res.json();
    setResult(payload);
    setMessage("Upload successful.");
    setSubmitting(false);
  }

  return (
    <main>
      <h1>Upload Video</h1>
      <p className="small">Upload a video or GIF, tag it, and store its Cloudinary URL in the database.</p>

      <form className="card" onSubmit={handleSubmit}>
        <label className="small" htmlFor="label">
          Label
        </label>
        <select
          id="label"
          value={label}
          onChange={(e) => setLabel(e.target.value as VideoLabel)}
          style={{ width: "100%", padding: "10px", marginTop: "6px", borderRadius: "8px" }}
          disabled={submitting}
        >
          <option value="human">human</option>
          <option value="robot">robot</option>
        </select>

        <label className="small" htmlFor="video" style={{ display: "block", marginTop: "14px" }}>
          Video or GIF file
        </label>
        <input
          id="video"
          type="file"
          accept="video/*,image/gif,.gif"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          disabled={submitting}
          style={{ width: "100%", marginTop: "6px" }}
        />

        <button className="btn" type="submit" disabled={submitting || !file}>
          {submitting ? "Uploading..." : "Upload"}
        </button>
      </form>

      {message ? <p className="small">{message}</p> : null}
      {result ? (
        <section className="card">
          <h3>Stored Video</h3>
          <p className="small">ID: {result.id}</p>
          <p className="small">Label: {result.label}</p>
          <p className="small">URL: {result.url}</p>
        </section>
      ) : null}
    </main>
  );
}
