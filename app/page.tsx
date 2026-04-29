"use client";

import { MouseEvent, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import type { TrialPayload, VideoLabel } from "@/lib/types";

async function fetchTrial(): Promise<TrialPayload> {
  const res = await fetch("/api/trial", { cache: "no-store" });
  if (!res.ok) throw new Error("Unable to fetch trial");
  return res.json();
}

export default function HomePage() {
  const [trial, setTrial] = useState<TrialPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [mediaReady, setMediaReady] = useState(false);
  const [working, setWorking] = useState(false);
  const [selectedLabel, setSelectedLabel] = useState<VideoLabel | null>(null);
  const [result, setResult] = useState<string>("");
  const [actualLabel, setActualLabel] = useState<VideoLabel | null>(null);
  const reloadTimeoutRef = useRef<number | null>(null);
  const isGif = trial?.url?.toLowerCase().includes(".gif");

  useEffect(() => {
    void loadTrial();
    return () => {
      if (reloadTimeoutRef.current) {
        window.clearTimeout(reloadTimeoutRef.current);
      }
    };
  }, []);

  async function loadTrial() {
    if (reloadTimeoutRef.current) {
      window.clearTimeout(reloadTimeoutRef.current);
      reloadTimeoutRef.current = null;
    }
    setLoading(true);
    setMediaReady(false);
    setSelectedLabel(null);
    setActualLabel(null);
    setResult("");
    const nextTrial = await fetchTrial();
    setTrial(nextTrial);
    setLoading(false);
  }

  async function submitChoice() {
    if (!trial || !selectedLabel) return;
    setWorking(true);

    const res = await fetch("/api/responses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        video_id: trial.id,
        selected_label: selectedLabel
      })
    });
    if (!res.ok) {
      setResult("Submission failed.");
      setWorking(false);
      return;
    }

    const data: { actual_label: VideoLabel } = await res.json();
    setActualLabel(data.actual_label);
    setResult("");
    reloadTimeoutRef.current = window.setTimeout(() => {
      void loadTrial();
    }, 2000);
    setWorking(false);
  }

  function handleToggleClick(event: MouseEvent<HTMLButtonElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const clickedX = event.clientX - rect.left;
    const clickedLeftSide = clickedX < rect.width / 2;
    setSelectedLabel(clickedLeftSide ? "human" : "robot");
  }

  return (
    <main className="home-main">
      <header className="trial-header">
        <h1>Robot-Human Turing Test</h1>
        <p className="small">Question: Is this video human or robot generated?</p>
      </header>

      <section className="card home-card trial-card">
        <div className="trial-card-head">
          <h3>Trial Video</h3>
          <span className={`video-status ${mediaReady ? "ready" : "pending"}`}>
            {mediaReady ? "Video loaded" : "Video loading..."}
          </span>
        </div>
        <div className="video-frame">
          {!mediaReady ? (
            <div className="video-loading-overlay" role="status" aria-live="polite" aria-label="Loading video">
              <div className="loading-state">
                <div className="loading-orbit" aria-hidden="true">
                  <span />
                  <span />
                  <span />
                </div>
                <p className="loading-text">{loading ? "Loading trial" : "Loading video"}</p>
              </div>
            </div>
          ) : null}
          {trial?.url ? (
            isGif ? (
              <img
                className="video home-video"
                src={trial.url}
                alt="Trial GIF"
                onLoad={() => setMediaReady(true)}
                onError={() => setResult("Failed to load video. Try next trial.")}
              />
            ) : (
              <video
                className="video home-video"
                controls={mediaReady}
                preload="metadata"
                onLoadedData={() => setMediaReady(true)}
                onCanPlay={() => setMediaReady(true)}
                onError={() => setResult("Failed to load video. Try next trial.")}
              >
                <source src={trial.url} />
              </video>
            )
          ) : (
            <div className="video home-video video-placeholder" />
          )}
        </div>
      </section>

      <div className="actions">
        <button
          className="toggle-switch"
          type="button"
          disabled={working || !mediaReady}
          onClick={handleToggleClick}
          aria-label="Toggle human robot selection"
        >
          <span className="toggle-track">
            <span className="toggle-track-label left">Human</span>
            <span className="toggle-track-label right">Robot</span>
          </span>
          <motion.span
            className="toggle-thumb"
            animate={{ x: selectedLabel === "robot" ? 106 : 0 }}
            transition={{ type: "spring", stiffness: 380, damping: 28 }}
          >
            {selectedLabel === "robot" ? "Robot" : "Human"}
          </motion.span>
        </button>
        <button
          className="btn primary-btn"
          disabled={working || !selectedLabel || !mediaReady}
          onClick={() => void submitChoice()}
        >
          Submit answer
        </button>
        <button
          className="btn secondary-btn"
          disabled={working || !mediaReady}
          onClick={() => void loadTrial()}
        >
          Next trial
        </button>
        {actualLabel ? (
          <span className="actual-label">Actual: {actualLabel} | Next trial in 2s...</span>
        ) : null}
      </div>

      {result ? <p>{result}</p> : null}
    </main>
  );
}
