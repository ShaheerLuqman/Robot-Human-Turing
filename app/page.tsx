"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { loadSavedProgress } from "@/app/components/TrialRunner";
import turingTrials from "@/lib/turing.json";
import rankingTrials from "@/lib/ranking.json";

export default function HomePage() {
  const [turingProgress, setTuringProgress] = useState<{ index: number; total: number } | null>(null);
  const [rankingProgress, setRankingProgress] = useState<{ index: number; total: number } | null>(null);

  useEffect(() => {
    const t = loadSavedProgress("turing");
    if (t && !t.done) setTuringProgress({ index: t.index, total: turingTrials.length });

    const r = loadSavedProgress("ranking");
    if (r && !r.done) setRankingProgress({ index: r.index, total: rankingTrials.length });
  }, []);

  return (
    <main className="home-landing">
      <header className="landing-header">
        <h1>Robot–Human Turing Test</h1>
        <p className="small">Choose a test to begin</p>
      </header>

      <div className="landing-grid">
        <div className="landing-card-wrapper">
          <Link href="/turing" className="landing-card">
            <h2>Turing Test</h2>
            <p>Two robots, one controlled by a human researcher and one by AI. Can you tell which is which?</p>
            <span className="landing-badge">{turingTrials.length} trials</span>
          </Link>
          {turingProgress ? (
            <div className="resume-banner">
              <span className="small">In progress — trial {turingProgress.index + 1} of {turingProgress.total}</span>
              <Link href="/turing" className="resume-link">Continue →</Link>
            </div>
          ) : null}
        </div>

        <div className="landing-card-wrapper">
          <Link href="/ranking" className="landing-card">
            <h2>Ranking Test</h2>
            <p>Two robots, both controlled by AI but using different methods. Can you tell which one looks more human?</p>
            <span className="landing-badge">21 trials</span>
          </Link>
          {rankingProgress ? (
            <div className="resume-banner">
              <span className="small">In progress — trial {rankingProgress.index + 1} of {rankingProgress.total}</span>
              <Link href="/ranking" className="resume-link">Continue →</Link>
            </div>
          ) : null}
        </div>
      </div>

      <footer className="landing-footer">
        <p>If you encounter any issues, contact <a href="mailto:shaheer@retrocausal.ai">shaheer@retrocausal.ai</a></p>
      </footer>
    </main>
  );
}
