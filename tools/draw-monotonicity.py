"""Separate sequence plots for the introductory monotonicity examples.

Run from Notes: MPLCONFIGDIR=tmp/mpl-cache ../.venv/bin/python tools/draw-monotonicity.py
"""
from pathlib import Path
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
BLUE = '#2563a6'
plt.rcParams.update({'font.size': 11, 'mathtext.fontset': 'cm', 'svg.fonttype': 'path'})
n = np.arange(1, 9)
cases = [
    ('reciprocal', 1/n, r'$a_n=\frac{1}{n}$', 'a_n', [0, .5, 1],
     ['$0$', r'$\frac{1}{2}$', '$1$'], (-.08, 1.13)),
    ('one-minus-reciprocal', 1-1/n, r'$b_n=1-\frac{1}{n}$', 'b_n', [0, .5, 1],
     ['$0$', r'$\frac{1}{2}$', '$1$'], (-.08, 1.13)),
    ('repeated-pairs', (n+1)//2, r'$c_{2k-1}=c_{2k}=k$', 'c_n', [1, 2, 3, 4],
     ['$1$', '$2$', '$3$', '$4$'], (.7, 4.4)),
    ('constant', np.full(8, 4), r'$d_n=4$', 'd_n', [3, 4, 5],
     ['$3$', '$4$', '$5$'], (2.7, 5.3)),
]


def draw(ax, case):
    _, values, title, term, ticks, ticklabels, ylim = case
    ax.scatter(n, values, color=BLUE, s=34, zorder=3)
    ax.set(xlim=(.5, 8.8), ylim=ylim, xticks=n)
    ax.set_yticks(ticks, ticklabels)
    ax.set_xlabel('$n$', loc='right', labelpad=0)
    ax.set_ylabel(f'${term}$', rotation=0, labelpad=12)
    ax.set_title(title, pad=10)
    ax.spines[['top', 'right']].set_visible(False)
    ax.grid(axis='y', color='#e2e8f0', linewidth=.7)


for case in cases:
    fig, ax = plt.subplots(figsize=(5, 2.3))
    draw(ax, case)
    fig.tight_layout()
    fig.savefig(ROOT/'figures'/f'ch02-monotone-{case[0]}.svg', bbox_inches='tight', facecolor='white')
    plt.close(fig)

fig, axes = plt.subplots(2, 2, figsize=(10, 4.6))
for ax, case in zip(axes.flat, cases):
    draw(ax, case)
fig.tight_layout()
fig.savefig(ROOT/'tmp/ch02-monotonicity-preview.png', dpi=140, bbox_inches='tight', facecolor='white')
plt.close(fig)
