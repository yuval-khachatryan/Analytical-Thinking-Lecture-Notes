"""Show a sequence tending to one and its absolute distances tending to zero.

Run from Notes: MPLCONFIGDIR=tmp/mpl-cache ../.venv/bin/python tools/draw-nonmonotone-convergence.py
"""
from pathlib import Path
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
plt.rcParams.update({'font.size': 11, 'mathtext.fontset': 'cm', 'svg.fonttype': 'path'})
n = np.arange(1, 13)
distance = (2 + (-1.)**n) / n
fig, axes = plt.subplots(2, 1, figsize=(6.4, 4.6), sharex=True)
for ax, values, limit, label, title, ticks, ticklabels, colour in [
    (axes[0], 1+distance, 1, '$a_n$',
     r'$a_n=1+\frac{2+(-1)^n}{n}\ \longrightarrow\ 1$', [1, 1.5, 2, 2.5],
     ['$1$', r'$\frac{3}{2}$', '$2$', r'$\frac{5}{2}$'], '#2563a6'),
    (axes[1], distance, 0, '$|a_n-1|$',
     r'$|a_n-1|=\frac{2+(-1)^n}{n}\ \longrightarrow\ 0$', [0, .5, 1, 1.5],
     ['$0$', r'$\frac{1}{2}$', '$1$', r'$\frac{3}{2}$'], '#be6208')
]:
    ax.axhline(limit, color=colour, linewidth=1.1, linestyle='--')
    ax.scatter(n, values, color=colour, s=30, zorder=3)
    ax.set_yticks(ticks, ticklabels)
    ax.set(xlim=(.5, 13.1), ylim=(limit-.13, limit+1.65), xticks=n)
    ax.set_title(title, pad=10)
    ax.set_ylabel(label, rotation=0, labelpad=22)
    ax.spines[['top', 'right']].set_visible(False)
    ax.text(12.8, limit+.035, '$1$' if limit else '$0$', ha='right', va='bottom', color=colour)
axes[1].set_xlabel('$n$', loc='right', labelpad=0)
fig.tight_layout(h_pad=1.4)
fig.savefig(ROOT/'figures/ch02-converges-with-detours.svg', bbox_inches='tight', facecolor='white')
fig.savefig(ROOT/'tmp/ch02-converges-with-detours.png', dpi=150, bbox_inches='tight', facecolor='white')
plt.close(fig)
