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
import matplotlib.patches

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


def fig_order_line():
    """The numbers of the 'who is on the right?' example, one colour per pair."""
    pairs = [((5, r"$5$"), (2, r"$2$"), C1), ((-1, r"$-1$"), (-3, r"$-3$"), C2),
             ((1, r"$1$"), (0.5, r"$0.5$"), C3)]
    for (big, _), (small, _), _c in pairs:          # the caption: the larger one is on the right
        assert big > small
    fig, ax = plt.subplots(figsize=(7, 1.5))
    number_line(ax, -4.6, 6.6)
    for k in range(-4, 7):
        ax.plot([k, k], [-0.08, 0.08], color=INK, lw=1.2)
        ax.text(k, -0.24, f"${k}$", ha="center", va="top", fontsize=15)
    # 0.5 and 1 are close: push their labels apart (0.5 to the left, 1 to the right)
    nudge = {0.5: (0.47, "right"), 1: (1.03, "left")}
    for a, b, c in pairs:
        for x, lab in (a, b):
            ax.plot([x], [0], "o", color=c, ms=9, zorder=5)
            tx, ha = nudge.get(x, (x, "center"))
            ax.text(tx, 0.2, lab, ha=ha, va="bottom", fontsize=19, color=c)
    ax.plot([4], [0], "o", color=C4, ms=9, zorder=5)
    ax.text(4, 0.2, r"$4$", ha="center", va="bottom", fontsize=19, color=C4)
    ax.set_xlim(-4.8, 6.8)
    ax.set_ylim(-0.6, 0.7)
    ax.axis("off")
    save(fig, "order-line")


def fig_order_letters():
    """Read order from positions without knowing numerical values."""
    points = [(0, "e"), (1.2, "f"), (3.0, "a"), (4.0, "c"), (5.6, "d"), (7.0, "g")]
    assert all(a[0] < b[0] for a, b in zip(points, points[1:]))
    assert "<".join(letter for _, letter in points) == "e<f<a<c<d<g"
    fig, ax = plt.subplots(figsize=(7, 1.15))
    number_line(ax, -0.7, 7.7)
    for x, letter in points:
        ax.plot(x, 0, "o", color=C1, ms=7, zorder=5)
        ax.text(x, 0.16, f"${letter}$", ha="center", va="bottom", fontsize=22, color=INK)
    ax.set_xlim(-0.85, 7.85)
    ax.set_ylim(-0.25, 0.65)
    ax.axis("off")
    save(fig, "order-letters")


def fig_intervals():
    """All interval/ray end types, paired with explicit membership conditions."""
    rows = [
        (r"$(a,b)=\{x\mid a<x<b\}$", 1, 4, False, False),
        (r"$[a,b]=\{x\mid a\leq x\leq b\}$", 1, 4, True, True),
        (r"$[a,b)=\{x\mid a\leq x<b\}$", 1, 4, True, False),
        (r"$(a,b]=\{x\mid a<x\leq b\}$", 1, 4, False, True),
        (r"$(a,\infty)=\{x\mid x>a\}$", 1, np.inf, False, False),
        (r"$[a,\infty)=\{x\mid x\geq a\}$", 1, np.inf, True, False),
        (r"$(-\infty,b)=\{x\mid x<b\}$", -np.inf, 4, False, False),
        (r"$(-\infty,b]=\{x\mid x\leq b\}$", -np.inf, 4, False, True),
        (r"$\mathbb{R}=(-\infty,\infty)=\{x\mid x\in\mathbb{R}\}$", -np.inf, np.inf, False, False),
    ]
    _interval_type_figure(rows, "intervals")
    _interval_type_figure(rows[:4], "interval-types")
    _interval_type_figure(rows[4:8], "ray-types")


def _interval_type_figure(rows, filename):
    fig, axes = plt.subplots(len(rows), 2, figsize=(9, len(rows) * .84), gridspec_kw={"width_ratios": [1.2, 1]})
    for (label_ax, ax), (lab, a, b, ac, bc) in zip(axes, rows):
        label_ax.text(1, .5, lab, ha="right", va="center", fontsize=16, color=INK)
        label_ax.axis("off")
        color = C1
        ax.plot([-.5, 5.5], [0, 0], color=GREY, lw=1, zorder=1)
        left, right = max(a, -0.4), min(b, 5.4)
        ax.plot([left, right], [0, 0], color=color, lw=4, solid_capstyle="butt", zorder=3)
        for endpoint, closed, name, direction in [(a, ac, "a", -1), (b, bc, "b", 1)]:
            if np.isfinite(endpoint):
                dot(ax, endpoint, 0, closed, color)
                ax.text(endpoint, -.15, f"${name}$", ha="center", va="top", fontsize=16)
            else:
                edge = -.5 if direction < 0 else 5.5
                ax.annotate("", xy=(edge, 0), xytext=(edge-direction*.45, 0),
                            arrowprops=dict(arrowstyle="-|>", color=color, lw=2.5,
                                            shrinkA=0, shrinkB=0, mutation_scale=13), zorder=4)
        ax.set_xlim(-.65, 5.65)
        ax.set_ylim(-.5, .4)
        ax.axis("off")
        assert a < b
        assert np.isfinite(a) or not ac
        assert np.isfinite(b) or not bc
    fig.subplots_adjust(left=.025, right=.99, top=.99, bottom=.02, hspace=.35, wspace=.04)
    save(fig, filename)


def fig_set_drawing_basics():
    """Label only marked points; the grey backdrop has no ticks or set arrows."""
    cases = [
        ("set-empty", r"$\emptyset=\{\}$", [], False, False),
        ("set-point", r"$\{2\}$", [2], True, False),
        ("set-three-points", "", [-2, 1, 4], True, False),
        ("set-real-line", r"$\mathbb{R}$", [], False, True),
        ("set-missing-point", r"$\mathbb{R}\setminus\{2\}=\{x\in\mathbb{R}\mid x\ne2\}$", [2], False, True),
        ("set-three-holes", "", [-1, 2, 4], False, True),
        ("set-holes-only", "", [-1, 2, 4], False, False),
    ]
    for name, formula, points, closed, whole_line in cases:
        fig, ax = plt.subplots(figsize=(7.5, 1.45))
        ax.plot([-3, 5], [0, 0], color=GREY, lw=1, zorder=1)
        if whole_line:
            ax.annotate("", xy=(5,0), xytext=(-3,0),
                        arrowprops=dict(arrowstyle="<->", color=C1, lw=3.5, shrinkA=0, shrinkB=0), zorder=3)
        for x in points:
            dot(ax, x, 0, closed, C1)
            ax.text(x, -.17, f"${x}$", ha="center", va="top", color=INK, fontsize=13)
        ax.text(1,.38,formula,ha="center",va="center",fontsize=17,color=INK)
        ax.set_xlim(-3.2,5.2)
        ax.set_ylim(-.52,.65)
        ax.axis("off")
        save(fig,name)


def fig_redundant_set_marks():
    """Compare equal sets with and without redundant circle marks."""
    for name, whole_line in [("set-empty-comparison", False), ("set-real-comparison", True)]:
        fig, axes = plt.subplots(2, 1, figsize=(7.5, 2.2))
        for row, ax in enumerate(axes):
            ax.plot([-3, 5], [0, 0], color=GREY, lw=1, zorder=1)
            if whole_line:
                ax.annotate("", xy=(5, 0), xytext=(-3, 0),
                            arrowprops=dict(arrowstyle="<->", color=C1, lw=3.5,
                                            shrinkA=0, shrinkB=0), zorder=3)
            if row == 0:
                for x in [-1, 2, 4]:
                    dot(ax, x, 0, whole_line, C1)
                    ax.text(x, -.17, f"${x}$", ha="center", va="top", color=INK, fontsize=13)
            ax.set_xlim(-3.2, 5.2)
            ax.set_ylim(-.55, .3)
            ax.axis("off")
        fig.subplots_adjust(hspace=.3)
        save(fig, name)


def fig_fill_holes_union():
    """The two input sets share one scale; the result is revealed in the notes."""
    points = [-1, 2, 4]
    fig, axes = plt.subplots(2, 1, figsize=(7.5, 2.5))
    for row, ax in enumerate(axes):
        ax.plot([-3, 5], [0, 0], color=GREY, lw=1, zorder=1)
        if row == 0:
            ax.annotate("", xy=(5, 0), xytext=(-3, 0),
                        arrowprops=dict(arrowstyle="<->", color=C1, lw=3.5,
                                        shrinkA=0, shrinkB=0), zorder=3)
        for x in points:
            dot(ax, x, 0, row == 1, C1)
            ax.text(x, -.17, f"${x}$", ha="center", va="top", color=INK, fontsize=13)
        ax.text(-3.45, 0, "$A$" if row == 0 else "$B$", ha="center", va="center", color=INK, fontsize=17)
        ax.set_xlim(-3.8, 5.2)
        ax.set_ylim(-.55, .3)
        ax.axis("off")
    fig.subplots_adjust(hspace=.4)
    save(fig, "set-fill-holes-union")


def fig_interval_middle_point():
    """A filled interior point is redundant; an empty interior point removes it."""
    labels = [r"$[0,4]=\{x\mid 0\leq x\leq4\}$",
              r"$[0,4]=\{x\mid 0\leq x\leq4\}$",
              r"$[0,2)\cup(2,4]=\{x\mid 0\leq x\leq4,\ x\ne2\}$"]
    fig, axes = plt.subplots(3, 2, figsize=(9, 2.8), gridspec_kw={"width_ratios": [1.5, 1]})
    for i, ((label_ax, ax), label) in enumerate(zip(axes, labels)):
        label_ax.text(1, .5, label, ha="right", va="center", fontsize=15, color=INK)
        label_ax.axis("off")
        ax.plot([-.6, 4.6], [0, 0], color=GREY, lw=1, zorder=1)
        ax.plot([0, 4], [0, 0], color=C1, lw=4, zorder=4)
        dot(ax, 0, 0, True, C1)
        dot(ax, 4, 0, True, C1)
        if i:
            dot(ax, 2, 0, i == 1, C1)
        for x in [0, 2, 4]:
            ax.text(x, -.2, f"${x}$", ha="center", va="top", fontsize=16)
        ax.set_xlim(-.7, 4.7)
        ax.set_ylim(-.55, .4)
        ax.axis("off")
    assert all((0 <= x <= 4) == ((0 <= x <= 4) or x == 2) for x in [-1, 0, .5, 2, 3.5, 4, 5])
    assert all(((0 <= x < 2) or (2 < x <= 4)) == (0 <= x <= 4 and x != 2) for x in [-1, 0, .5, 2, 3.5, 4, 5])
    fig.subplots_adjust(left=.025, right=.99, top=.99, bottom=.02, hspace=.35, wspace=.04)
    save(fig, "interval-middle-point")


# ---------------------------------------------------------------- §3 absolute value
def fig_distance():
    a, r = 3.0, 1.5
    left, right, lo, hi = a - r, a + r, -0.3, 6.3
    assert r > 0 and left < a < right
    samples = np.array([left - 1, left, a, right, right + 1])
    assert np.array_equal(np.abs(samples - a) < r, (samples > left) & (samples < right))
    assert np.array_equal(np.abs(samples - a) > r, (samples < left) | (samples > right))
    assert np.array_equal(np.abs(samples - a) == r, (samples == left) | (samples == right))
    for relation, name in [("<", "distance-less"), (">", "distance-greater"), ("=", "distance-equal")]:
        fig, ax = plt.subplots(figsize=(5.2, 1.55))
        ax.annotate("", xy=(hi, 0), xytext=(lo, 0),
                    arrowprops=dict(arrowstyle="-|>", color=GREY, lw=1))
        if relation == ">":
            for start, end in ((left, lo), (right, hi)):
                ax.annotate("", xy=(end, 0), xytext=(start, 0),
                            arrowprops=dict(arrowstyle="-|>", color=C1, lw=3, mutation_scale=14), zorder=3)
        elif relation == "<":
            ax.plot([left, right], [0, 0], color=C1, lw=4, solid_capstyle="butt", zorder=3)
        for x in (left, right):
            dot(ax, x, 0, relation == "=", C1)
        for x, label in ((left, "$a-r$"), (a, "$a$"), (right, "$a+r$")):
            ax.text(x, -0.16, label, ha="center", va="top", fontsize=13)
        for end in (left, right):
            ax.annotate("", xy=(end, 0.25), xytext=(a, 0.25),
                        arrowprops=dict(arrowstyle="<->", color=INK, lw=1))
            ax.text((a + end) / 2, 0.3, "$r$", ha="center", va="bottom", fontsize=12)
        ax.text(a, 0.63, f"$|x-a|{relation}r$", fontsize=17, color=C1, ha="center", va="center")
        ax.set_xlim(-0.5, 6.5)
        ax.set_ylim(-0.5, 0.85)
        ax.axis("off")
        fig.subplots_adjust(left=.02, right=.98, top=.98, bottom=.04)
        save(fig, name)


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


def fig_reflections():
    """The same point and its mirror image; equal scales in all three pictures."""
    point = np.array([3., 1.])
    cases = [
        ("x", np.array([3., -1.]), np.array([1., 0.])),
        ("y", np.array([-3., 1.]), np.array([0., 1.])),
        ("diagonal", np.array([1., 3.]), np.array([1., 1.]) / np.sqrt(2)),
    ]
    for name, reflected, tangent in cases:
        fig, ax = plt.subplots(figsize=(3.4, 3.4))
        ax.set_aspect("equal")
        ax.set_xlim(-4.2, 4.2); ax.set_ylim(-4.2, 4.2)
        ax.axis("off")
        for end in ((4., 0.), (0., 4.)):
            start = tuple(-np.array(end))
            ax.annotate("", xy=end, xytext=start,
                        arrowprops=dict(arrowstyle="->", color=GREY, lw=1.2), zorder=1)
        ax.text(3.95, -.4, "$x$", color=C3 if name == "x" else INK, ha="right", fontsize=15)
        ax.text(.22, 3.85, "$y$", color=C3 if name == "y" else INK, fontsize=15)
        extent = 5.4 if name == "diagonal" else 3.9
        ax.plot([-extent*tangent[0], extent*tangent[0]],
                [-extent*tangent[1], extent*tangent[1]], color=C3, lw=2.5, zorder=2)
        if name == "diagonal":
            ax.text(-3.65, -2.8, "$y=x$", color=C3, rotation=45, fontsize=14)
        foot = (point + reflected) / 2
        normal = (point - foot) / np.linalg.norm(point - foot)
        ax.plot([point[0], reflected[0]], [point[1], reflected[1]],
                color="#64748b", lw=1.3, ls=(0, (3, 3)), zorder=3)
        # Matching marks on the two equal halves, plus a right angle at the mirror.
        for endpoint in (point, reflected):
            middle = (foot + endpoint) / 2
            ax.plot([middle[0]-.12*tangent[0], middle[0]+.12*tangent[0]],
                    [middle[1]-.12*tangent[1], middle[1]+.12*tangent[1]], color="#64748b", lw=1.4)
        corner = np.array([foot-.23*tangent, foot-.23*tangent+.23*normal, foot+.23*normal])
        ax.plot(corner[:, 0], corner[:, 1], color="#64748b", lw=1)
        ax.plot(*point, "o", ms=7, color=C1, zorder=5)
        ax.plot(*reflected, "o", ms=7, color=C2, zorder=5)
        ax.annotate("$A(3,1)$", point, xytext=(-5, -20) if name == "diagonal" else (-5, 11), textcoords="offset points",
                    ha="right", color=C1, fontsize=13)
        label = {"x": "$A'(3,-1)$", "y": "$A'(-3,1)$", "diagonal": "$A'(1,3)$"}[name]
        offset, align = ((-5, -20), "right") if name == "x" else ((-5, 11), "left") if name == "y" else ((8, 10), "left")
        ax.annotate(label, reflected, xytext=offset, textcoords="offset points", ha=align, color=C2, fontsize=13)
        fig.tight_layout(pad=.25)
        save(fig, "reflection-" + name)


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


def fig_radians():
    """The angle theta at the centre and the arc it cuts on the unit circle are both
    labelled theta: in radians they are equal (the radius is 1)."""
    fig, ax = plt.subplots(figsize=(5, 5))
    t = np.linspace(0, 2 * np.pi, 600)
    th = 1.0
    axes_through_origin(ax, (-1.45, 1.45), (-1.45, 1.45), grid=False)
    ax.plot(np.cos(t), np.sin(t), color=GREY, lw=1.4)
    arc = np.linspace(0, th, 200)
    assert abs(th * 1.0 - th) < 1e-12        # caption: on a circle of radius 1 the arc has length theta
    ax.plot(np.cos(arc), np.sin(arc), color=C2, lw=4.5)
    ax.text(1.1 * np.cos(th / 2), 1.1 * np.sin(th / 2), r"$\theta$", color=C2, fontsize=18,
            ha="left", va="center")
    ax.plot([0, 1], [0, 0], color=C1, lw=2.4)
    ax.plot([0, np.cos(th)], [0, np.sin(th)], color=INK, lw=1.2)
    ax.text(0.5, -0.06, "$1$", color=C1, fontsize=15, ha="center", va="top")
    wedge = np.linspace(0, th, 60)
    ax.plot(0.24 * np.cos(wedge), 0.24 * np.sin(wedge), color=C2, lw=2)
    ax.text(0.36 * np.cos(th / 2), 0.36 * np.sin(th / 2), r"$\theta$", color=C2, fontsize=16,
            ha="center", va="center")                              # the angle has the same name as the arc
    ax.plot([1], [0], "o", color=INK, ms=5, zorder=6)
    ax.text(1.04, -0.06, "$(1,0)$", fontsize=11, va="top")
    ax.set_xticks([]); ax.set_yticks([]); ax.set_aspect("equal")
    save(fig, "radians")


# ---------------------------------------------------------------- §9: why each property of sin/cos holds
VIOLET = "#7c3aed"


def circle_base(ax, lim=1.62):
    axes_through_origin(ax, (-lim, lim), (-lim, lim), grid=False)
    t = np.linspace(0, 2 * np.pi, 600)
    ax.plot(np.cos(t), np.sin(t), color=GREY, lw=1.3)
    ax.set_xticks([]); ax.set_yticks([]); ax.set_aspect("equal")


def walk(ax, a0, a1, color, r=1.0, lw=3.6, head=True):
    """An arc of the circle of radius r from angle a0 to a1, with an arrow head at a1."""
    t = np.linspace(a0, a1, 200)
    ax.plot(r * np.cos(t), r * np.sin(t), color=color, lw=lw, solid_capstyle="round", zorder=3)
    if head:
        d = np.sign(a1 - a0) * 0.06
        ax.annotate("", xy=(r * np.cos(a1), r * np.sin(a1)), xytext=(r * np.cos(a1 - d), r * np.sin(a1 - d)),
                    arrowprops=dict(arrowstyle="-|>", color=color, lw=lw * 0.6, mutation_scale=14), zorder=4)


def pt(ax, x, y, color, label=None, dx=0.06, dy=0.06, ha="left", va="bottom", fs=13):
    ax.plot([x], [y], "o", color=color, ms=7.5, zorder=6)
    if label:
        ax.text(x + dx, y + dy, label, color=INK, fontsize=fs, ha=ha, va=va, zorder=7,
                bbox=dict(fc="white", ec="none", pad=0.6, alpha=0.85))


def start_point(ax):
    ax.plot([1], [0], "o", color=INK, ms=4.5, zorder=6)


def fig_trig_props():
    th = 0.6
    c, s_ = np.cos(th), np.sin(th)
    P = r"$(\cos\theta,\ \sin\theta)$"

    # (a) one more full turn returns to the same point
    fig, ax = plt.subplots(figsize=(4, 4)); circle_base(ax); start_point(ax)
    walk(ax, 0, th, C2)
    walk(ax, th, th + 2 * np.pi - 0.12, VIOLET, r=1.2, lw=2.2)
    ax.text(-1.32 * np.cos(np.pi / 4), -1.32 * np.sin(np.pi / 4), r"$+2\pi$", color=VIOLET, fontsize=15, ha="right", va="top")
    ax.text(1.06 * np.cos(th / 2), 1.06 * np.sin(th / 2) - 0.02, r"$\theta$", color=C2, fontsize=15, ha="left", va="center")
    assert abs(np.cos(th + 2 * np.pi) - c) < 1e-12 and abs(np.sin(th + 2 * np.pi) - s_) < 1e-12
    pt(ax, c, s_, C1, P, dx=-0.1, dy=0.0, ha="right", va="center")
    save(fig, "trig-period")

    # (b) the circle lies in the square [-1,1] x [-1,1]
    fig, ax = plt.subplots(figsize=(4, 4)); circle_base(ax)
    ax.plot([-1, 1, 1, -1, -1], [-1, -1, 1, 1, -1], color=C4, ls="--", lw=1.4)
    for v, lab in ((1, "$1$"), (-1, "$-1$")):
        ax.text(v + (0.06 if v > 0 else -0.06), -0.08, lab, fontsize=13, ha="left" if v > 0 else "right", va="top")
        ax.text(-0.08, v + (0.05 if v > 0 else -0.05), lab, fontsize=13, ha="right", va="bottom" if v > 0 else "top")
    t = 2.3
    ax.plot([np.cos(t), np.cos(t)], [0, np.sin(t)], color=C1, ls="--", lw=1.4)
    ax.plot([0, np.cos(t)], [np.sin(t), np.sin(t)], color=C3, ls="--", lw=1.4)
    pt(ax, np.cos(t), np.sin(t), C1)
    assert all(abs(np.cos(u)) <= 1 and abs(np.sin(u)) <= 1 for u in np.linspace(0, 7, 300))
    save(fig, "trig-bounded")

    # (c) the right triangle with legs cos, sin and hypotenuse 1
    t = 0.8
    ct, st = np.cos(t), np.sin(t)
    fig, ax = plt.subplots(figsize=(4, 4)); circle_base(ax)
    ax.fill([0, ct, ct], [0, 0, st], color=C1, alpha=0.1)
    ax.plot([0, ct, ct, 0], [0, 0, st, 0], color=C1, lw=1.8)
    q = 0.08
    ax.plot([ct - q, ct - q, ct], [0, q, q], color=INK, lw=1)
    ax.text(ct / 2, -0.06, r"$\cos\theta$", fontsize=14, ha="center", va="top")
    ax.text(ct + 0.06, st / 2, r"$\sin\theta$", fontsize=14, ha="left", va="center")
    ax.text(ct / 2 - 0.08, st / 2 + 0.06, "$1$", fontsize=15, ha="right", va="bottom")
    pt(ax, ct, st, C1)
    assert abs(ct ** 2 + st ** 2 - 1) < 1e-12
    save(fig, "trig-pythagoras")

    # (d) -theta: the same walk clockwise, the mirror image in the x-axis
    fig, ax = plt.subplots(figsize=(4, 4)); circle_base(ax); start_point(ax)
    walk(ax, 0, th, C2); walk(ax, 0, -th, C3)
    ax.text(1.07 * np.cos(th / 2), 1.07 * np.sin(th / 2), r"$\theta$", color=C2, fontsize=15, ha="left", va="center")
    ax.text(1.07 * np.cos(th / 2), -1.07 * np.sin(th / 2), r"$-\theta$", color=C3, fontsize=15, ha="left", va="center")
    ax.plot([c, c], [s_, -s_], color=GREY, ls="--", lw=1.2)
    pt(ax, c, s_, C1, P, dx=-0.05, dy=0.1, ha="center")
    pt(ax, c, -s_, C3, r"$(\cos\theta,\ -\sin\theta)$", dx=-0.05, dy=-0.1, ha="center", va="top")
    assert abs(np.cos(-th) - c) < 1e-12 and abs(np.sin(-th) + s_) < 1e-12
    save(fig, "trig-even")

    # (e) half a turn more: the opposite point
    fig, ax = plt.subplots(figsize=(4, 4)); circle_base(ax); start_point(ax)
    walk(ax, 0, th, C2); walk(ax, th, th + np.pi, VIOLET, r=1.0, lw=2.6)
    ax.text(1.07 * np.cos(th / 2), 1.07 * np.sin(th / 2), r"$\theta$", color=C2, fontsize=15, ha="left", va="center")
    m = th + np.pi / 2
    ax.text(1.12 * np.cos(m), 1.12 * np.sin(m), r"$+\pi$", color=VIOLET, fontsize=15, ha="right", va="bottom")
    ax.plot([c, -c], [s_, -s_], color=GREY, ls="--", lw=1.2)
    pt(ax, c, s_, C1, P, dx=0.0, dy=0.1, ha="left")
    pt(ax, -c, -s_, VIOLET, r"$(-\cos\theta,\ -\sin\theta)$", dx=0.0, dy=-0.12, ha="center", va="top")
    assert abs(np.cos(th + np.pi) + c) < 1e-12 and abs(np.sin(th + np.pi) + s_) < 1e-12
    save(fig, "trig-half-turn")

    # (f) pi - theta: walk half a turn, then theta back; the mirror image in the y-axis
    fig, ax = plt.subplots(figsize=(4, 4)); circle_base(ax); start_point(ax)
    walk(ax, 0, th, C2); walk(ax, np.pi, np.pi - th, C3)
    ax.plot([-1], [0], "o", color=INK, ms=4.5, zorder=6)
    ax.text(1.07 * np.cos(th / 2), 1.07 * np.sin(th / 2), r"$\theta$", color=C2, fontsize=15, ha="left", va="center")
    ax.text(-1.07 * np.cos(th / 2), 1.07 * np.sin(th / 2), r"$\theta$", color=C3, fontsize=15, ha="right", va="center")
    ax.plot([c, -c], [s_, s_], color=GREY, ls="--", lw=1.2)
    pt(ax, c, s_, C1, P, dx=0.02, dy=0.12, ha="center")
    pt(ax, -c, s_, C3, r"$(-\cos\theta,\ \sin\theta)$", dx=-0.02, dy=0.12, ha="center")
    assert abs(np.cos(np.pi - th) + c) < 1e-12 and abs(np.sin(np.pi - th) - s_) < 1e-12
    save(fig, "trig-reflect-y")

    # (g) pi/2 - theta: theta back from the top point; the mirror image in the line y = x
    t = 0.5
    ct, st = np.cos(t), np.sin(t)
    fig, ax = plt.subplots(figsize=(4.4, 4.4)); circle_base(ax); start_point(ax)
    ax.plot([-1.45, 1.45], [-1.45, 1.45], color=GREY, lw=1.1)
    ax.text(1.45, 1.38, "$y=x$", color=GREY, fontsize=13, ha="left", va="top")
    ax.plot([0], [1], "o", color=INK, ms=4.5, zorder=6)
    walk(ax, 0, t, C2); walk(ax, np.pi / 2, np.pi / 2 - t, C3)
    ax.text(0.8 * np.cos(t / 2), 0.8 * np.sin(t / 2), r"$\theta$", color=C2, fontsize=15, ha="center", va="center")
    ax.text(0.8 * np.sin(t / 2), 0.8 * np.cos(t / 2), r"$\theta$", color=C3, fontsize=15, ha="center", va="center")
    ax.plot([ct, st], [st, ct], color=GREY, ls="--", lw=1.2)
    pt(ax, ct, st, C1, P, dx=0.1, dy=0.0, ha="left", va="center")
    pt(ax, st, ct, C3, r"$(\sin\theta,\ \cos\theta)$", dx=0.06, dy=0.1, ha="left", va="bottom")
    assert abs(np.cos(np.pi / 2 - t) - st) < 1e-12 and abs(np.sin(np.pi / 2 - t) - ct) < 1e-12
    save(fig, "trig-complement")


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
                      (lambda x: 3 ** x, r"$3^x$", C3),
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


def fig_onto():
    """Onto, as a horizontal-line test: x^2 misses y = -2; x^3 meets y = -4 and y = 4."""
    fig, axs = plt.subplots(1, 2, figsize=(8.4, 3.8))
    x = np.linspace(-2.4, 2.4, 400)
    ax = axs[0]
    axes_through_origin(ax, (-2.6, 2.6), (-3, 6))
    ax.plot(x, x ** 2, color=C1, lw=2.2)
    ax.axhline(-2, color=C4, ls="--", lw=1.4)
    ax.text(1.35, -1.7, "$y=-2$", color=C4, fontsize=13)
    assert (x ** 2 > -2).all()            # caption: the line y = -2 misses the graph
    ax.set_title(r"$x^2$")
    ax = axs[1]
    axes_through_origin(ax, (-2.6, 2.6), (-9, 9))
    ax.plot(x, x ** 3, color=C1, lw=2.2)
    for h in (-4, 4):
        ax.axhline(h, color=C3, ls="--", lw=1.4)
        xr = np.cbrt(float(h))
        assert x.min() <= xr <= x.max()    # caption: every horizontal line meets x^3
        ax.plot([xr], [h], "o", color=C3, ms=7, zorder=6)
    ax.set_title(r"$x^3$")
    ax.set_yticks([-8, -4, 4, 8])
    fig.tight_layout()
    save(fig, "onto-test")


# ---------------------------------------------------------------- §13 logarithms
def fig_exp_ln():
    fig, ax = plt.subplots(figsize=(5.2, 5.2))
    axes_through_origin(ax, (-3, 5), (-3, 5))
    x = np.linspace(-3, np.log2(5), 300)
    ax.plot(x, 2 ** x, color=C1, lw=2.2, label=r"$2^x$")
    x = np.linspace(0.11, 5, 300)
    ax.plot(x, np.log2(x), color=C2, lw=2.2, label=r"$\log_2 x$")
    x = np.linspace(-3, 5, 10)
    ax.plot(x, x, color=GREY, ls="--", lw=1.2, label="$y=x$")
    ax.plot([0, 1], [1, 0], "o", color=INK, ms=5, zorder=6)
    ax.text(0.12, 1.1, "$(0,1)$", fontsize=11)
    ax.text(1.05, -0.35, "$(1,0)$", fontsize=11)
    ax.set_aspect("equal")
    ax.legend(loc="lower right", fontsize=12, framealpha=1)
    save(fig, "exp-log")


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
    """One figure per part, with the piecewise endpoints labelled explicitly."""
    panels = [plt.subplots(figsize=(4.8, 3.4)) for _ in range(4)]
    axs = [ax for _, ax in panels]
    # Continue beyond the plotting window: highlighted sample points are not endpoints.
    x = np.linspace(-3.3, 3.3, 401)

    ax = axs[0]
    axes_through_origin(ax, (-3.2, 3.2), (-6, 8))
    ax.plot(x, 3 * x + 1, color=C1, lw=2.2)
    for xp in (-1, 0, 2):
        ax.plot([xp], [3 * xp + 1], "o", color=C2, ms=6, zorder=6)

    ax = axs[1]
    axes_through_origin(ax, (-3.2, 3.2), (-1, 9.5))
    ax.plot(x, x ** 2, color=C1, lw=2.2)
    for xp in (-3, -2, -1, 0, 1, 2, 3):
        ax.plot([xp], [xp ** 2], "o", color=C2, ms=6, zorder=6)

    ax = axs[2]
    axes_through_origin(ax, (-3.2, 3.2), (-1, 3.5))
    ax.plot(x, np.abs(x), color=C1, lw=2.2)
    for xp in (-2, 0, 2):
        ax.plot([xp], [abs(xp)], "o", color=C2, ms=6, zorder=6)

    ax = axs[3]
    axes_through_origin(ax, (-3.2, 3.2), (-2.5, 9.5))
    xl = np.linspace(-3.3, 0, 200)
    xr = np.linspace(0, 3.3, 200)
    ax.plot(xl, xl + 1, color=C1, lw=2.2)
    ax.plot(xr, xr ** 2, color=C1, lw=2.2)
    dot(ax, 0, 1, False, C1)
    dot(ax, 0, 0, True, C1)
    ax.annotate(r"$(0,1)$", (0, 1), xytext=(10, 8), textcoords="offset points",
                color=C1, ha="left", va="bottom")
    ax.annotate(r"$(0,0)$", (0, 0), xytext=(10, -12), textcoords="offset points",
                color=C1, ha="left", va="top")
    for (fig, ax), name in zip(panels, ("linear", "square", "absolute", "piecewise")):
        ax.xaxis.set_major_locator(MaxNLocator(integer=True, nbins=6))
        ax.yaxis.set_major_locator(MaxNLocator(integer=True, nbins=6))
        ax.annotate("$x$", (1, 0), xycoords=ax.get_yaxis_transform(), xytext=(5, -3),
                    textcoords="offset points", ha="left", va="top", annotation_clip=False)
        ax.annotate("$y$", (0, 1), xycoords=ax.get_xaxis_transform(), xytext=(6, 2),
                    textcoords="offset points", ha="left", va="bottom", annotation_clip=False)
        fig.tight_layout()
        save(fig, f"function-example-{name}")


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


# ---------------------------------------------------------------- §9: a periodic function x - floor(x)
def fig_frac_part():
    fig, ax = plt.subplots(figsize=(7.5, 2.8))
    axes_through_origin(ax, (-2.3, 3.3), (-0.4, 1.4))
    for k in range(-2, 3):
        x = np.linspace(k, k + 1, 50)
        ax.plot(x, x - k, color=C1, lw=2.2)
        dot(ax, k, 0, True, C1)
        dot(ax, k + 1, 1, False, C1)
    ax.set_yticks([1], [""])
    ax.text(0.1, 1.12, "$1$", ha="left", va="bottom", fontsize=13)
    ax.set_xticks([-2, -1, 1, 2, 3])
    save(fig, "frac-part")


# ---------------------------------------------------------------- §10: 2^x through its rational points
def fig_exp_rational_points():
    from fractions import Fraction
    fig, ax = plt.subplots(figsize=(6, 4))
    axes_through_origin(ax, (-2.2, 2.2), (-0.3, 4.6))
    pts = sorted({Fraction(p, q) for q in (1, 2, 3, 4, 6, 8) for p in range(-2 * q, 2 * q + 1)})
    xs = np.array([float(t) for t in pts])
    xx = np.linspace(-2, 2, 400)
    ax.plot(xx, 2 ** xx, color=GREY, lw=1.4, ls="--")
    ax.plot(xs, 2 ** xs, "o", color=C2, ms=3.5, zorder=6)
    ax.set_xticks([-2, -1, 1, 2])
    ax.set_yticks([1, 2, 3, 4])
    save(fig, "exp-rational-points")


# ---------------------------------------------------------------- helpers for the lecture-1 additions
IMGDIR = Path(__file__).resolve().parent / "images"


def curly_brace(ax, x0, x1, y, height, down=False, color=INK, lw=1.6):
    """A horizontal curly brace from x0 to x1 at height y, tip in the middle."""
    n = 401
    xs = np.linspace(x0, x1, n)
    half = n // 2
    beta = 40.0 / (x1 - x0)
    xh = xs[:half + 1]
    yh = 1 / (1 + np.exp(-beta * (xh - xh[0]))) + 1 / (1 + np.exp(-beta * (xh - xh[-1])))
    ys = np.concatenate([yh, yh[-2::-1]])
    ys = (ys - ys.min()) / (ys.max() - ys.min())
    sign = -1 if down else 1
    ax.plot(xs, y + sign * height * ys, color=color, lw=lw, solid_capstyle="round")
    return y + sign * height


# ---------------------------------------------------------------- §1: measuring a length
def fig_triangle_1m():
    fig, ax = plt.subplots(figsize=(3.4, 3.0))
    ax.plot([0, 2, 0, 0], [0, 0, 2, 0], color=INK, lw=2)
    ax.plot([0, 0.22, 0.22], [0.22, 0.22, 0], color=INK, lw=1)
    ax.text(-0.12, 1.0, "$1$", ha="right", va="center", fontsize=15)
    ax.text(1.0, -0.12, "$1$", ha="center", va="top", fontsize=15)
    ax.text(1.12, 1.12, "$c$", ha="left", va="bottom", fontsize=16, color=C1)
    ax.set_xlim(-0.5, 2.4); ax.set_ylim(-0.5, 2.3)
    ax.set_aspect("equal"); ax.axis("off")
    save(fig, "triangle-1m")


def fig_circle_r1():
    fig, ax = plt.subplots(figsize=(3.4, 3.4))
    axes_through_origin(ax, (-1.5, 1.5), (-1.5, 1.5), grid=False)
    t = np.linspace(0, 2 * np.pi, 400)
    ax.plot(np.cos(t), np.sin(t), color=INK, lw=2)
    ax.plot([0, np.cos(np.pi / 4)], [0, np.sin(np.pi / 4)], color=C4, lw=2.2)
    ax.text(0.22, 0.42, "$1$", color=C4, fontsize=15)
    ax.set_xticks([]); ax.set_yticks([])
    ax.set_aspect("equal")
    save(fig, "circle-r1")


# ---------------------------------------------------------------- §2: sets as boxes
def fig_coin_sets():
    img = plt.imread(IMGDIR / "sheqel.png")
    fig, ax = plt.subplots(figsize=(9, 1.3))
    r = 0.42

    def coin(x):
        ax.imshow(img, extent=(x - r, x + r, -r, r), zorder=3)

    def brace_text(x, ch):
        ax.text(x, 0, ch, ha="center", va="center", fontsize=40, color=INK)

    brace_text(0, r"$\{$"); coin(0.85); brace_text(1.7, r"$\}$")
    ax.text(2.35, 0, "$=$", ha="center", va="center", fontsize=24)
    x = 3.0
    brace_text(x, r"$\{$")
    for k in range(10):
        cx = x + 0.85 + k * 1.05
        coin(cx)
        if k < 9:
            ax.text(cx + 0.52, -0.32, ",", ha="center", va="center", fontsize=20)
    brace_text(x + 0.85 + 9 * 1.05 + 0.85, r"$\}$")
    ax.set_xlim(-0.6, x + 0.85 + 9 * 1.05 + 1.5)
    ax.set_ylim(-0.75, 0.75)
    ax.set_aspect("equal"); ax.axis("off")
    save(fig, "coin-sets")


def fig_subset_venn():
    from matplotlib.patches import Ellipse, Circle
    fig, ax = plt.subplots(figsize=(4.2, 2.8))
    ax.add_patch(Ellipse((0, 0), 4.2, 2.7, fill=False, lw=2, ec=INK))
    ax.add_patch(Circle((-0.85, -0.05), 0.48, fc=C1, alpha=0.15, ec="none"))
    ax.add_patch(Circle((-0.85, -0.05), 0.48, fill=False, lw=2, ec=C1))
    ax.text(-0.85, -0.05, "$A$", ha="center", va="center", fontsize=15, color=C1)
    ax.text(0.35, 0.92, "$B$", ha="center", va="center", fontsize=15)
    ax.plot([0.9], [-0.1], "o", color=C4, ms=6)
    ax.text(1.0, -0.2, "$b$", color=C4, fontsize=15, va="top")
    ax.set_xlim(-2.3, 2.3); ax.set_ylim(-1.5, 1.5)
    ax.set_aspect("equal"); ax.axis("off")
    save(fig, "subset-venn")


def fig_union_boxes():
    from matplotlib.patches import Circle
    fig, ax = plt.subplots(figsize=(6.0, 4.0))

    def box(x0, x1, y0, y1):
        ax.plot([x0, x0, x1, x1], [y1, y0, y0, y1], color=INK, lw=2.4)

    def item(x, y, lab):
        ax.add_patch(Circle((x, y), 0.3, fc=C1, alpha=0.12, ec="none", zorder=2))
        ax.add_patch(Circle((x, y), 0.3, fill=False, ec=C1, lw=1.6, zorder=3))
        ax.text(x, y, f"${lab}$", ha="center", va="center", fontsize=14, zorder=4)

    box(0, 2.6, 2.0, 3.2); ax.text(1.3, 3.55, "$A$", ha="center", fontsize=16)
    for x, lab in ((0.5, 1), (1.3, 2), (2.1, 3)):
        item(x, 2.4, lab)
    box(3.6, 6.2, 2.0, 3.2); ax.text(4.9, 3.55, "$B$", ha="center", fontsize=16)
    for x, lab in ((4.1, 1), (4.9, 3), (5.7, 5)):
        item(x, 2.4, lab)
    for (xa, ya), (xb, yb), rad in (((1.6, 1.85), (2.5, 1.1), 0.3), ((4.6, 1.85), (3.7, 1.1), -0.3)):
        ax.annotate("", xy=(xb, yb), xytext=(xa, ya),
                    arrowprops=dict(arrowstyle="-|>", color=GREY, lw=2.2,
                                    connectionstyle=f"arc3,rad={rad}"))
    box(1.3, 4.9, -0.4, 1.0)
    for x, lab in ((1.9, 1), (2.7, 2), (3.5, 3), (4.3, 5)):
        item(x, 0.0, lab)
    ax.text(3.1, -0.85, r"$A\cup B$", ha="center", fontsize=16)
    ax.set_xlim(-0.3, 6.5); ax.set_ylim(-1.2, 3.9)
    ax.set_aspect("equal"); ax.axis("off")
    save(fig, "union-boxes")


def fig_intersection_venn():
    from matplotlib.patches import Circle
    fig, ax = plt.subplots(figsize=(4.6, 3.0))
    r = 1.3
    ca, cb = (0.0, 0.0), (1.6, 0.0)
    # shade the overlap by clipping one disc to the other
    a = Circle(ca, r, transform=ax.transData)
    shade = Circle(cb, r, fc=C1, alpha=0.2, ec="none")
    ax.add_patch(shade); shade.set_clip_path(a)
    ax.add_patch(Circle(ca, r, fill=False, lw=2, ec=INK))
    ax.add_patch(Circle(cb, r, fill=False, lw=2, ec=INK))
    ax.text(-0.95, 1.2, "$A$", fontsize=16, ha="center")
    ax.text(2.55, 1.2, "$B$", fontsize=16, ha="center")
    for (x, y), lab in (((-0.55, 0), 1), ((0.8, 0.35), 3), ((0.8, -0.35), 5), ((2.15, 0), 2)):
        ax.text(x, y, f"${lab}$", ha="center", va="center", fontsize=15)
    ax.set_xlim(-1.6, 3.2); ax.set_ylim(-1.5, 1.6)
    ax.set_aspect("equal"); ax.axis("off")
    save(fig, "intersection-venn")


# ---------------------------------------------------------------- §2: open and closed rays
def fig_rays():
    fig, ax = plt.subplots(figsize=(7.5, 2.4))
    for y in (0, -1.3):
        ax.plot([-1, 7], [y, y], color=GREY, lw=1, zorder=1)
    ax.plot([3, 6.9], [0, 0], color=C1, lw=5, solid_capstyle="butt", zorder=3)
    ax.annotate("", xy=(7.05, 0), xytext=(6.6, 0),
                arrowprops=dict(arrowstyle="-|>", color=C1, lw=3))
    dot(ax, 3, 0, False, C1)
    ax.text(3, -0.22, "$3$", ha="center", va="top", fontsize=13)
    ax.text(-1.4, 0, r"$(3,\infty)$", ha="right", va="center", fontsize=15, color=C1)
    ax.plot([-1.0, 3], [-1.3, -1.3], color=C1, lw=5, solid_capstyle="butt", zorder=3)
    ax.annotate("", xy=(-1.0, -1.3), xytext=(-.5, -1.3),
                arrowprops=dict(arrowstyle="-|>", color=C1, lw=3, shrinkB=0), zorder=4)
    dot(ax, 3, -1.3, True, C1)
    ax.text(3, -1.52, "$15$", ha="center", va="top", fontsize=13)
    ax.text(-1.4, -1.3, r"$(-\infty,15]$", ha="right", va="center", fontsize=15, color=C1)
    ax.set_xlim(-3.6, 7.3); ax.set_ylim(-1.95, 0.5)
    ax.axis("off")
    save(fig, "rays")


# ---------------------------------------------------------------- §3: triangle inequality
def fig_triangle_inequality():
    fig, ax = plt.subplots(figsize=(7.5, 2.8))
    a, b = 6.0, -2.5
    apb = a + b
    ax.plot([-.4, a + .4], [0, 0], color=INK, lw=1.4)
    for x, top in ((0, 1.05), (a, 1.05), (apb, .5)):
        ax.plot([x, x], [0, top], color=GREY, lw=1, linestyle=":", zorder=1)
    for start, end, y, label in ((0, a, 1.05, "a"), (a, apb, .5, "b")):
        ax.annotate("", xy=(end, y), xytext=(start, y),
                    arrowprops=dict(arrowstyle="-|>", color=C2, lw=2.8,
                                    shrinkA=0, shrinkB=0, mutation_scale=15), zorder=3)
        ax.text((start + end) / 2, y + .12, f"${label}$",
                ha="center", va="bottom", fontsize=16, color=C2)
    for x, lab in ((0, "0"), (apb, "a+b"), (a, "a")):
        ax.plot([x, x], [-0.1, 0.1], color=INK, lw=1.4)
        ax.text(x, -0.18, f"${lab}$", ha="center", va="top", fontsize=14)
    low = curly_brace(ax, 0, apb, -.6, .25, down=True, color=C3)
    ax.text(apb / 2, low - .08, "$|a+b|$", ha="center", va="top", fontsize=14, color=C3)
    assert np.isclose(apb - a, b)  # The second step starts at a and adds b.
    assert b < 0 < apb < a and abs(apb) < abs(a) + abs(b)
    ax.set_xlim(-.6, a + .6); ax.set_ylim(-1.3, 1.55)
    ax.axis("off")
    save(fig, "triangle-inequality")


# ---------------------------------------------------------------- §3: solutions of the inequality examples
def fig_ineq_solutions():
    fig, axs = plt.subplots(2, 1, figsize=(7.0, 2.4))
    for ax in axs:
        ax.set_xlim(-4.8, 4.8); ax.set_ylim(-0.6, 0.4); ax.axis("off")
    ax = axs[0]
    number_line(ax, -4.6, 4.6)
    ax.plot([-2, 4.4], [0, 0], color=C1, lw=5, solid_capstyle="butt", zorder=3)
    dot(ax, -2, 0, False, C1)
    for x, lab in ((-2, "-2"), (0, "0")):
        ax.text(x, -0.15, f"${lab}$", ha="center", va="top", fontsize=13)
    ax.plot([0, 0], [-0.06, 0.06], color=INK, lw=1)
    ax = axs[1]
    number_line(ax, -4.6, 4.6)
    ax.plot([-4.4, 0], [0, 0], color=C1, lw=5, solid_capstyle="butt", zorder=3)
    ax.plot([1.5, 4.4], [0, 0], color=C1, lw=5, solid_capstyle="butt", zorder=3)
    dot(ax, 0, 0, False, C1); dot(ax, 1.5, 0, False, C1)
    ax.text(0, -0.15, "$0$", ha="center", va="top", fontsize=13)
    ax.text(1.5, -0.15, r"$\frac{1}{2}$", ha="center", va="top", fontsize=14)
    fig.tight_layout()
    save(fig, "ineq-solutions")


# ---------------------------------------------------------------- §2: drawing a half-open interval
def fig_half_open():
    fig, ax = plt.subplots(figsize=(7.0, 1.9))
    ax.plot([-3, 5], [0, 0], color=GREY, lw=1, zorder=1)
    ax.plot([-1, 3], [0, 0], color=C1, lw=5, solid_capstyle="butt", zorder=3)
    dot(ax, -1, 0, True, C1)
    dot(ax, 3, 0, False, C1)
    for x, lab in ((-1, "-1"), (3, "3")):
        ax.text(x, -0.2, f"${lab}$", ha="center", va="top", fontsize=13)
    ax.text(-1, 0.28, r"$-1\in[-1,3)$", ha="center", va="bottom", fontsize=13, color=INK)
    ax.text(3, 0.28, r"$3\notin[-1,3)$", ha="center", va="bottom", fontsize=13, color=INK)
    ax.set_xlim(-3.2, 5.2); ax.set_ylim(-0.65, 0.75)
    ax.axis("off")
    save(fig, "half-open-interval")


# ------------------------------------- §6: print stand-in for the transformations lab
def fig_transformations_lab():
    """y = x^2 (dashed) and y = 2(x-1)^2 - 3: vertex (0,0) -> (c, d) = (1, -3)."""
    fig, ax = plt.subplots(figsize=(6.0, 4.4))
    axes_through_origin(ax, (-4.5, 4.5), (-4.2, 6.5))
    x = np.linspace(-4.5, 4.5, 600)
    ax.plot(x, x**2, color=GREY, lw=2, ls=(0, (6, 5)))
    y = 2 * (x - 1) ** 2 - 3
    ax.plot(x[y < 7], y[y < 7], color=C1, lw=2.6)
    ax.plot(0, 0, "o", ms=8, mfc="white", mec=C2, mew=2, zorder=5)
    ax.plot(1, -3, "o", ms=8, color=C2, zorder=5)
    ax.annotate("", xy=(0.93, -2.85), xytext=(0.05, -0.15),
                arrowprops=dict(arrowstyle="->", color=C2, lw=1.4))
    ax.text(-3.9, 5.6, r"$y=x^2$", color=GREY, fontsize=14)
    ax.text(-4.3, 1.3, r"$y=2(x-1)^2-3$", color=C1, fontsize=14)
    ax.text(1.2, -3.35, r"$(1,-3)$", color=C2, fontsize=13, va="top")
    assert abs(2 * (1 - 1) ** 2 - 3 - (-3)) < 1e-12   # the vertex moved to (c, d) = (1, -3)
    save(fig, "transformations-lab")


# ------------------------------------------- §11: the inverse swaps the roles of the axes
def fig_inverse_swap():
    """Read right to left (as the Hebrew caption does):
    (1) y = x^2, x >= 0, read from x to y: f(2) = 4;
    (2) the same curve with the axes swapped (y horizontal, x vertical): from 4 back to 2;
    (3) renamed: y = sqrt(x), the mirror image of x^2 in y = x; (2,4) <-> (4,2)."""
    fig, axs = plt.subplots(1, 3, figsize=(12.6, 4.5))
    lim = (-0.6, 5.3)
    t = np.linspace(0, np.sqrt(5.1), 300)
    a, fa = 2.0, 4.0
    assert a ** 2 == fa and np.sqrt(fa) == a          # f(2) = 4 and f^{-1}(4) = 2
    assert np.allclose(np.sqrt(t ** 2), t)            # the swapped curve (t^2, t) is y = sqrt(x)
    LIGHT = "#a5b4fc"

    def frame(ax, hname, vname):
        axes_through_origin(ax, lim, lim)
        ax.set_aspect("equal")
        ax.set_xticks([1, 2, 3, 4, 5])
        ax.set_yticks([1, 2, 3, 4, 5])
        ax.text(lim[1] - 0.05, 0.3, f"${hname}$", fontsize=17, ha="right", va="bottom")
        ax.text(0.22, lim[1] - 0.05, f"${vname}$", fontsize=17, ha="left", va="top")

    def guides(ax, foot, p, side, color):
        # foot (on the horizontal axis) -> p -> side (on the vertical axis), with arrowheads
        for s, e in ((foot, p), (p, side)):
            ax.annotate("", xy=e, xytext=s, arrowprops=dict(arrowstyle="-|>", color=INK, lw=1.3,
                        ls=(0, (4, 3)), shrinkA=0, shrinkB=6, mutation_scale=13))
        ax.plot(*p, "o", color=color, ms=8, zorder=6, mec="white", mew=1.2)

    # (1) rightmost: the graph of f
    ax = axs[2]
    frame(ax, "x", "y")
    ax.plot(t, t ** 2, color=C1, lw=2.6)
    guides(ax, (a, 0), (a, fa), (0, fa), C1)
    ax.text(a + 0.18, fa - 0.1, "$(2,4)$", color=C1, fontsize=14, va="top")
    ax.set_title(r"$y=f(x)=x^2$", fontsize=15)
    # (2) middle: the axes swap roles
    ax = axs[1]
    frame(ax, "y", "x")
    ax.plot(t ** 2, t, color=C2, lw=2.6)
    guides(ax, (fa, 0), (fa, a), (0, a), C2)
    ax.text(fa + 0.05, a + 0.3, "$(4,2)$", color=C2, fontsize=14, ha="center")
    ax.set_title(r"$x=f^{-1}(y)$", fontsize=15)
    # (3) leftmost: rename the axes; the mirror image in y = x
    ax = axs[0]
    frame(ax, "x", "y")
    d = np.linspace(lim[0], lim[1], 10)
    ax.plot(d, d, color=GREY, ls="--", lw=1.3)
    ax.plot(t, t ** 2, color=LIGHT, lw=2.2, ls=(0, (6, 4)))
    ax.plot(t ** 2, t, color=C2, lw=2.6)
    ax.plot([a, fa], [fa, a], ls=":", color=INK, lw=1.3)
    ax.plot([a], [fa], "o", color=LIGHT, ms=7, zorder=6, mec="white", mew=1.2)
    ax.plot([fa], [a], "o", color=C2, ms=8, zorder=6, mec="white", mew=1.2)
    ax.text(fa + 0.05, a + 0.3, "$(4,2)$", color=C2, fontsize=14, ha="center")
    ax.text(a - 0.2, fa + 0.05, "$(2,4)$", color="#6366f1", fontsize=14, ha="right")
    ax.text(4.55, 4.95, "$y=x$", color=GREY, fontsize=13, ha="right")
    ax.set_title(r"$y=f^{-1}(x)=\sqrt{x}$", fontsize=15)
    fig.tight_layout(w_pad=4.2)
    # arrows between the panels, pointing left (the reading order of the caption)
    for right, left in ((axs[2], axs[1]), (axs[1], axs[0])):
        r, l = right.get_position(), left.get_position()
        y = (r.y0 + r.y1) / 2
        fig.add_artist(matplotlib.patches.FancyArrowPatch((r.x0 - 0.008, y), (l.x1 + 0.012, y), transform=fig.transFigure,
                       arrowstyle="-|>", mutation_scale=22, lw=2.2, color=INK))
    save(fig, "inverse-swap-axes")


# ------------------------------------------- §9: print stand-in for the unit-circle walk
def fig_unit_circle_walk():
    """Circle with the point at theta = 2pi/3, and sin traced on [0, theta] beside it."""
    t0 = 2 * np.pi / 3
    fig, (a1, a2) = plt.subplots(1, 2, figsize=(9.6, 3.4), width_ratios=[1, 2.2])
    a1.set_aspect("equal")
    axes_through_origin(a1, (-1.35, 1.35), (-1.35, 1.35), grid=False)
    s = np.linspace(0, 2 * np.pi, 400)
    a1.plot(np.cos(s), np.sin(s), color=GREY, lw=1.6)
    w = np.linspace(0, t0, 200)
    a1.plot(np.cos(w), np.sin(w), color=C2, lw=4.5, solid_capstyle="round")
    px, py = np.cos(t0), np.sin(t0)
    a1.plot([0, px], [0, 0], color=C3, lw=3.5)
    a1.plot([px, px], [0, py], color=C4, lw=3.5)
    a1.plot(px, py, "o", color=C1, ms=9, zorder=5)
    a1.text(px / 2, -0.17, r"$\cos\theta$", color=C3, ha="center", va="top", fontsize=13)
    a1.text(px - 0.08, py / 2, r"$\sin\theta$", color=C4, ha="right", va="center", fontsize=13)
    a1.text(0.62, 0.95, r"$\theta$", color=C2, fontsize=15)
    a1.set_xticks([]); a1.set_yticks([])
    axes_through_origin(a2, (0, 4 * np.pi + 0.3), (-1.3, 1.3), grid=False)
    u = np.linspace(0, 4 * np.pi, 800)
    a2.plot(u, np.sin(u), color="#fecdd3", lw=1.5, ls=(0, (4, 4)))
    v = np.linspace(0, t0, 300)
    a2.plot(v, np.sin(v), color=C4, lw=3)
    a2.plot(t0, np.sin(t0), "o", color=C4, ms=8, zorder=5)
    a2.set_xticks([np.pi, 2 * np.pi, 3 * np.pi, 4 * np.pi])
    a2.set_xticklabels([r"$\pi$", r"$2\pi$", r"$3\pi$", r"$4\pi$"])
    a2.set_yticks([-1, 1])
    a2.text(t0 + 0.25, np.sin(t0) + 0.12, r"$(\theta,\ \sin\theta)$", color=C4, fontsize=13)
    assert abs(np.sin(t0) - np.sqrt(3) / 2) < 1e-12
    fig.tight_layout()
    save(fig, "unit-circle-walk")

FIGURES = [
    fig_real_line, fig_intervals, fig_set_drawing_basics, fig_redundant_set_marks, fig_fill_holes_union, fig_interval_middle_point, fig_distance, fig_square, fig_not_functions,
    fig_reflections, fig_even_odd, fig_sqrt_family, fig_polynomials, fig_unit_circle, fig_radians, fig_trig_props, fig_sin_cos,
    fig_tan, fig_exponentials, fig_horizontal_line, fig_onto, fig_exp_ln, fig_powers_roots,
    fig_rational, fig_sgn_floor, fig_inverse_trig,
    fig_sqrt2, fig_function_examples, fig_plane_point, fig_parabola_points,
    fig_frac_part, fig_exp_rational_points,
    fig_triangle_1m, fig_circle_r1, fig_coin_sets, fig_subset_venn, fig_union_boxes,
    fig_intersection_venn, fig_rays, fig_triangle_inequality, fig_ineq_solutions,
    fig_half_open, fig_transformations_lab, fig_unit_circle_walk,
    fig_order_line, fig_order_letters, fig_inverse_swap,
]

if __name__ == "__main__":
    for f in FIGURES:
        f()
