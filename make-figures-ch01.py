#!/usr/bin/env python3
"""Static figures for lecture 1 (real numbers and functions).

The figures appear in both the HTML and the PDF edition, so they carry no Hebrew:
matplotlib does no bidi shaping. Labels are mathtext only; the explanation goes in
the Hebrew caption beside the figure in the .qmd.

Run from Notes/:   ../.venv/bin/python make-figures-ch01.py
Outputs:           figures/<name>.png  (names listed in FIGURES at the bottom)
"""
from pathlib import Path

import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

FIGDIR = Path(__file__).resolve().parent / "figures"

# Course palette (matches _styles.html)
C1 = "#4f46e5"   # indigo
C2 = "#ea580c"   # orange
C3 = "#0d9488"   # teal
C4 = "#e11d48"   # rose
GREY = "#94a3b8"
INK = "#0f172a"
GRID = "#eef2f7"

plt.rcParams.update({
    "font.size": 12,
    "axes.edgecolor": INK,
    "axes.linewidth": 0.8,
    "mathtext.fontset": "cm",
    "axes.titlepad": 16,
    "xtick.labelsize": 13,
    "ytick.labelsize": 13,
})
from matplotlib.ticker import FuncFormatter, ScalarFormatter, MaxNLocator


def _num(v, _pos=None):
    """Tick label in mathtext (so it matches the math font); the origin's 0 is blank."""
    return "" if abs(v) < 1e-9 else f"${v:g}$"


def save(fig, name):
    # Every axis still on matplotlib's default formatter gets mathtext labels with
    # the 0 hidden (the axes cross there and the label only clutters the origin).
    for ax in fig.axes:
        for axis in (ax.xaxis, ax.yaxis):
            if isinstance(axis.get_major_formatter(), ScalarFormatter):
                axis.set_major_formatter(FuncFormatter(_num))
    FIGDIR.mkdir(exist_ok=True)
    fig.savefig(FIGDIR / f"{name}.png", dpi=190, bbox_inches="tight",
                pad_inches=0.16, facecolor="white")
    plt.close(fig)
    print("wrote", name)


def axes_through_origin(ax, xlim, ylim, grid=True):
    """Classic school-style axes: spines through the origin, arrows at the ends."""
    ax.set_xlim(*xlim)
    ax.set_ylim(*ylim)
    for s in ("top", "right"):
        ax.spines[s].set_visible(False)
    ax.spines["left"].set_position("zero")
    ax.spines["bottom"].set_position("zero")
    ax.plot(1, 0, ">", color=INK, transform=ax.get_yaxis_transform(), clip_on=False, ms=5)
    ax.plot(0, 1, "^", color=INK, transform=ax.get_xaxis_transform(), clip_on=False, ms=5)
    if grid:
        ax.grid(True, color=GRID, lw=0.8)
        ax.set_axisbelow(True)


def pi_ticks(ax, lo, hi, step=0.5, axis="x"):
    """Ticks at multiples of step*pi, labelled in mathtext."""
    ks = np.arange(np.ceil(lo / (step * np.pi)), np.floor(hi / (step * np.pi)) + 1)
    vals = ks * step * np.pi
    labels = []
    for k in ks:
        frac = k * step
        if frac == 0:
            labels.append("")
            continue
        num, den = frac.as_integer_ratio()
        sign = "-" if num < 0 else ""
        num = abs(num)
        if den == 1:
            labels.append(rf"${sign}{'' if num == 1 else num}\pi$")
        else:
            labels.append(rf"${sign}\frac{{{'' if num == 1 else num}\pi}}{{{den}}}$")
    if axis == "x":
        ax.set_xticks(vals, labels, fontsize=15)
    else:
        ax.set_yticks(vals, labels, fontsize=15)


def number_line(ax, lo, hi, y=0.0):
    ax.annotate("", xy=(hi, y), xytext=(lo, y),
                arrowprops=dict(arrowstyle="-|>", color=INK, lw=1.0))


def dot(ax, x, y, closed, color):
    ax.plot([x], [y], "o", ms=8, mfc=color if closed else "white", mec=color, mew=1.8, zorder=5)


# ---------------------------------------------------------------- §1 number systems
def fig_real_line():
    fig, ax = plt.subplots(figsize=(8, 1.4))
    number_line(ax, -3.6, 4.4)
    for k in range(-3, 5):
        ax.plot([k, k], [-0.07, 0.07], color=INK, lw=1)
        ax.text(k, -0.22, f"${k}$", ha="center", va="top", fontsize=11)
    marks = [(-2.5, r"$-\frac{5}{2}$"), (0.75, r"$\frac{3}{4}$"),
             (np.sqrt(2), r"$\sqrt{2}$"), (np.pi, r"$\pi$")]
    for x, lab in marks:
        ax.plot([x], [0], "o", color=C1, ms=6, zorder=5)
        ax.text(x, 0.18, lab, ha="center", va="bottom", fontsize=13, color=C1)
    ax.set_xlim(-3.8, 4.6)
    ax.set_ylim(-0.6, 0.65)
    ax.axis("off")
    save(fig, "real-line")


def fig_intervals():
    rows = [
        (r"$(a,b)$", "open", False, False, False),
        (r"$[a,b]$", "closed", True, True, False),
        (r"$[a,b)$", "half", True, False, False),
        (r"$[a,\infty)$", "ray", True, None, True),
    ]
    fig, ax = plt.subplots(figsize=(7, 3.2))
    a, b = 1.0, 4.0
    for i, (lab, _, ca, cb, ray) in enumerate(rows):
        y = -i
        number_line(ax, -0.5, 6.0, y)
        end = 5.9 if ray else b
        ax.plot([a, end], [y, y], color=C1, lw=4, solid_capstyle="butt", zorder=3)
        dot(ax, a, y, ca, C1)
        if not ray:
            dot(ax, b, y, cb, C1)
        else:
            ax.annotate("", xy=(6.0, y), xytext=(5.6, y),
                        arrowprops=dict(arrowstyle="-|>", color=C1, lw=2.5))
        ax.text(a, y - 0.22, "$a$", ha="center", va="top")
        if not ray:
            ax.text(b, y - 0.22, "$b$", ha="center", va="top")
        ax.text(-0.8, y, lab, ha="right", va="center", fontsize=14)
    ax.set_xlim(-2.6, 6.2)
    ax.set_ylim(-3.6, 0.4)
    ax.axis("off")
    save(fig, "intervals")


# ---------------------------------------------------------------- §3 absolute value
def fig_distance():
    fig, ax = plt.subplots(figsize=(7, 1.6))
    a, r = 3.0, 1.6
    number_line(ax, -0.3, 6.3)
    ax.plot([a - r, a + r], [0, 0], color=C1, lw=4, solid_capstyle="butt", zorder=3)
    dot(ax, a - r, 0, False, C1)
    dot(ax, a + r, 0, False, C1)
    ax.plot([a], [0], "o", color=C2, ms=7, zorder=6)
    ax.text(a, -0.2, "$a$", ha="center", va="top", fontsize=13)
    ax.text(a - r, -0.2, "$a-r$", ha="center", va="top", fontsize=13)
    ax.text(a + r, -0.2, "$a+r$", ha="center", va="top", fontsize=13)
    for x0, x1 in ((a, a - r), (a, a + r)):
        ax.annotate("", xy=(x1, 0.32), xytext=(x0, 0.32),
                    arrowprops=dict(arrowstyle="<->", color=C2, lw=1.3))
        ax.text((x0 + x1) / 2, 0.38, "$r$", ha="center", va="bottom", color=C2, fontsize=13)
    ax.set_xlim(-0.5, 6.5)
    ax.set_ylim(-0.6, 0.75)
    ax.axis("off")
    save(fig, "distance-interval")


# ---------------------------------------------------------------- §4 Cartesian product
def fig_square():
    fig, ax = plt.subplots(figsize=(4.2, 3.4))
    axes_through_origin(ax, (-0.6, 4.2), (-0.6, 3.0))
    ax.add_patch(plt.Rectangle((1, 0), 2, 2, fc=C1, alpha=0.15, ec="none"))
    ax.add_patch(plt.Rectangle((1, 0), 2, 2, fc="none", ec=C1, lw=2))
    ax.plot([2], [1.5], "o", color=C2, ms=6)
    ax.text(2.08, 1.55, "$(2,1.5)$", color=C2, fontsize=12, va="bottom")
    ax.set_xticks([1, 2, 3])
    ax.set_yticks([1, 2])
    ax.text(4.15, -0.12, "$x$", ha="right", va="top")
    ax.text(-0.12, 2.95, "$y$", ha="right", va="top")
    save(fig, "cartesian-square")


# ---------------------------------------------------------------- §5 functions
def fig_not_functions():
    fig, axs = plt.subplots(2, 2, figsize=(9, 7.4))
    t = np.linspace(0, 2 * np.pi, 600)

    ax = axs[0, 0]
    axes_through_origin(ax, (-3.2, 3.2), (-3.2, 3.2))
    ax.plot(2 * np.cos(t), 2 * np.sin(t), color=C1, lw=2.2)
    ax.axvline(1.0, color=C4, lw=1.4, ls="--")
    ax.plot([1, 1], [np.sqrt(3), -np.sqrt(3)], "o", color=C4, ms=7, zorder=6)
    ax.set_title(r"$x^2+y^2=4$")

    ax = axs[0, 1]
    axes_through_origin(ax, (-4, 4), (-3.2, 3.2))
    ax.plot(3 * np.cos(t), 2 * np.sin(t), color=C1, lw=2.2)
    ax.axvline(1.5, color=C4, lw=1.4, ls="--")
    yv = 2 * np.sqrt(1 - 1.5 ** 2 / 9)
    ax.plot([1.5, 1.5], [yv, -yv], "o", color=C4, ms=7, zorder=6)
    ax.set_title(r"$\frac{x^2}{9}+\frac{y^2}{4}=1$")

    ax = axs[1, 0]
    axes_through_origin(ax, (-6, 6), (-3.2, 3.2))
    s = np.linspace(-2.2, 2.2, 400)
    for sgn in (1, -1):
        ax.plot(sgn * 2 * np.cosh(s), np.sinh(s), color=C1, lw=2.2)
    xx = np.linspace(-6, 6, 10)
    ax.plot(xx, xx / 2, color=GREY, ls="--", lw=1.2)
    ax.plot(xx, -xx / 2, color=GREY, ls="--", lw=1.2)
    ax.axvline(3.0, color=C4, lw=1.4, ls="--")
    yv = np.sqrt(3.0 ** 2 / 4 - 1)
    ax.plot([3, 3], [yv, -yv], "o", color=C4, ms=7, zorder=6)
    ax.set_title(r"$\frac{x^2}{4}-y^2=1$")

    ax = axs[1, 1]
    axes_through_origin(ax, (-1, 6), (-3.2, 3.2))
    y = np.linspace(-2.5, 2.5, 400)
    ax.plot(y ** 2, y, color=C1, lw=2.2)
    ax.axvline(4.0, color=C4, lw=1.4, ls="--")
    ax.plot([4, 4], [2, -2], "o", color=C4, ms=7, zorder=6)
    ax.set_title(r"$x=y^2$")

    for ax in axs.flat:
        ax.set_aspect("equal")
        ax.xaxis.set_major_locator(MaxNLocator(integer=True, nbins=6))
        ax.yaxis.set_major_locator(MaxNLocator(integer=True, nbins=6))
    fig.tight_layout()
    save(fig, "not-functions")


def fig_even_odd():
    fig, axs = plt.subplots(1, 2, figsize=(8.4, 3.8))
    x = np.linspace(-2.6, 2.6, 400)

    ax = axs[0]
    axes_through_origin(ax, (-2.8, 2.8), (-1.5, 6.5))
    ax.plot(x, x ** 2, color=C1, lw=2.2)
    for xp in (-1.6, 1.6):
        ax.plot([xp], [xp ** 2], "o", color=C2, ms=7, zorder=6)
        ax.plot([xp, xp], [0, xp ** 2], color=C2, lw=1, ls=":")
    ax.set_xticks([-1.6, 1.6], ["$-x$", "$x$"])
    ax.set_yticks([])
    ax.set_title(r"$f(x)=x^2$")

    ax = axs[1]
    axes_through_origin(ax, (-2.8, 2.8), (-4.5, 4.5))
    ax.plot(x, x ** 3 / 3 * 1.0, color=C1, lw=2.2)
    xp = 1.6
    ax.plot([xp, -xp], [xp ** 3 / 3, -xp ** 3 / 3], "o", color=C2, ms=7, zorder=6)
    ax.plot([xp, -xp], [xp ** 3 / 3, -xp ** 3 / 3], color=C2, lw=1, ls=":")
    ax.set_xticks([-xp, xp], ["$-x$", "$x$"])
    ax.set_yticks([])
    ax.set_title(r"$f(x)=x^3$")
    fig.tight_layout()
    save(fig, "even-odd")


# ---------------------------------------------------------------- §7 transformations
def fig_sqrt_family():
    cases = [
        (r"$\sqrt{x+1}$", lambda x: np.sqrt(x + 1), (-1, 6)),
        (r"$\sqrt{x}+1$", lambda x: np.sqrt(x) + 1, (0, 6)),
        (r"$3\sqrt{x}$", lambda x: 3 * np.sqrt(x), (0, 6)),
        (r"$-\sqrt{x}$", lambda x: -np.sqrt(x), (0, 6)),
        (r"$\sqrt{-x}$", lambda x: np.sqrt(-x), (-6, 0)),
        (r"$\sqrt{x-2}$", lambda x: np.sqrt(x - 2), (2, 6)),
    ]
    fig, axs = plt.subplots(2, 3, figsize=(10, 5.6))
    base = np.linspace(0, 6, 400)
    for ax, (title, f, (lo, hi)) in zip(axs.flat, cases):
        axes_through_origin(ax, (-6.3, 6.3), (-3.3, 4.6))
        ax.plot(base, np.sqrt(base), color=GREY, lw=1.6, ls="--")
        xs = np.linspace(lo, hi, 400)
        ax.plot(xs, f(xs), color=C1, lw=2.4)
        ax.set_title(title, fontsize=14)
        ax.set_xticks([-4, -2, 2, 4])
        ax.set_yticks([-2, 2, 4])
    fig.tight_layout()
    save(fig, "sqrt-family")


# ---------------------------------------------------------------- §9 polynomials
def fig_polynomials():
    cases = [
        (r"$x^2-x-6$", np.poly1d([1, -1, -6]), [-2, 3], (-4, 5), (-8, 8)),
        (r"$x^3-9x$", np.poly1d([1, 0, -9, 0]), [-3, 0, 3], (-4.2, 4.2), (-16, 16)),
        (r"$x^2+4$", np.poly1d([1, 0, 4]), [], (-3.5, 3.5), (-2, 14)),
        (r"$x^2+6x+9$", np.poly1d([1, 6, 9]), [-3], (-6.5, 0.8), (-2, 10)),
    ]
    fig, axs = plt.subplots(2, 2, figsize=(8, 6.4))
    for ax, (title, p, roots, xl, yl) in zip(axs.flat, cases):
        for r in roots:
            assert abs(p(r)) < 1e-12, (title, r)
        axes_through_origin(ax, xl, yl)
        x = np.linspace(*xl, 500)
        ax.plot(x, p(x), color=C1, lw=2.2)
        for r in roots:
            ax.plot([r], [0], "o", color=C2, ms=8, zorder=6)
        ax.set_title(title, fontsize=14)
        ax.xaxis.set_major_locator(MaxNLocator(integer=True, nbins=5))
        ax.yaxis.set_major_locator(MaxNLocator(integer=True, nbins=5))
    fig.tight_layout()
    save(fig, "polynomials")


# ---------------------------------------------------------------- §10 trig
def fig_unit_circle():
    th = 0.95
    fig, ax = plt.subplots(figsize=(5, 5))
    axes_through_origin(ax, (-1.45, 1.45), (-1.45, 1.45), grid=False)
    t = np.linspace(0, 2 * np.pi, 600)
    ax.plot(np.cos(t), np.sin(t), color=GREY, lw=1.4)
    arc = np.linspace(0, th, 200)
    ax.plot(np.cos(arc), np.sin(arc), color=C2, lw=4)
    ax.text(1.04 * np.cos(th / 2) + 0.04, 1.04 * np.sin(th / 2), r"$\theta$", color=C2, fontsize=16)
    px, py = np.cos(th), np.sin(th)
    assert abs(px ** 2 + py ** 2 - 1) < 1e-12
    ax.plot([0, px], [0, py], color=INK, lw=1)
    ax.plot([px, px], [0, py], color=C1, lw=1.6, ls="--")
    ax.plot([0, px], [py, py], color=C3, lw=1.6, ls="--")
    ax.plot([px], [py], "o", color=C1, ms=8, zorder=6)
    ax.text(px + 0.05, py + 0.05, r"$(\cos\theta,\ \sin\theta)$", fontsize=14)
    ax.text(px, -0.1, r"$\cos\theta$", ha="center", va="top", color=C1, fontsize=13)
    ax.text(-0.06, py, r"$\sin\theta$", ha="right", va="center", color=C3, fontsize=13)
    ax.plot([1], [0], "o", color=INK, ms=5)
    ax.text(1.03, 0.04, "$(1,0)$", fontsize=11)
    ax.set_xticks([])
    ax.set_yticks([])
    ax.set_aspect("equal")
    save(fig, "unit-circle")


def fig_sin_cos():
    fig, ax = plt.subplots(figsize=(9, 3.2))
    axes_through_origin(ax, (-2 * np.pi - 0.3, 2 * np.pi + 0.3), (-1.5, 1.5))
    x = np.linspace(-2 * np.pi, 2 * np.pi, 800)
    ax.plot(x, np.sin(x), color=C3, lw=2.2, label=r"$\sin x$")
    ax.plot(x, np.cos(x), color=C1, lw=2.2, label=r"$\cos x$")
    pi_ticks(ax, -2 * np.pi, 2 * np.pi, 0.5)
    ax.set_yticks([-1, 1])
    ax.legend(loc="lower center", bbox_to_anchor=(0.5, 1.0), ncol=2, fontsize=13, frameon=False)
    save(fig, "sin-cos")


def fig_tan():
    fig, ax = plt.subplots(figsize=(8, 4))
    axes_through_origin(ax, (-3 * np.pi / 2 - 0.3, 3 * np.pi / 2 + 0.3), (-5, 5))
    for k in (-1, 0, 1):
        x = np.linspace(k * np.pi - np.pi / 2 + 0.02, k * np.pi + np.pi / 2 - 0.02, 400)
        ax.plot(x, np.tan(x), color=C1, lw=2.2)
    for a in (-3 * np.pi / 2, -np.pi / 2, np.pi / 2, 3 * np.pi / 2):
        ax.axvline(a, color=C4, ls="--", lw=1.2)
    pi_ticks(ax, -3 * np.pi / 2, 3 * np.pi / 2, 0.5)
    ax.set_yticks([-4, -2, 2, 4])
    ax.set_title(r"$\tan x$")
    save(fig, "tan")


# ---------------------------------------------------------------- §11 exponential
def fig_exponentials():
    fig, ax = plt.subplots(figsize=(6, 4.4))
    axes_through_origin(ax, (-3, 3), (-0.5, 8))
    x = np.linspace(-3, 3, 400)
    for f, lab, c in ((lambda x: 2 ** x, r"$2^x$", C1),
                      (np.exp, r"$e^x$", C3),
                      (lambda x: 10 ** x, r"$10^x$", C2),
                      (lambda x: 0.5 ** x, r"$\left(\frac{1}{2}\right)^x$", C4)):
        ax.plot(x, f(x), color=c, lw=2.2, label=lab)
    ax.plot([0], [1], "o", color=INK, ms=6, zorder=6)
    ax.text(0.1, 1.15, "$(0,1)$", fontsize=11)
    ax.legend(loc="upper left", bbox_to_anchor=(1.02, 1.0), fontsize=13, framealpha=1)
    save(fig, "exponentials")


# ---------------------------------------------------------------- §12 inverse
def fig_horizontal_line():
    fig, axs = plt.subplots(1, 2, figsize=(8.4, 3.8))
    x = np.linspace(-2.4, 2.4, 400)
    ax = axs[0]
    axes_through_origin(ax, (-2.6, 2.6), (-1, 6))
    ax.plot(x, x ** 2, color=C1, lw=2.2)
    ax.axhline(4, color=C4, ls="--", lw=1.4)
    ax.plot([-2, 2], [4, 4], "o", color=C4, ms=7, zorder=6)
    ax.set_title(r"$x^2$")
    ax = axs[1]
    axes_through_origin(ax, (-2.6, 2.6), (-9, 9))
    ax.plot(x, x ** 3, color=C1, lw=2.2)
    ax.axhline(4, color=C3, ls="--", lw=1.4)
    xr = np.cbrt(4.0)
    ax.plot([xr], [4], "o", color=C3, ms=7, zorder=6)
    ax.set_title(r"$x^3$")
    ax.set_yticks([-8, -4, 4, 8])
    fig.tight_layout()
    save(fig, "horizontal-line-test")


# ---------------------------------------------------------------- §13 logarithms
def fig_exp_ln():
    fig, ax = plt.subplots(figsize=(5.2, 5.2))
    axes_through_origin(ax, (-3, 5), (-3, 5))
    x = np.linspace(-3, 1.65, 300)
    ax.plot(x, np.exp(x), color=C1, lw=2.2, label=r"$e^x$")
    x = np.linspace(0.04, 5, 300)
    ax.plot(x, np.log(x), color=C2, lw=2.2, label=r"$\ln x$")
    x = np.linspace(-3, 5, 10)
    ax.plot(x, x, color=GREY, ls="--", lw=1.2, label="$y=x$")
    ax.plot([0, 1], [1, 0], "o", color=INK, ms=5, zorder=6)
    ax.text(0.12, 1.1, "$(0,1)$", fontsize=11)
    ax.text(1.05, -0.35, "$(1,0)$", fontsize=11)
    ax.set_aspect("equal")
    ax.legend(loc="lower right", fontsize=12, framealpha=1)
    save(fig, "exp-ln")


# ---------------------------------------------------------------- §14 powers and roots
def fig_powers_roots():
    fig, axs = plt.subplots(1, 2, figsize=(9, 4.4))
    ax = axs[0]
    axes_through_origin(ax, (-2.2, 4.2), (-1.2, 4.2))
    x = np.linspace(-2, 2, 300)
    ax.plot(x, x ** 2, color=GREY, lw=1.4)
    x = np.linspace(0, 2, 300)
    ax.plot(x, x ** 2, color=C1, lw=2.4, label=r"$x^2,\ x\geq 0$")
    x = np.linspace(0, 4, 300)
    ax.plot(x, np.sqrt(x), color=C2, lw=2.4, label=r"$\sqrt{x}$")
    ax.plot([-1.2, 4.2], [-1.2, 4.2], color=GREY, ls="--", lw=1)
    ax.set_aspect("equal")
    ax.legend(loc="upper left", fontsize=11, framealpha=1)
    ax = axs[1]
    axes_through_origin(ax, (-3, 3), (-3, 3))
    x = np.linspace(-1.44, 1.44, 300)
    ax.plot(x, x ** 3, color=C1, lw=2.4, label=r"$x^3$")
    x = np.linspace(-3, 3, 600)
    ax.plot(x, np.cbrt(x), color=C2, lw=2.4, label=r"$\sqrt[3]{x}$")
    ax.plot([-3, 3], [-3, 3], color=GREY, ls="--", lw=1)
    ax.set_aspect("equal")
    ax.legend(loc="upper left", fontsize=11, framealpha=1)
    fig.tight_layout()
    save(fig, "powers-roots")


# ---------------------------------------------------------------- §15 rational
def fig_rational():
    fig, axs = plt.subplots(1, 2, figsize=(9, 4))
    for ax, f, title in ((axs[0], lambda x: 1 / x, r"$\frac{1}{x}$"),
                         (axs[1], lambda x: 1 / x ** 2, r"$\frac{1}{x^2}$")):
        axes_through_origin(ax, (-4, 4), (-4, 4))
        for lo, hi in ((-4, -0.2), (0.2, 4)):
            x = np.linspace(lo, hi, 400)
            y = f(x)
            ax.plot(x[np.abs(y) < 4.5], y[np.abs(y) < 4.5], color=C1, lw=2.2)
        ax.set_title(title, fontsize=18)
    fig.tight_layout()
    save(fig, "rational")


# ---------------------------------------------------------------- §16 sign and floor
def fig_sgn_floor():
    fig, axs = plt.subplots(1, 2, figsize=(9, 3.8))
    ax = axs[0]
    axes_through_origin(ax, (-3, 3), (-1.8, 1.8))
    ax.plot([-3, 0], [-1, -1], color=C1, lw=2.4)
    ax.plot([0, 3], [1, 1], color=C1, lw=2.4)
    dot(ax, 0, -1, False, C1)
    dot(ax, 0, 1, False, C1)
    dot(ax, 0, 0, True, C1)
    ax.set_yticks([-1, 1], ["", ""])
    ax.text(-0.12, 1, "$1$", ha="right", va="center", fontsize=11)
    ax.text(0.12, -1, "$-1$", ha="left", va="center", fontsize=11)
    ax.set_title(r"$\mathrm{sgn}(x)$")
    ax = axs[1]
    axes_through_origin(ax, (-2.5, 3.5), (-2.8, 3.5))
    for k in range(-2, 3):
        ax.plot([k, k + 1], [k, k], color=C1, lw=2.4)
        dot(ax, k, k, True, C1)
        dot(ax, k + 1, k, False, C1)
    ax.yaxis.tick_right()
    ax.set_title(r"$\lfloor x\rfloor$")
    fig.tight_layout()
    save(fig, "sgn-floor")


# ---------------------------------------------------------------- §17 inverse trig
def fig_inverse_trig():
    fig, axs = plt.subplots(2, 3, figsize=(11, 6.6))
    # top row: the original function, restricted piece highlighted
    tops = [
        (r"$\sin x$", np.sin, (-np.pi / 2, np.pi / 2)),
        (r"$\cos x$", np.cos, (0, np.pi)),
        (r"$\tan x$", np.tan, (-np.pi / 2 + 0.02, np.pi / 2 - 0.02)),
    ]
    for ax, (title, f, (lo, hi)) in zip(axs[0], tops):
        axes_through_origin(ax, (-1.6 * np.pi, 1.6 * np.pi), (-2.5, 2.5))
        if f is np.tan:
            for k in (-1, 0, 1):
                x = np.linspace(k * np.pi - np.pi / 2 + 0.05, k * np.pi + np.pi / 2 - 0.05, 300)
                ax.plot(x, np.tan(x), color=GREY, lw=1.3)
        else:
            x = np.linspace(-1.6 * np.pi, 1.6 * np.pi, 600)
            ax.plot(x, f(x), color=GREY, lw=1.3)
        x = np.linspace(lo, hi, 300)
        y = f(x)
        keep = np.abs(y) < 2.5
        ax.plot(x[keep], y[keep], color=C1, lw=2.8)
        pi_ticks(ax, -np.pi, np.pi, 0.5)
        ax.set_yticks([] if f is np.tan else [-1, 1])
        ax.set_title(title, fontsize=14)
    # bottom row: the inverse functions
    x = np.linspace(-1, 1, 400)
    ax = axs[1, 0]
    axes_through_origin(ax, (-1.6, 1.6), (-2, 2))
    ax.plot(x, np.arcsin(x), color=C2, lw=2.4)
    pi_ticks(ax, -np.pi / 2, np.pi / 2, 0.5, axis="y")
    ax.set_xticks([-1, 1])
    ax.set_title(r"$\arcsin x$", fontsize=14)
    ax = axs[1, 1]
    axes_through_origin(ax, (-1.6, 1.6), (-0.5, 3.6))
    ax.plot(x, np.arccos(x), color=C2, lw=2.4)
    pi_ticks(ax, 0, np.pi, 0.5, axis="y")
    ax.set_xticks([-1, 1])
    ax.set_title(r"$\arccos x$", fontsize=14)
    ax = axs[1, 2]
    axes_through_origin(ax, (-6, 6), (-2, 2))
    x = np.linspace(-6, 6, 400)
    ax.plot(x, np.arctan(x), color=C2, lw=2.4)
    for a in (-np.pi / 2, np.pi / 2):
        ax.axhline(a, color=C4, ls="--", lw=1.1)
    pi_ticks(ax, -np.pi / 2, np.pi / 2, 0.5, axis="y")
    ax.set_xticks([-4, 4])
    ax.set_title(r"$\arctan x$", fontsize=14)
    fig.tight_layout()
    save(fig, "inverse-trig")



# ---------------------------------------------------------------- §1: sqrt(2) on the line
def fig_sqrt2():
    fig, ax = plt.subplots(figsize=(6.4, 3.6))
    s2 = np.sqrt(2)
    number_line(ax, -0.6, 2.6)
    for k in (0, 1, 2):
        ax.plot([k, k], [-0.05, 0.05], color=INK, lw=1)
        ax.text(k, -0.1, f"${k}$", ha="center", va="top", fontsize=13)
    ax.add_patch(plt.Rectangle((0, 0), 1, 1, fc=C1, alpha=0.10, ec=C1, lw=1.6))
    ax.plot([0, 1], [0, 1], color=C2, lw=2.4)
    ax.text(0.42, 0.58, r"$\sqrt{2}$", color=C2, fontsize=15, ha="right")
    ax.text(0.5, 1.04, "$1$", ha="center", va="bottom", fontsize=13)
    ax.text(1.04, 0.5, "$1$", ha="left", va="center", fontsize=13)
    t = np.linspace(np.pi / 4, 0, 100)
    ax.plot(s2 * np.cos(t), s2 * np.sin(t), color=C2, lw=1.4, ls="--")
    ax.plot([s2], [0], "o", color=C2, ms=7, zorder=6)
    ax.text(s2, -0.1, r"$\sqrt{2}$", color=C2, ha="center", va="top", fontsize=14)
    ax.set_xlim(-0.7, 2.7)
    ax.set_ylim(-0.4, 1.35)
    ax.set_aspect("equal")
    ax.axis("off")
    save(fig, "sqrt2")


# ---------------------------------------------------------------- §4: graphs of simple functions
def fig_function_examples():
    fig, axs = plt.subplots(2, 2, figsize=(8.6, 7.2))
    x = np.linspace(-3, 3, 400)

    ax = axs[0, 0]
    axes_through_origin(ax, (-3.2, 3.2), (-6, 8))
    ax.plot(x, 3 * x + 1, color=C1, lw=2.2)
    for xp in (-1, 0, 2):
        ax.plot([xp], [3 * xp + 1], "o", color=C2, ms=6, zorder=6)
    ax.set_title(r"$f(x)=3x+1$")

    ax = axs[0, 1]
    axes_through_origin(ax, (-3.2, 3.2), (-1, 9.5))
    ax.plot(x, x ** 2, color=C1, lw=2.2)
    for xp in (-3, -2, -1, 0, 1, 2, 3):
        ax.plot([xp], [xp ** 2], "o", color=C2, ms=6, zorder=6)
    ax.set_title(r"$f(x)=x^2$")

    ax = axs[1, 0]
    axes_through_origin(ax, (-3.2, 3.2), (-1, 3.5))
    ax.plot(x, np.abs(x), color=C1, lw=2.2)
    for xp in (-2, 0, 2):
        ax.plot([xp], [abs(xp)], "o", color=C2, ms=6, zorder=6)
    ax.set_title(r"$f(x)=|x|$")

    ax = axs[1, 1]
    axes_through_origin(ax, (-3.2, 3.2), (-2.5, 9.5))
    xl = np.linspace(-3, 0, 200)
    xr = np.linspace(0, 3, 200)
    ax.plot(xl, xl + 1, color=C1, lw=2.2)
    ax.plot(xr, xr ** 2, color=C1, lw=2.2)
    dot(ax, 0, 1, False, C1)
    dot(ax, 0, 0, True, C1)
    ax.set_title(r"$x+1\ \ (x<0), \qquad x^2\ \ (x\geq 0)$", fontsize=13)
    for a in axs.flat:
        a.xaxis.set_major_locator(MaxNLocator(integer=True, nbins=6))
        a.yaxis.set_major_locator(MaxNLocator(integer=True, nbins=6))
    fig.tight_layout()
    save(fig, "function-examples")


# ---------------------------------------------------------------- §4: a point in the plane
def fig_plane_point():
    fig, ax = plt.subplots(figsize=(4.6, 3.8))
    axes_through_origin(ax, (-1.2, 4.2), (-1.2, 3.2))
    ax.plot([3, 3], [0, 2], color=C1, ls="--", lw=1.4)
    ax.plot([0, 3], [2, 2], color=C3, ls="--", lw=1.4)
    ax.plot([3], [2], "o", color=C2, ms=8, zorder=6)
    ax.text(3.1, 2.1, "$(3,2)$", color=C2, fontsize=14)
    ax.plot([-1], [1], "o", color=C4, ms=7, zorder=6)
    ax.text(-1.05, 1.15, "$(-1,1)$", color=C4, fontsize=13, ha="center", va="bottom")
    ax.text(4.15, -0.12, "$x$", ha="right", va="top")
    ax.text(-0.12, 3.15, "$y$", ha="right", va="top")
    ax.set_xticks([-1, 1, 2, 3])
    ax.set_yticks([-1, 1, 2])
    save(fig, "plane-point")


# ---------------------------------------------------------------- §4: from points to a parabola (print stand-in for the widget)
def fig_parabola_points():
    fig, axs = plt.subplots(1, 3, figsize=(10.5, 3.6))
    xx = np.linspace(-3, 3, 300)
    for ax, n in zip(axs, (5, 9, 41)):
        axes_through_origin(ax, (-3.3, 3.3), (-0.8, 9.6))
        xs = np.linspace(-3, 3, n)
        ax.plot(xx, xx ** 2, color=GREY, lw=1.2, ls="--")
        ax.plot(xs, xs ** 2, color=C1, lw=2.0)
        ax.plot(xs, xs ** 2, "o", color=C2, ms=6 if n < 20 else 3, zorder=6)
        ax.set_title(f"$n={n}$")
        ax.set_yticks([3, 6, 9])
    fig.tight_layout()
    save(fig, "parabola-points")

FIGURES = [
    fig_real_line, fig_intervals, fig_distance, fig_square, fig_not_functions,
    fig_even_odd, fig_sqrt_family, fig_polynomials, fig_unit_circle, fig_sin_cos,
    fig_tan, fig_exponentials, fig_horizontal_line, fig_exp_ln, fig_powers_roots,
    fig_rational, fig_sgn_floor, fig_inverse_trig,
    fig_sqrt2, fig_function_examples, fig_plane_point, fig_parabola_points,
]

if __name__ == "__main__":
    for f in FIGURES:
        f()
