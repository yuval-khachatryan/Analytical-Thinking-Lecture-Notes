"""Small, adjacent illustrations for approximation and basic limit families."""
from pathlib import Path
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import numpy as np

OUT = Path(__file__).parent / 'figures'
BLUE, RED, GREY = '#4f46e5', '#c2410c', '#64748b'
plt.rcParams.update({'font.size': 11, 'mathtext.fontset': 'cm'})

fig, axes = plt.subplots(2, 1, figsize=(6.8, 2.5))
outside = [-2.5, -1.6, 1.7, 2.6]
inside = [-.85, -.55, -.2, .15, .4, .7]
for ax in axes:
    ax.axhline(0, color=GREY, linewidth=1)
    ax.scatter(outside, np.zeros(len(outside)), s=27, color=RED, zorder=4)
    ax.set_xlim(-3, 3)
    ax.set_ylim(-.6, .7)
    ax.axis('off')
axes[0].axvspan(-1, 1, color=BLUE, alpha=.1, ymin=.3, ymax=.7)
axes[0].scatter(inside, np.zeros(len(inside)), s=27, color=BLUE, zorder=4)
axes[0].scatter([-1, 1], [0, 0], s=35, facecolor='white', edgecolor=BLUE, zorder=5)
for x, label in [(-1, r'$L-\varepsilon$'), (0, '$L$'), (1, r'$L+\varepsilon$')]:
    axes[0].text(x, -.3, label, ha='center')
axes[1].scatter([0], [0], s=80, color=BLUE, zorder=4)
axes[1].text(0, -.3, '$L$', ha='center')
fig.tight_layout(h_pad=.1)
fig.savefig(OUT / 'ch02-precision-point.png', dpi=180, bbox_inches='tight', facecolor='white')
plt.close(fig)

def sequence_axes(title, limit):
    fig, ax = plt.subplots(figsize=(6.5, 2.65))
    ax.spines[['top', 'right']].set_visible(False)
    ax.axhline(limit, color=GREY, linestyle='--', linewidth=1, label=f'$L={limit}$')
    ax.set_xlabel('$n$', loc='right')
    ax.set_title(title)
    ax.set_xticks(range(1, 21))
    ax.tick_params(axis="x", labelsize=8)
    ax.set_xlim(.5, 20.5)
    return fig, ax

n = np.arange(1, 21)
fig, ax = sequence_axes(r'$\frac{1}{n^p}\longrightarrow0$', 0)
for p, color in [(.5, BLUE), (1, '#0f766e'), (2, RED)]:
    label=r'$p=\frac{1}{2}$' if p==.5 else f'$p={p:g}$'
    ax.scatter(n, 1/n.astype(float)**p, s=16, color=color, label=label)
ax.legend(ncol=4, fontsize=9, loc='upper right')
ax.set_ylim(-.07, 1.15)
ax.set_yticks([0,.5,1], ['$0$', r'$\frac{1}{2}$', '$1$'])
fig.tight_layout()
fig.savefig(OUT / 'ch02-reciprocal-powers.png', dpi=180, bbox_inches='tight', facecolor='white')
plt.close(fig)

fig, ax = sequence_axes(r'$\sqrt[n]{n}\longrightarrow1$', 1)
ax.scatter(n, n**(1/n.astype(float)), s=20, color=BLUE)
ax.set_ylim(.96, 1.5)
ax.set_yticks([1, 1.2, 1.4], ['$1$', r'$\frac{6}{5}$', r'$\frac{7}{5}$'])
fig.tight_layout()
fig.savefig(OUT / 'ch02-root-n.png', dpi=180, bbox_inches='tight', facecolor='white')
plt.close(fig)
