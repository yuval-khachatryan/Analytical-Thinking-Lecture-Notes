"""Plots beside the static limit-calculation examples.

Run from Notes: MPLCONFIGDIR=tmp/mpl-cache ../.venv/bin/python tools/draw-limit-techniques.py
"""
from pathlib import Path
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
plt.rcParams.update({'font.size': 11, 'mathtext.fontset': 'cm', 'svg.fonttype': 'path'})
n = np.arange(1, 13)
cases = [
    ('equal-degree', (2*n*n+3*n)/(5*n*n+1),
     r'$a_n=\frac{2n^2+3n}{5n^2+1}$', 'a_n', 2/5, r'$L=\frac{2}{5}$',
     [2/5, 3/5, 4/5], [r'$\frac{2}{5}$', r'$\frac{3}{5}$', r'$\frac{4}{5}$'], (.34, .91)),
    ('scaled-root', 2/(np.sqrt(1+2/n)+1),
     r'$c_n=n\left(\sqrt{1+\frac{2}{n}}-1\right)$', 'c_n', 1, '$L=1$',
     [3/4, 1], [r'$\frac{3}{4}$', '$1$'], (.69, 1.06)),
]


def draw(ax, case):
    _, values, title, term, limit, label, ticks, ticklabels, ylim = case
    ax.scatter(n, values, color='#2563a6', s=32, zorder=3)
    ax.axhline(limit, color='#9a5b12', linestyle='--', linewidth=1.3)
    ax.text(12.65, limit, label, va='center', color='#9a5b12',
            bbox={'facecolor': 'white', 'edgecolor': 'none', 'pad': 2})
    ax.set(xlim=(.5, 15), ylim=ylim, xticks=[1, 2, 4, 6, 8, 10, 12])
    ax.set_yticks(ticks, ticklabels)
    ax.set_xlabel('$n$', loc='right', labelpad=0)
    ax.set_ylabel(f'${term}$', rotation=0, labelpad=12)
    ax.set_title(title, pad=12)
    ax.spines[['top', 'right']].set_visible(False)
    ax.grid(axis='y', color='#e2e8f0', linewidth=.7)


for case in cases:
    fig, ax = plt.subplots(figsize=(5.4, 2.6))
    draw(ax, case)
    fig.tight_layout()
    fig.savefig(ROOT/'figures'/f'ch02-limit-{case[0]}.svg', bbox_inches='tight', facecolor='white')
    plt.close(fig)

fig, axes = plt.subplots(1, 2, figsize=(10.8, 2.6))
for ax, case in zip(axes, cases):
    draw(ax, case)
fig.tight_layout()
fig.savefig(ROOT/'tmp/ch02-limit-techniques-preview.png', dpi=140, bbox_inches='tight', facecolor='white')
plt.close(fig)
