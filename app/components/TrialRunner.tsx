"use client";

import { useEffect, useRef, useState } from "react";

export type TrialEntry = {
  id: string;
  environment: string;
  video_a: { id: string; url: string; method: string; label: string };
  video_b: { id: string; url: string; method: string; label: string };
};

type TrialAnswer = {
  trial_id: string;
  environment: string;
  video_a: TrialEntry["video_a"];
  video_b: TrialEntry["video_b"];
  selected: "a" | "b";
  correct: boolean;
  feedback: string;
};

type SavedProgress = {
  index: number;
  answers: TrialAnswer[];
  done: boolean;
};

type Props = {
  trials: TrialEntry[];
  title: string;
  subtitle: string;
  testType: "turing" | "ranking";
};

function storageKey(testType: string) {
  return `trial_progress_${testType}`;
}

function saveProgress(testType: string, progress: SavedProgress) {
  try { localStorage.setItem(storageKey(testType), JSON.stringify(progress)); } catch {}
}

function clearProgress(testType: string) {
  try { localStorage.removeItem(storageKey(testType)); } catch {}
}

export function loadSavedProgress(testType: string): SavedProgress | null {
  try {
    const raw = localStorage.getItem(storageKey(testType));
    return raw ? (JSON.parse(raw) as SavedProgress) : null;
  } catch { return null; }
}

export default function TrialRunner({ trials, title, subtitle, testType }: Props) {
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<TrialAnswer[]>([]);
  const [hydrated, setHydrated] = useState(false);

  const [mediaReady, setMediaReady] = useState({ a: false, b: false });
  const [transitioning, setTransitioning] = useState(false);
  const [selected, setSelected] = useState<"a" | "b" | null>(null);
  const [verdict, setVerdict] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [reloadNonce, setReloadNonce] = useState(0);
  const [feedback, setFeedback] = useState("");

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const videoARef = useRef<HTMLVideoElement | null>(null);
  const videoBRef = useRef<HTMLVideoElement | null>(null);
  const watchdogRef = useRef<number | null>(null);
  const advanceTimerRef = useRef<number | null>(null);
  const endedRef = useRef({ a: false, b: false });
  // Always-current ref so effects never close over stale answers
  const answersRef = useRef(answers);
  answersRef.current = answers;

  const trial = trials[index];
  const allReady = mediaReady.a && mediaReady.b && !transitioning;
  const isLast = index === trials.length - 1;

  useEffect(() => {
    const saved = loadSavedProgress(testType);
    if (saved && !saved.done) {
      setIndex(saved.index);
      setAnswers(saved.answers);
    }
    setHydrated(true);
  }, [testType]);

  useEffect(() => {
    if (!hydrated) return;
    saveProgress(testType, { index, answers, done: false });
  }, [testType, hydrated, index, answers]);

  useEffect(() => {
    const saved = answersRef.current[index];
    setMediaReady({ a: false, b: false });
    setTransitioning(false);
    setSelected(saved?.selected ?? null);
    setVerdict(null);
    setErrorMessage("");
    setFeedback(saved?.feedback ?? "");
    endedRef.current = { a: false, b: false };
  }, [index, reloadNonce]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!allReady) return;
    const { a, b } = getVideos();
    if (!a || !b) return;
    endedRef.current = { a: false, b: false };
    void a.play().catch(() => {});
    void b.play().catch(() => {});
  }, [allReady]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (watchdogRef.current) window.clearTimeout(watchdogRef.current);
    if (allReady) return;
    watchdogRef.current = window.setTimeout(() => {
      setReloadNonce((n) => n + 1);
    }, 1000);
    return () => { if (watchdogRef.current) window.clearTimeout(watchdogRef.current); };
  }, [index, reloadNonce, allReady]);

  useEffect(() => {
    return () => { if (advanceTimerRef.current) window.clearTimeout(advanceTimerRef.current); };
  }, []);

  if (!hydrated) return null;

  function getVideos() { return { a: videoARef.current, b: videoBRef.current }; }

  function handleVideoEnded(side: "a" | "b") {
    endedRef.current[side] = true;
    const { a, b } = getVideos();
    if (!a || !b) return;
    if (endedRef.current.a && endedRef.current.b) {
      // Both done — restart both from the beginning
      endedRef.current = { a: false, b: false };
      a.currentTime = 0;
      b.currentTime = 0;
      void a.play().catch(() => {});
      void b.play().catch(() => {});
    }
    // If only one ended, it stays paused at last frame waiting for the other
  }

  function setReady(side: "a" | "b") {
    setMediaReady((prev) => ({ ...prev, [side]: true }));
  }

  function goBack() {
    if (advanceTimerRef.current) {
      window.clearTimeout(advanceTimerRef.current);
      advanceTimerRef.current = null;
    }
    setIndex(index - 1);
    setReloadNonce(0);
  }

  function recordAndAdvance() {
    if (!selected || !trial) return;
    const chosenVideo = selected === "a" ? trial.video_a : trial.video_b;
    const correct = chosenVideo.label === "human";
    const updated = { trial_id: trial.id, environment: trial.environment, video_a: trial.video_a, video_b: trial.video_b, selected, correct, feedback: feedback.trim() };
    const next = [...answers];
    next[index] = updated;
    setAnswers(next);
    setVerdict("Answer recorded");
    setTransitioning(true);
    advanceTimerRef.current = window.setTimeout(() => {
      setIndex((i) => i + 1);
      setReloadNonce(0);
    }, 1000);
  }

  function openSubmitModal() {
    if (!selected || !trial) return;
    const chosenVideo = selected === "a" ? trial.video_a : trial.video_b;
    const correct = chosenVideo.label === "human";
    const updated = { trial_id: trial.id, environment: trial.environment, video_a: trial.video_a, video_b: trial.video_b, selected, correct, feedback: feedback.trim() };
    const next = [...answers];
    next[index] = updated;
    setAnswers(next);
    setShowModal(true);
  }

  async function submitResults() {
    if (!name.trim() || !email.trim()) return;
    setSubmitting(true);
    setSubmitError("");
    try {
      const res = await fetch("/api/responses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), test_type: testType, answers }),
      });
      if (!res.ok) throw new Error("Submission failed");
      clearProgress(testType);
      setSubmitted(true);
    } catch (err) {
      setSubmitError(String(err));
    } finally {
      setSubmitting(false);
    }
  }

  const disabled = !allReady || !!verdict;

  function renderPane(side: "a" | "b") {
    const video = side === "a" ? trial.video_a : trial.video_b;
    const isSelected = selected === side;
    const tagLabel = selected ? (isSelected ? "Human" : "Robot") : "Unselected";
    const tagClass = selected ? (isSelected ? "human" : "robot") : "none";

    return (
      <div
        className={`video-pane ${isSelected ? "selected" : ""} ${disabled && !verdict ? "disabled" : ""}`}
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-pressed={isSelected}
        aria-disabled={disabled}
        onClick={() => { if (!disabled) setSelected(side); }}
        onKeyDown={(e) => {
          if (disabled) return;
          if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setSelected(side); }
        }}
      >
        <div className="trial-card-head">
          <h3>{side === "a" ? "Video A" : "Video B"}</h3>
          <span className={`selection-tag ${tagClass}`}>{tagLabel}</span>
        </div>
        <div className="video-frame">
          {!allReady ? (
            <div className="video-loading-overlay" role="status">
              <div className="loading-state">
                <div className="loading-orbit" aria-hidden="true"><span /><span /><span /></div>
                <p className="loading-text">Loading video</p>
              </div>
            </div>
          ) : null}
          <video
            key={`${video.id}-${reloadNonce}`}
            className="video home-video"
            ref={side === "a" ? videoARef : videoBRef}
            preload="auto"
            onCanPlayThrough={() => setReady(side)}
            onEnded={() => handleVideoEnded(side)}
            onError={() => setErrorMessage("Failed to load video. Try reloading.")}
          >
            <source src={video.url} />
          </video>
        </div>
      </div>
    );
  }

  return (
    <main className="home-main">
      <header className="trial-header">
        <div className="trial-header-top">
          <div className="trial-header-left">
            <a href="/" className="home-btn" title="Back to home">← Home</a>
            <h1>{title}</h1>
          </div>
          <div className="trial-header-right">
            <span className="progress-badge">{index + 1} / {trials.length}</span>
            <button
              className="reset-btn"
              title="Restart test"
              onClick={() => {
                if (!confirm("Restart the test? All progress will be lost.")) return;
                clearProgress(testType);
                setIndex(0);
                setAnswers([]);
                setTransitioning(false);
                setVerdict(null);
                setSelected(null);
                setReloadNonce(0);
              }}
            >
              ↺ Reset
            </button>
          </div>
        </div>
        <p className="small">{subtitle}</p>
        <div className="progress-track" role="progressbar" aria-valuenow={index + 1} aria-valuemin={1} aria-valuemax={trials.length}>
          <div className="progress-fill" style={{ width: `${((index + 1) / trials.length) * 100}%` }} />
        </div>
      </header>

      <section className="card home-card trial-card">
        <div className="trial-card-head trial-card-status">
          <h3>Trial {index + 1}</h3>
          <div className="trial-card-status-right">
            <span className={`video-status ${allReady ? "ready" : "pending"}`}>
              {allReady ? "Both videos loaded" : "Videos loading..."}
            </span>
            <button
              className="reload-btn"
              title="Reload videos"
              aria-label="Reload videos"
              disabled={!!verdict}
              onClick={() => setReloadNonce((n) => n + 1)}
            >
              ↺
            </button>
          </div>
        </div>
        <div className="trial-video-grid">
          {renderPane("a")}
          {renderPane("b")}
        </div>
        <div className="trial-feedback">
          <label className="trial-feedback-label" htmlFor="trial-feedback">
            Anything worth noting? <span className="trial-feedback-optional">(optional)</span>
          </label>
          <textarea
            id="trial-feedback"
            className="trial-feedback-input"
            placeholder="e.g. movement looked unnatural, lighting was inconsistent..."
            rows={2}
            disabled={!!verdict}
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
          />
        </div>
      </section>

      <div className="actions">
        <button
          className="btn secondary-btn"
          disabled={index === 0 || !!verdict}
          onClick={goBack}
        >
          ← Back
        </button>
        <span className="actual-label">{verdict ?? ""}</span>
        {isLast ? (
          <button
            className="btn primary-btn"
            disabled={!selected || !allReady || !!verdict}
            onClick={openSubmitModal}
          >
            Submit test
          </button>
        ) : (
          <button
            className="btn primary-btn"
            disabled={!selected || !allReady || !!verdict}
            onClick={recordAndAdvance}
          >
            {verdict ? "Next trial..." : "Next →"}
          </button>
        )}
      </div>

      {errorMessage ? <p className="small" style={{ color: "#b91c1c" }}>{errorMessage}</p> : null}

      {showModal ? (
        <div className="modal-backdrop" onClick={() => { if (!submitting && !submitted) setShowModal(false); }}>
          <div className="modal-card card" onClick={(e) => e.stopPropagation()}>
            {submitted ? (
              <>
                <h2>Results submitted</h2>
                <p className="small">Thank you, {name}. Your responses have been saved.</p>
                <a href="/" className="btn primary-btn" style={{ display: "block", textAlign: "center", textDecoration: "none", marginTop: 16 }}>
                  Back to home
                </a>
              </>
            ) : (
              <>
                <h2>Submit results</h2>
                <p className="small">Enter your details to save your responses.</p>
                <div className="submit-form">
                  <label className="submit-label" htmlFor="sub-name">Name</label>
                  <input
                    id="sub-name"
                    className="submit-input"
                    type="text"
                    placeholder="Your name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={submitting}
                    autoFocus
                  />
                  <label className="submit-label" htmlFor="sub-email">Email</label>
                  <input
                    id="sub-email"
                    className="submit-input"
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={submitting}
                    onKeyDown={(e) => { if (e.key === "Enter") void submitResults(); }}
                  />
                  {submitError ? <p className="small" style={{ color: "#b91c1c", marginTop: 4 }}>{submitError}</p> : null}
                  <div className="modal-actions">
                    <button className="btn secondary-btn" onClick={() => setShowModal(false)} disabled={submitting}>
                      Cancel
                    </button>
                    <button
                      className="btn primary-btn"
                      disabled={!name.trim() || !email.trim() || submitting}
                      onClick={() => void submitResults()}
                    >
                      {submitting ? "Submitting..." : "Submit"}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      ) : null}
    </main>
  );
}
