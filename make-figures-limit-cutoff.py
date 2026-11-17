"""Illustrate the strict error band and a sufficient cutoff for a_n=1/n."""
from pathlib import Path
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import numpy as np

BLUE, RED, GREY = '#4f46e5', '#c2410c', '#64748b'
plt.rcParams.update({'font.size': 10, 'mathtext.fontset': 'cm'})
fig, axes = plt.subplots(1, 2, figsize=(8.3, 3.3), gridspec_kw={'width_ratios': [1, 1.15]})
for ax, indices, ylim in [(axes[0], np.arange(1, 13), (-.13, 1.07)),
                          (axes[1], np.arange(7, 19), (-.12, .18))]:
    ax.axhspan(-.1, .1, color=BLUE, alpha=.09)
    ax.axhline(.1, color=GREY, linestyle='--', linewidth=1)
    ax.axhline(-.1, color=GREY, linestyle='--', linewidth=1)
    ax.axhline(0, color=GREY, linewidth=.8)
    inside = indices >= 11
    ax.scatter(indices[~inside], 1/indices[~inside], color=RED, s=24, zorder=4)
    ax.scatter(indices[inside], 1/indices[inside], color=BLUE, s=24, zorder=4)
    ax.set_xticks(indices)
    ax.tick_params(axis='x', labelsize=8)
    ax.set_xlim(indices[0]-.6, indices[-1]+.6)
    ax.set_ylim(ylim)
    ax.set_xlabel('$n$', loc='right')
    ax.spines[['top', 'right']].set_visible(False)
axes[0].set_yticks([-.1, 0, .1, .5, 1], [r'$-\frac{1}{10}$', '$0$', r'$\frac{1}{10}$', r'$\frac{1}{2}$', '$1$'])
axes[0].set_title(r'$a_n=\frac{1}{n}$')
axes[1].set_title(r'$L=0,\quad\varepsilon=\frac{1}{10}$')
axes[1].set_yticks([-.1, 0, .1], [r'$L-\varepsilon=-\frac{1}{10}$', r'$L=0$', r'$L+\varepsilon=\frac{1}{10}$'])
axes[1].axvline(11, color=BLUE, linestyle=':', linewidth=1)
axes[1].annotate(r'$a_{10}=\frac{1}{10}$', xy=(10, .1), xytext=(8.5, .145), ha='center', color=RED,
                 arrowprops={'arrowstyle': '->', 'color': RED, 'linewidth': .8})
axes[1].text(11.2, -.075, r'$N=11$', color=BLUE)
fig.tight_layout(w_pad=1.5)
fig.savefig(Path(__file__).parent / 'figures/ch02-one-over-n-cutoff.png', dpi=180, bbox_inches='tight', facecolor='white')
plt.close(fig)
