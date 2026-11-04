#!/usr/bin/env python3
"""Static figures for chapter 2 (sequences and their limits).

No Hebrew inside matplotlib (mathtext only); the explanation goes in the Hebrew caption.
A sequence is drawn as separate points (n, a_n), never joined by a line.
Each figure asserts the claims its caption makes.

Run from Notes/:   ../.venv/bin/python make-figures-ch02.py
"""
from math import comb, factorial
from pathlib import Path

import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.ticker import MaxNLocator

FIGDIR = Path(__file__).resolve().parent / "figures"
C1, C2, C3, C4 = "#4f46e5", "#ea580c", "#0d9488", "#e11d48"
GREY, INK, GRID = "#94a3b8", "#0f172a", "#eef2f7"
plt.rcParams.update({"font.size": 12, "axes.edgecolor": INK, "axes.linewidth": 0.8,
                     "mathtext.fontset": "cm", "axes.titlepad": 12,
                     "xtick.labelsize": 11, "ytick.labelsize": 11})


def save(fig, name):
    FIGDIR.mkdir(exist_ok=True)
    fig.savefig(FIGDIR / f"{name}.png", dpi=190, bbox_inches="tight", pad_inches=0.16, facecolor="white")
    plt.close(fig)
    print("wrote", name)


def frame(ax, nmax, ylim, room=0.8):
    """Index axis at the bottom with whole-number ticks; a thin line at height 0 when it
    is in range (the axis itself stays at the bottom, so labels never sit on the points)."""
    ax.set_xlim(0, nmax + room)
    ax.set_ylim(*ylim)
    for s in ("top", "right"):
        ax.spines[s].set_visible(False)
    if ylim[0] < 0 < ylim[1]:
        ax.axhline(0, color=INK, lw=0.8, zorder=1)
    ax.xaxis.set_major_locator(MaxNLocator(integer=True, nbins=6))
    ax.grid(True, color=GRID, lw=0.8)
    ax.set_axisbelow(True)
    ax.set_xlabel("$n$", loc="right")


def points(ax, n, a, color=C1, ms=6):
    ax.plot(n, a, "o", color=color, ms=ms, zorder=5)


def fig_seq_points():
    fig, axs = plt.subplots(1, 3, figsize=(11.5, 3.4))
    n = np.arange(1, 13)
    ax = axs[0]; frame(ax, 12, (-0.05, 1.1)); points(ax, n, 1 / n); ax.set_title(r"$a_n=\frac{1}{n}$")
    assert all(np.diff(1 / n) < 0) and (1 / n)[-1] < 0.1     # caption: the terms come down towards 0
    ax = axs[1]; frame(ax, 12, (-1.4, 1.4)); points(ax, n, (-1.0) ** n, C2); ax.set_title(r"$a_n=(-1)^n$")
    fib = [1, 1]
    while len(fib) < 12:
        fib.append(fib[-1] + fib[-2])
    ax = axs[2]; frame(ax, 12, (0, 160)); points(ax, n, fib, C3); ax.set_title(r"$1,1,2,3,5,8,\ldots$")
    assert fib[-1] == 144                                      # Fibonacci: the 12th term is 144
    fig.tight_layout()
    save(fig, "ch02-seq-points")


def fig_to_infinity():
    fig, axs = plt.subplots(1, 2, figsize=(9.6, 3.5))
    n = np.arange(1, 41)
    a = np.sqrt(n)
    M = 4.5
    ax = axs[0]; frame(ax, 40, (0, 7))
    ax.axhline(M, color=C4, ls="--", lw=1.3)
    ax.text(1, M + 0.25, "$M$", color=C4, fontsize=13)
    N = int(np.argmax(a > M)) + 1
    assert all(a[N - 1:] > M) and all(a[:N - 1] <= M)        # caption: from some place on, all above M
    points(ax, n[:N - 1], a[:N - 1], GREY, 5); points(ax, n[N - 1:], a[N - 1:], C1, 5)
    ax.set_title(r"$a_n=\sqrt{n}$")
    b = np.array([0 if k % 2 else k // 2 for k in range(1, 41)], dtype=float)
    ax = axs[1]; frame(ax, 40, (-1, 22)); points(ax, n, b, C2, 5)
    ax.set_title(r"$0,1,0,2,0,3,\ldots$")
    assert b.max() == 20 and (b == 0).sum() == 20                # caption: grows past every height, yet keeps returning to 0
    fig.tight_layout()
    save(fig, "ch02-to-infinity")


def fig_geometric():
    fig, axs = plt.subplots(1, 4, figsize=(13, 3.2))
    n = np.arange(1, 16)
    cases = [(0.8, (-0.1, 1.0), C1), (-0.8, (-1.0, 1.0), C3), (1.2, (0, 16), C2), (-1, (-1.4, 1.4), C4)]
    for ax, (q, yl, col) in zip(axs, cases):
        frame(ax, 15, yl)
        a = q ** n
        points(ax, n, a, col, 5)
        ax.set_title(rf"$q={q:g}$")
        if abs(q) < 1:
            assert abs(a[-1]) < 0.05                           # |q| < 1: the terms go to 0
        elif q > 1:
            assert a[-1] > 10                                  # q > 1: they grow
        else:
            assert set(a) == {1.0, -1.0}                      # q = -1: they jump between 1 and -1
    fig.tight_layout()
    save(fig, "ch02-geometric")


def fig_squeeze():
    fig, ax = plt.subplots(figsize=(7.5, 3.6))
    n = np.arange(1, 31)
    frame(ax, 30, (-1.1, 1.1))
    a = np.sin(n) / n
    assert all(-1 / n <= a) and all(a <= 1 / n)               # caption: sin(n)/n is between -1/n and 1/n
    points(ax, n, 1 / n, GREY, 4); points(ax, n, -1 / n, GREY, 4); points(ax, n, a, C4, 6)
    ax.text(3.2, 0.42, r"$\frac{1}{n}$", color=INK, fontsize=15)
    ax.text(3.2, -0.5, r"$-\frac{1}{n}$", color=INK, fontsize=15)
    ax.text(9.5, 0.2, r"$\frac{\sin n}{n}$", color=C4, fontsize=15)
    save(fig, "ch02-squeeze")


def fig_monotone_e():
    fig, ax = plt.subplots(figsize=(7.5, 3.6))
    n = np.arange(1, 31)
    a = (1 + 1 / n) ** n
    assert all(np.diff(a) > 0) and a.max() < np.e < 3          # caption: increases, stays below e and below 3
    frame(ax, 30, (1.8, 3.2), room=3)
    ax.hlines(3, 0, 30.6, color=C4, ls="--", lw=1.3); ax.text(31.1, 3, "$3$", color=C4, va="center", fontsize=13)
    ax.hlines(np.e, 0, 30.6, color=C3, lw=1.3); ax.text(31.1, np.e, "$e$", color=C3, va="center", fontsize=14)
    points(ax, n, a, C1, 5)
    ax.set_title(r"$a_n=\left(1+\frac{1}{n}\right)^n$")
    save(fig, "ch02-monotone-e")


def fig_subsequences():
    fig, ax = plt.subplots(figsize=(7.5, 3.6))
    n = np.arange(1, 31)
    a = (-1.0) ** n + 1 / n
    frame(ax, 30, (-1.3, 2.0), room=3.5)
    even, odd = n % 2 == 0, n % 2 == 1
    points(ax, n[even], a[even], C1, 6); points(ax, n[odd], a[odd], C2, 6)
    ax.hlines(1, 0, 30.6, color=C1, ls="--", lw=1); ax.hlines(-1, 0, 30.6, color=C2, ls="--", lw=1)
    ax.text(31.1, 1, "$1$", color=C1, va="center", fontsize=13); ax.text(31.1, -1, "$-1$", color=C2, va="center", fontsize=13)
    assert abs(a[even][-1] - 1) < 0.05 and abs(a[odd][-1] + 1) < 0.05   # caption: even terms -> 1, odd -> -1
    ax.set_title(r"$a_n=(-1)^n+\frac{1}{n}$")
    save(fig, "ch02-subsequences")


# fig_monotone_e and fig_subsequences are for the later sections (monotone sequences and e,
# subsequences); they are not built until those sections are written.
FIGURES = [fig_seq_points, fig_to_infinity, fig_geometric, fig_squeeze]

if __name__ == "__main__":
    for f in FIGURES:
        f()
