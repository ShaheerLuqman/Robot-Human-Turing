"""
Plot Turing test error rates from the database.

Error rate = fraction of responses where the user was INCORRECT (chose robot as human).
Groups by robot method (bar color) and environment (x-axis group), with an Average group.
Only includes responses where is_finalized = true.

Usage:
    python scripts/analysis/plot_turing_results.py

Requires:
    pip install -r scripts/analysis/requirements.txt
"""

import json
import os
import sys

import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
import numpy as np
import psycopg2
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), "..", "..", ".env"))

DATABASE_URL = os.environ.get("DATABASE_URL")
if not DATABASE_URL:
    sys.exit("DATABASE_URL not set. Create a .env.local file or export the variable.")

METHODS_ORDER = [
    "MAQ+IQL",
    "MAQ+SAC",
    "MAQ+RLPD",
    "HiMAQ+IQL",
    "HiMAQ+SAC",
    "HiMAQ+RLPD",
]

ENVIRONMENTS_ORDER = ["door", "hammer", "pen", "relocate"]

METHOD_COLORS = {
    "MAQ+IQL":    "#4878cf",  # blue
    "MAQ+SAC":    "#d65f5f",  # red
    "MAQ+RLPD":   "#6acc65",  # green
    "HiMAQ+IQL":  "#b47cc7",  # purple
    "HiMAQ+SAC":  "#c4ad66",  # olive/brown
    "HiMAQ+RLPD": "#77bedb",  # light blue
}


def fetch_answers(conn) -> list[dict]:
    with conn.cursor() as cur:
        try:
            cur.execute(
                "SELECT data FROM responses WHERE test_type = 'turing' AND is_final = true"
            )
        except psycopg2.errors.UndefinedColumn:
            conn.rollback()
            print("Warning: is_final column not found — run the migration below, then re-run.")
            print("  ALTER TABLE responses ADD COLUMN IF NOT EXISTS is_final boolean NOT NULL DEFAULT false;")
            print("Falling back to all turing responses.\n")
            cur.execute("SELECT data FROM responses WHERE test_type = 'turing'")
        rows = cur.fetchall()
    answers = []
    for (data,) in rows:
        payload = data if isinstance(data, dict) else json.loads(data)
        answers.extend(payload.get("answers", []))
    return answers


def robot_method(answer: dict) -> str | None:
    """Return the robot method name from a trial answer."""
    for side in ("video_a", "video_b"):
        v = answer.get(side, {})
        if v.get("label") == "robot":
            return v.get("method")
    return None


def aggregate(answers: list[dict]) -> dict[str, dict[str, tuple[float, float, int]]]:
    """
    Returns {method: {environment: (error_rate, std_error, n)}}
    error_rate = fraction of trials where correct == False
    """
    from collections import defaultdict
    counts: dict[str, dict[str, list[int]]] = defaultdict(lambda: defaultdict(list))

    for a in answers:
        method = robot_method(a)
        env = a.get("environment", "").lower()
        if method is None or env not in ENVIRONMENTS_ORDER:
            continue
        counts[method][env].append(0 if a.get("correct", True) else 1)

    result: dict[str, dict[str, tuple[float, float, int]]] = {}
    for method, envs in counts.items():
        result[method] = {}
        for env, trials in envs.items():
            n = len(trials)
            p = sum(trials) / n if n > 0 else 0.0
            se = np.sqrt(p * (1 - p) / n) if n > 1 else 0.0
            result[method][env] = (p, se, n)
    return result


def method_average(env_stats: dict[str, tuple[float, float, int]]) -> tuple[float, float, int]:
    """Pool all environments into one aggregate (error_rate, std_error, n)."""
    total = sum(s[2] for s in env_stats.values())
    if total == 0:
        return 0.0, 0.0, 0
    errors = sum(s[0] * s[2] for s in env_stats.values())
    p = errors / total
    se = np.sqrt(p * (1 - p) / total) if total > 1 else 0.0
    return p, se, total


def plot(stats: dict[str, dict[str, tuple[float, float, int]]], out_path: str):
    groups = ENVIRONMENTS_ORDER + ["Average"]
    methods = [m for m in METHODS_ORDER if m in stats]

    n_groups = len(groups)
    n_methods = len(methods)
    bar_width = 0.12
    group_gap = 0.2
    group_width = n_methods * bar_width + group_gap
    group_centers = np.arange(n_groups) * group_width

    fig, ax = plt.subplots(figsize=(12, 4.5))
    ax.set_facecolor("white")
    fig.patch.set_facecolor("white")

    for i, method in enumerate(methods):
        offsets = (np.arange(n_methods) - (n_methods - 1) / 2) * bar_width
        x_positions = group_centers + offsets[i]

        rates, errors = [], []
        for g in groups:
            if g == "Average":
                r, e, _ = method_average(stats[method])
            else:
                r, e, _ = stats[method].get(g, (0.0, 0.0, 0))
            rates.append(r)
            errors.append(e)

        color = METHOD_COLORS.get(method, "#888888")
        ax.bar(
            x_positions,
            rates,
            width=bar_width,
            color=color,
            label=method,
            zorder=3,
        )
        ax.errorbar(
            x_positions,
            rates,
            yerr=errors,
            fmt="none",
            color="black",
            capsize=3,
            linewidth=1,
            zorder=4,
        )

    ax.set_xticks(group_centers)
    ax.set_xticklabels([g.capitalize() for g in groups], fontsize=11)
    ax.set_xlabel("Environment", fontsize=12)
    ax.set_ylabel("Error Rate\n(fraction incorrect)", fontsize=12)
    ax.set_ylim(0, 1.0)
    ax.yaxis.set_major_locator(plt.MultipleLocator(0.1))
    ax.yaxis.grid(True, color="#dddddd", zorder=0)
    ax.set_axisbelow(True)
    for spine in ("top", "right"):
        ax.spines[spine].set_visible(False)

    legend_patches = [
        mpatches.Patch(color=METHOD_COLORS[m], label=m)
        for m in methods
    ]
    ax.legend(
        handles=legend_patches,
        loc="upper center",
        bbox_to_anchor=(0.5, 1.13),
        ncol=n_methods,
        frameon=False,
        fontsize=9,
    )

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
        print("No finalized turing responses found in the database.")
        return

    print(f"Loaded {len(answers)} trial answers from finalized turing responses.")

    stats = aggregate(answers)
    if not stats:
        print("No answers matched known methods/environments.")
        return

    out_path = os.path.join(os.path.dirname(__file__), "..", "..", "turing_error_rates.png")
    plot(stats, os.path.abspath(out_path))

    print("\nError rates by method and environment:")
    header = f"{'Method':<18}" + "".join(f"{e.capitalize():>12}" for e in ENVIRONMENTS_ORDER) + f"{'Average':>12}"
    print(header)
    print("-" * len(header))
    for method in [m for m in METHODS_ORDER if m in stats]:
        row = f"{method:<18}"
        for env in ENVIRONMENTS_ORDER:
            r, _, n = stats[method].get(env, (0.0, 0.0, 0))
            row += f"{r:>10.1%} ({n})"
        r, _, n = method_average(stats[method])
        row += f"{r:>10.1%} ({n})"
        print(row)


if __name__ == "__main__":
    main()
