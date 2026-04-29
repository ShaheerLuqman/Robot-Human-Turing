"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { VideoRecord } from "@/lib/types";

async function fetchVideos(): Promise<VideoRecord[]> {
  const res = await fetch("/api/videos", { cache: "no-store" });
  if (!res.ok) throw new Error("Unable to fetch videos");
  return res.json();
}

export default function VideosPage() {
  const [videos, setVideos] = useState<VideoRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadVideos() {
      try {
        setLoading(true);
        setError("");
        const data = await fetchVideos();
        setVideos(data);
      } catch {
        setError("Failed to load videos.");
      } finally {
        setLoading(false);
      }
    }

    void loadVideos();
  }, []);

  return (
    <main>
      <h1>All Videos</h1>
      <p className="small">
        <Link href="/">Back to test</Link> | <Link href="/upload">Upload video</Link>
      </p>

      {loading ? (
        <div className="loading-state" role="status" aria-live="polite" aria-label="Loading videos">
          <div className="loading-orbit" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
          <p className="loading-text">Loading videos</p>
        </div>
      ) : null}
      {error ? <p>{error}</p> : null}

      {!loading && !error ? (
        <section className="card">
          <table className="table">
            <thead>
              <tr>
                <th>ID</th>
                <th>URL</th>
                <th>Label</th>
              </tr>
            </thead>
            <tbody>
              {videos.map((video) => (
                <tr key={video.id}>
                  <td>{video.id}</td>
                  <td>
                    <a href={video.url} target="_blank" rel="noreferrer">
                      {video.url}
                    </a>
                  </td>
                  <td>{video.label}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!videos.length ? <p className="small">No videos found.</p> : null}
        </section>
      ) : null}
    </main>
  );
}
