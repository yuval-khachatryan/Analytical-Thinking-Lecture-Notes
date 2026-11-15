#!/usr/bin/env python3
"""The small, fully indexed plots used in §2.1 only.

Run from Notes/: MPLCONFIGDIR=tmp/matplotlib ../.venv/bin/python make-figures-sequence-intro.py
"""
from pathlib import Path
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np

OUT = Path(__file__).resolve().parent / "figures"
INK, DOT, GUIDE = "#0f172a", "#4f46e5", "#cbd5e1"
plt.rcParams.update({"font.size": 12, "mathtext.fontset": "cm",
                     "axes.edgecolor": INK, "axes.linewidth": .8})


def save(fig, name):
    fig.savefig(OUT / f"ch02-intro-{name}.png", dpi=180,
                bbox_inches="tight", pad_inches=.14, facecolor="white")
    plt.close(fig)
    print(f"wrote ch02-intro-{name}.png")


def plane(name, values, ticks, labels=None, guides=False):
    values = np.array(values, dtype=float)
    n = np.arange(1, len(values) + 1)
    fig, ax = plt.subplots(figsize=(6.4, 2.65 if not guides else 3.2))
    lo, hi = min(0, min(values)), max(values)
    span = max(hi - lo, 1)
    ax.set(xlim=(0, len(values) + .65),
           ylim=(lo - span * .14, hi + span * .2))
    for side in ("right", "top"):
        ax.spines[side].set_visible(False)
    ax.spines["bottom"].set_position(("data", 0))
    ax.set_xticks(n, [str(k) for k in n])
    ax.set_yticks([v for v, _ in ticks], [lab for _, lab in ticks])
    ax.set_xlabel("$n$", loc="right", labelpad=0)
    ax.set_ylabel("$a_n$", rotation=0, labelpad=13)
    if guides:
        for k, val in zip(n, values):
            ax.vlines(k, 0, val, colors=GUIDE, linestyles=":", lw=1)
            ax.hlines(val, 0, k, colors=GUIDE, linestyles=":", lw=1)
    ax.plot(n, values, "o", ms=6.5, color=DOT, zorder=3)
    if labels:
        for k, val, label in zip(n, values, labels):
            ax.annotate(label, (k, val), xytext=(0, 9), textcoords="offset points",
                        ha="center", color=INK, fontsize=12)
    fig.tight_layout()
    save(fig, name)


def main():
    plane("plane", [3, 5, 7, 9, 11, 13],
          [(v, "$%s$" % v) for v in [0, 3, 5, 7, 9, 11, 13]], guides=True)
    fig, ax = plt.subplots(figsize=(6.4, 1.05))
    ax.set(xlim=(1, 15), ylim=(-.5, .8))
    ax.axis("off")
    ax.annotate("", (14.8, 0), (1.2, 0), arrowprops={"arrowstyle": "->", "color": INK})
    for n, value in enumerate([3, 5, 7, 9, 11, 13], 1):
        ax.plot([value, value], [-.06, .06], color=INK, lw=.8)
        ax.plot(value, 0, "o", color=DOT, ms=6.5)
        ax.text(value, -.19, "$%s$" % value, ha="center", va="top")
        ax.text(value, .19, "$a_%s$" % n, ha="center", va="bottom", color=DOT)
    save(fig, "line")
    plane("constant", [2] * 6, [(0, "$0$"), (2, "$2$")])
    plane("harmonic", [1 / n for n in range(1, 7)],
          [(0, "$0$"), (.5, r"$\frac{1}{2}$"), (1, "$1$")],
          ["$1$"] + [rf"$\frac{{1}}{{{n}}}$" for n in range(2, 7)])
    plane("alternating", [-1, 1, -1, 1, -1, 1],
          [(-1, "$-1$"), (0, "$0$"), (1, "$1$")])
    plane("arithmetic", [1, 3, 5, 7, 9, 11],
          [(v, "$%s$" % v) for v in [0, 1, 3, 5, 7, 9, 11]])
    plane("geometric", [1, 2, 4, 8, 16, 32],
          [(v, "$%s$" % v) for v in [0, 8, 16, 32]],
          ["$%s$" % v for v in [1, 2, 4, 8, 16, 32]])
    plane("fibonacci", [1, 1, 2, 3, 5, 8],
          [(v, "$%s$" % v) for v in [0, 1, 2, 3, 5, 8]])


if __name__ == "__main__":
    main()
