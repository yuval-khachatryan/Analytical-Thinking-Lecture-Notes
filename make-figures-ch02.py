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


def number_line(ax, lo, hi, ticks):
    """A bare horizontal real line from lo to hi with labelled ticks (no frame)."""
    ax.axhline(0, color=INK, lw=1.1, zorder=1)
    for t, lab in ticks:
        ax.plot([t, t], [-0.05, 0.05], color=INK, lw=1, zorder=2)
        ax.text(t, -0.13, lab, ha="center", va="top", fontsize=12)
    ax.set_xlim(lo, hi)
    ax.set_ylim(-0.35, 0.45)
    ax.axis("off")


def tag(ax, x, text, color, h=0.2):
    ax.annotate(text, xy=(x, 0.04), xytext=(x, h), ha="center", va="bottom", fontsize=12, color=color,
                arrowprops=dict(arrowstyle="-", color=color, lw=0.7, shrinkA=1, shrinkB=1))


def fig_seq_line():
    """The same kind of sequences, drawn as dots on the real line (no index axis)."""
    fig, axs = plt.subplots(3, 1, figsize=(8.6, 4.4))
    n = np.arange(1, 61)
    ax = axs[0]
    a = 1 / n
    number_line(ax, -0.15, 1.15, [(0, "$0$"), (1, "$1$")])
    ax.plot(a, 0 * a, "o", color=C1, ms=5, alpha=0.75, zorder=4)
    for k, lab in ((1, "$a_1$"), (2, "$a_2$"), (3, "$a_3$")):
        tag(ax, 1 / k, lab, C1)
    ax.set_title(r"$a_n=\frac{1}{n}$", loc="left", fontsize=13)
    assert all(np.diff(a) < 0) and a[-1] < 0.02                # caption: the dots crowd near 0
    ax = axs[1]
    b = (-1.0) ** n
    number_line(ax, -1.4, 1.4, [(-1, "$-1$"), (0, "$0$"), (1, "$1$")])
    ax.plot([-1, 1], [0, 0], "o", color=C2, ms=7, zorder=4)
    tag(ax, -1, r"$a_1, a_3, a_5, \ldots$", C2); tag(ax, 1, r"$a_2, a_4, a_6, \ldots$", C2)
    ax.set_title(r"$a_n=(-1)^n$", loc="left", fontsize=13)
    assert set(b) == {-1.0, 1.0}                               # caption: only two points
    ax = axs[2]
    c = 1 + (-1.0) ** n / n
    number_line(ax, -0.15, 1.65, [(0, "$0$"), (1, "$1$")])
    ax.plot(c, 0 * c, "o", color=C3, ms=5, alpha=0.75, zorder=4)
    for k in (1, 2, 3):
        tag(ax, 1 + (-1) ** k / k, f"$a_{k}$", C3)
    ax.set_title(r"$a_n=1+\frac{(-1)^n}{n}$", loc="left", fontsize=13)
    assert (c[::2] < 1).all() and (c[1::2] > 1).all() and abs(c[-1] - 1) < 0.02   # caption: both sides of 1
    fig.tight_layout(h_pad=0.6)
    save(fig, "ch02-seq-line")


def fig_limit_line():
    """Convergence on the real line: all terms but finitely many lie in (L - eps, L + eps)."""
    fig, ax = plt.subplots(figsize=(8.2, 1.9))
    n = np.arange(1, 81)
    a = 1 + (-1.0) ** n / n
    L, eps = 1.0, 0.3
    out = np.abs(a - L) >= eps
    assert list(n[out]) == [1, 2, 3]                            # caption: only a_1, a_2, a_3 are outside
    number_line(ax, -0.15, 1.65, [(L - eps, r"$L-\varepsilon$"), (L, "$L$"), (L + eps, r"$L+\varepsilon$")])
    ax.fill_between([L - eps, L + eps], -0.09, 0.09, color=C1, alpha=0.13, lw=0, zorder=0)
    for x, s in ((L - eps, "("), (L + eps, ")")):
        ax.text(x, 0, s, ha="center", va="center", fontsize=15, color=C1, zorder=6)
    ax.plot(a[~out], 0 * a[~out], "o", color=C1, ms=4.5, alpha=0.7, zorder=4)
    ax.plot(a[out], 0 * a[out], "o", color=C4, ms=6.5, zorder=5)
    for k in n[out]:
        tag(ax, a[k - 1], f"$a_{k}$", C4)
    save(fig, "ch02-limit-line")


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


FIGURES = [fig_seq_points, fig_seq_line, fig_limit_line, fig_to_infinity, fig_geometric, fig_squeeze,
           fig_monotone_e, fig_subsequences]

if __name__ == "__main__":
    for f in FIGURES:
        f()
