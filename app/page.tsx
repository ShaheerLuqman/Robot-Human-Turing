"use client";

import { useEffect, useRef, useState } from "react";
import type { TrialPayload } from "@/lib/types";

async function fetchTrial(): Promise<TrialPayload> {
  const res = await fetch("/api/trial", { cache: "no-store" });
  if (!res.ok) throw new Error("Unable to fetch trial");
  return res.json();
}

export default function HomePage() {
  const [trial, setTrial] = useState<TrialPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [mediaReady, setMediaReady] = useState<{ left: boolean; right: boolean }>({
    left: false,
    right: false
  });
  const [working, setWorking] = useState(false);
  const [selectedSide, setSelectedSide] = useState<"left" | "right" | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [verdict, setVerdict] = useState<"Correctly Identified" | "Incorrectly Identified" | null>(null);
  const [actualLabel, setActualLabel] = useState<"human" | "robot" | null>(null);
  const [mediaReloadNonce, setMediaReloadNonce] = useState(0);
  const reloadTimeoutRef = useRef<number | null>(null);
  const loadWatchdogRef = useRef<number | null>(null);
  const leftVideoRef = useRef<HTMLVideoElement | null>(null);
  const rightVideoRef = useRef<HTMLVideoElement | null>(null);
  const suppressSyncRef = useRef(false);
  const allMediaReady = mediaReady.left && mediaReady.right;

  useEffect(() => {
    void loadTrial();
    return () => {
      if (reloadTimeoutRef.current) {
        window.clearTimeout(reloadTimeoutRef.current);
      }
      if (loadWatchdogRef.current) {
        window.clearTimeout(loadWatchdogRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (loadWatchdogRef.current) {
      window.clearTimeout(loadWatchdogRef.current);
      loadWatchdogRef.current = null;
    }
    if (!trial || allMediaReady) return;

    loadWatchdogRef.current = window.setTimeout(() => {
      setErrorMessage("Loading took too long. Retrying current trial...");
      reloadCurrentTrialMedia();
    }, 12000);

    return () => {
      if (loadWatchdogRef.current) {
        window.clearTimeout(loadWatchdogRef.current);
        loadWatchdogRef.current = null;
      }
    };
  }, [trial, allMediaReady, mediaReloadNonce]);

  async function loadTrial() {
    if (reloadTimeoutRef.current) {
      window.clearTimeout(reloadTimeoutRef.current);
      reloadTimeoutRef.current = null;
    }
    setLoading(true);
    setMediaReady({ left: false, right: false });
    setSelectedSide(null);
    setActualLabel(null);
    setVerdict(null);
    setErrorMessage("");
    setMediaReloadNonce(0);
    const nextTrial = await fetchTrial();
    setTrial(nextTrial);
    setLoading(false);
  }

  async function submitChoice() {
    if (!trial || !selectedSide) return;
    setWorking(true);
    const selectedVideoId = selectedSide === "left" ? trial.left.id : trial.right.id;

    const res = await fetch("/api/responses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        left_video_id: trial.left.id,
        right_video_id: trial.right.id,
        selected_video_id: selectedVideoId,
        selected_label: "human"
      })
    });
    if (!res.ok) {
      setErrorMessage("Submission failed.");
      setWorking(false);
      return;
    }

    const data: { actual_label: "human" | "robot" } = await res.json();
    setActualLabel(data.actual_label);
    setVerdict(data.actual_label === "human" ? "Correctly Identified" : "Incorrectly Identified");
    setErrorMessage("");
    reloadTimeoutRef.current = window.setTimeout(() => {
      void loadTrial();
    }, 2000);
    setWorking(false);
  }

  function getVideoRefs() {
    return { left: leftVideoRef.current, right: rightVideoRef.current };
  }

  function withSyncSuppressed(action: () => void) {
    suppressSyncRef.current = true;
    action();
    window.setTimeout(() => {
      suppressSyncRef.current = false;
    }, 0);
  }

  function syncPlay(sourceSide: "left" | "right") {
    if (suppressSyncRef.current) return;
    const refs = getVideoRefs();
    const source = refs[sourceSide];
    const other = sourceSide === "left" ? refs.right : refs.left;
    if (!source || !other || source.paused || source.ended) return;
    withSyncSuppressed(() => {
      void other.play().catch(() => {
        // Ignore autoplay policy interruptions.
      });
    });
  }

  function syncPause(sourceSide: "left" | "right") {
    if (suppressSyncRef.current) return;
    const refs = getVideoRefs();
    const source = refs[sourceSide];
    const other = sourceSide === "left" ? refs.right : refs.left;
    if (!source || !other || !source.paused) return;
    withSyncSuppressed(() => {
      other.pause();
    });
  }

  function syncSeek(sourceSide: "left" | "right") {
    if (suppressSyncRef.current) return;
    const refs = getVideoRefs();
    const source = refs[sourceSide];
    const other = sourceSide === "left" ? refs.right : refs.left;
    if (!source || !other) return;
    withSyncSuppressed(() => {
      other.currentTime = source.currentTime;
    });
  }

  function pauseBothAtShorterEnd() {
    const refs = getVideoRefs();
    const left = refs.left;
    const right = refs.right;
    if (!left || !right) return;
    const leftDuration = Number.isFinite(left.duration) ? left.duration : 0;
    const rightDuration = Number.isFinite(right.duration) ? right.duration : 0;
    if (!leftDuration || !rightDuration) return;
    const shorter = leftDuration <= rightDuration ? left : right;
    if (shorter.ended) {
      withSyncSuppressed(() => {
        left.pause();
        right.pause();
      });
    }
  }

  function reloadCurrentTrialMedia() {
    if (!trial) return;
    setMediaReady({ left: false, right: false });
    setMediaReloadNonce((prev) => prev + 1);
  }

  function setVideoReady(side: "left" | "right") {
    setMediaReady((prev) => ({ ...prev, [side]: true }));
  }

  function renderTrialVideo(side: "left" | "right") {
    const video = trial?.[side];
    const isGif = video?.url?.toLowerCase().includes(".gif");
    const disabled = working || !allMediaReady;
    const humanSide = selectedSide;
    const isHuman = humanSide === side;
    const inferredLabel = humanSide ? (isHuman ? "Human" : "Robot") : "Unselected";
    return (
      <div
        className={`video-pane ${selectedSide === side ? "selected" : ""} ${disabled ? "disabled" : ""}`}
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-pressed={selectedSide === side}
        aria-disabled={disabled}
        onClick={() => {
          if (!disabled) setSelectedSide(side);
        }}
        onKeyDown={(event) => {
          if (disabled) return;
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            setSelectedSide(side);
          }
        }}
      >
        <div className="trial-card-head">
          <h3>{side === "left" ? "Left video" : "Right video"}</h3>
          <span className={`selection-tag ${humanSide ? (isHuman ? "human" : "robot") : "none"}`}>
            {inferredLabel}
          </span>
        </div>
        <div className="video-frame">
          {!allMediaReady ? (
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
          {video?.url ? (
            isGif ? (
              <img
                className={`video home-video ${allMediaReady ? "" : "video-hidden"}`}
                key={`${video.id}-${mediaReloadNonce}`}
                src={video.url}
                alt={`${side} trial GIF`}
                onLoad={() => setVideoReady(side)}
                onError={() => setErrorMessage("Failed to load video. Try reloading trial.")}
              />
            ) : (
              <video
                className={`video home-video ${allMediaReady ? "" : "video-hidden"}`}
                key={`${video.id}-${mediaReloadNonce}`}
                ref={side === "left" ? leftVideoRef : rightVideoRef}
                controls={allMediaReady}
                preload="metadata"
                onLoadedMetadata={() => setVideoReady(side)}
                onLoadedData={() => setVideoReady(side)}
                onCanPlay={() => setVideoReady(side)}
                onCanPlayThrough={() => setVideoReady(side)}
                onPlay={() => syncPlay(side)}
                onPause={() => syncPause(side)}
                onSeeked={() => syncSeek(side)}
                onTimeUpdate={pauseBothAtShorterEnd}
                onError={() => setErrorMessage("Failed to load video. Try reloading trial.")}
              >
                <source src={video.url} />
              </video>
            )
          ) : (
            <div className="video home-video video-placeholder" />
          )}
        </div>
      </div>
    );
  }

  return (
    <main className="home-main">
      <header className="trial-header">
        <h1>Robot-Human Turing Test</h1>
        <p className="small">Click the video you think is Human. The other video is tagged as Robot.</p>
      </header>

      <section className="card home-card trial-card">
        <div className="trial-card-head trial-card-status">
          <h3>Trial Pair</h3>
          <span className={`video-status ${mediaReady.left && mediaReady.right ? "ready" : "pending"}`}>
            {allMediaReady ? "Both videos loaded" : "Videos loading..."}
          </span>
        </div>
        <div className="trial-video-grid">
          {renderTrialVideo("left")}
          {renderTrialVideo("right")}
        </div>
      </section>

      <div className="actions">
        <button
          className="btn primary-btn"
          disabled={working || !selectedSide || !mediaReady.left || !mediaReady.right}
          onClick={() => void submitChoice()}
        >
          Submit answer
        </button>
        <button
          className="btn secondary-btn"
          disabled={working || !trial}
          onClick={reloadCurrentTrialMedia}
        >
          Reload trial
        </button>
        {actualLabel ? (
          <span className="actual-label">
            {verdict ?? "Submitted"} | Next trial in 2s...
          </span>
        ) : null}
      </div>

      {errorMessage ? <p>{errorMessage}</p> : null}
    </main>
  );
}
