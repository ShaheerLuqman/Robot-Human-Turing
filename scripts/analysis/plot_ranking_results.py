"""
Plot ranking test results as a win-rate heatmap.

Cell (row=A, col=B) = fraction of trials where users selected video_a as "More Human",
i.e. Agent A win rate against Agent B. The diagonal is left blank.
The rightmost "Avg" column is the mean win rate of each Agent A across all opponents.

Only includes responses where is_final = true.

Usage:
    python scripts/analysis/plot_ranking_results.py

Requires:
    pip install -r scripts/analysis/requirements.txt
"""

import json
import os
import sys
from collections import defaultdict

import matplotlib
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
import numpy as np
import psycopg2
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), "..", "..", ".env"))

DATABASE_URL = os.environ.get("DATABASE_URL")
if not DATABASE_URL:
    sys.exit("DATABASE_URL not set. Create a .env file or export the variable.")

METHODS_ORDER = [
    "human",
    "MAQ+RLPD",
    "MAQ+SAC",
    "MAQ+IQL",
    "HiMAQ+RLPD",
    "HiMAQ+SAC",
    "HiMAQ+IQL",
]

METHOD_LABELS = {
    "human":      "Human",
    "MAQ+RLPD":   "MAQ+RLPD(Ours)",
    "MAQ+SAC":    "MAQ+SAC(Ours)",
    "MAQ+IQL":    "MAQ+IQL(Ours)",
    "HiMAQ+RLPD": "HiMAQ+RLPD",
    "HiMAQ+SAC":  "HiMAQ+SAC",
    "HiMAQ+IQL":  "HiMAQ+IQL",
}


def fetch_answers(conn) -> list[dict]:
    with conn.cursor() as cur:
        try:
            cur.execute(
                "SELECT data FROM responses WHERE test_type = 'ranking' AND is_final = true"
            )
        except psycopg2.errors.UndefinedColumn:
            conn.rollback()
            print("Warning: is_final column not found — falling back to all ranking responses.")
            cur.execute("SELECT data FROM responses WHERE test_type = 'ranking'")
        rows = cur.fetchall()
    answers = []
    for (data,) in rows:
        payload = data if isinstance(data, dict) else json.loads(data)
        answers.extend(payload.get("answers", []))
    return answers


def aggregate(answers: list[dict]) -> dict[tuple[str, str], tuple[float, float, int]]:
    """
    Returns {(method_a, method_b): (win_rate_a, std_error, n)}
    win_rate_a = fraction of trials where the user selected video_a (method_a) as "More Human".
    """
    # wins[a][b] = list of 1 (a selected) or 0 (b selected)
    wins: dict[str, dict[str, list[int]]] = defaultdict(lambda: defaultdict(list))

    for a in answers:
        method_a = a.get("video_a", {}).get("method")
        method_b = a.get("video_b", {}).get("method")
        selected = a.get("selected")  # "a" or "b"
        if not method_a or not method_b or selected not in ("a", "b"):
            continue
        wins[method_a][method_b].append(1 if selected == "a" else 0)

    result: dict[tuple[str, str], tuple[float, float, int]] = {}
    for ma, opponents in wins.items():
        for mb, trials in opponents.items():
            n = len(trials)
            p = sum(trials) / n if n > 0 else 0.0
            se = np.sqrt(p * (1 - p) / n) if n > 1 else 0.0
            result[(ma, mb)] = (p, se, n)
    return result


def build_matrix(
    stats: dict[tuple[str, str], tuple[float, float, int]],
    methods: list[str],
) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    """
    Build value, std_error, and count matrices of shape (n, n).
    NaN where no data or on the diagonal.
    """
    n = len(methods)
    idx = {m: i for i, m in enumerate(methods)}
    val = np.full((n, n), np.nan)
    err = np.full((n, n), np.nan)
    cnt = np.zeros((n, n), dtype=int)

    for (ma, mb), (p, se, c) in stats.items():
        if ma in idx and mb in idx:
            i, j = idx[ma], idx[mb]
            val[i, j] = p
            err[i, j] = se
            cnt[i, j] = c

    np.fill_diagonal(val, np.nan)
    np.fill_diagonal(err, np.nan)
    return val, err, cnt


def plot(
    stats: dict[tuple[str, str], tuple[float, float, int]],
    methods: list[str],
    out_path: str,
):
    # Only keep methods that appear in the data
    present = {m for pair in stats for m in pair}
    methods = [m for m in methods if m in present]
    if not methods:
        print("No methods found in data.")
        return

    val, err, cnt = build_matrix(stats, methods)
    n = len(methods)

    # Average win rate per row (excluding diagonal / NaN)
    avg_val = np.nanmean(val, axis=1)
    avg_err = np.array([
        np.nanmean(err[i, :]) for i in range(n)
    ])

    labels = [METHOD_LABELS.get(m, m) for m in methods]
    col_labels = labels + ["Avg"]

    # Build display matrix with avg column appended
    display_val = np.hstack([val, avg_val.reshape(-1, 1)])
    display_err = np.hstack([err, avg_err.reshape(-1, 1)])

    fig, ax = plt.subplots(figsize=(len(col_labels) * 1.35 + 1.2, n * 0.85 + 1.4))

    # Colormap: white→dark red, NaN cells shown as light grey
    cmap = matplotlib.colormaps["Reds"].copy()
    cmap.set_bad(color="#eeeeee")

    im = ax.imshow(display_val, cmap=cmap, vmin=0.0, vmax=1.0, aspect="auto")

    # Annotate cells
    for i in range(n):
        for j in range(n + 1):
            v = display_val[i, j]
            e = display_err[i, j]
            if np.isnan(v):
                continue
            text = f"{v:.2f}±{e:.2f}"
            # Dark text on light cells, light text on dark cells
            text_color = "white" if v > 0.6 else "black"
            ax.text(j, i, text, ha="center", va="center",
                    fontsize=7.5, color=text_color, fontweight="normal")

    # Draw a vertical separator before the Avg column
    ax.axvline(x=n - 0.5, color="white", linewidth=2)

    ax.set_xticks(range(n + 1))
    ax.set_xticklabels(col_labels, fontsize=9)
    ax.xaxis.set_label_position("bottom")
    ax.xaxis.tick_bottom()
    ax.set_xlabel("Agent B", fontsize=11, labelpad=8)

    ax.set_yticks(range(n))
    ax.set_yticklabels(labels, fontsize=9)
    ax.set_ylabel("Agent A", fontsize=11, labelpad=8)

    ax.set_title("Agent A Win Rate", fontsize=12, pad=10)

    cbar = fig.colorbar(im, ax=ax, fraction=0.03, pad=0.02)
    cbar.set_label("Value (Mean)", fontsize=9)
    cbar.ax.tick_params(labelsize=8)

    plt.tight_layout()
    plt.savefig(out_path, dpi=150, bbox_inches="tight")
    print(f"Saved plot to {out_path}")
    plt.show()


def main():
    conn = psycopg2.connect(DATABASE_URL)
    try:
        answers = fetch_answers(conn)
    finally:
        conn.close()

    if not answers:
        print("No finalized ranking responses found in the database.")
        return

    print(f"Loaded {len(answers)} trial answers from finalized ranking responses.")

    stats = aggregate(answers)
    if not stats:
        print("No answers matched known methods.")
        return

    out_path = os.path.join(
        os.path.dirname(__file__), "..", "..", "ranking_win_rates.png"
    )
    plot(stats, METHODS_ORDER, os.path.abspath(out_path))


if __name__ == "__main__":
    main()
