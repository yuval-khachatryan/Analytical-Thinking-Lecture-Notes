"""Schematic figures for both directions of the absolute-value bound."""
from pathlib import Path
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
BLUE, GREEN, GREY = '#2563a6', '#31824f', '#64748b'
plt.rcParams.update({'font.size': 12, 'mathtext.fontset': 'cm', 'svg.fonttype': 'path'})

fig, ax = plt.subplots(figsize=(6, 2.8))
n = np.arange(1, 10)
values = [1.2, -.8, 1.8, -1.5, .6, 2, -2, .9, -.5]
ax.axhspan(-2, 2, color='#e7eef8')
for bound in [-2, 2]:
    ax.axhline(bound, color=BLUE, lw=1.3)
ax.axhline(0, color=GREY, lw=.7)
ax.scatter(n, values, color=BLUE, s=35, zorder=3)
ax.annotate('', xy=(4, -1.5), xytext=(4, 0),
            arrowprops={'arrowstyle': '<->', 'color': GREEN, 'lw': 1.5})
ax.text(4.2, -.75, r'$|a_k|\leq M$', color=GREEN, va='center')
ax.text(9.8, .4, r'$\cdots$', color=BLUE)
ax.set(xlim=(.5, 10.5), ylim=(-2.6, 2.6))
ax.set_xticks([1, 4], ['$1$', '$k$'])
ax.set_yticks([-2, 0, 2], ['$-M$', '$0$', '$M$'])
ax.set_xlabel('$n$', loc='right', labelpad=0)
ax.set_ylabel('$a_n$', rotation=0, labelpad=12)
ax.set_title(r'$|a_n|\leq M\quad\Longleftrightarrow\quad -M\leq a_n\leq M$')
ax.spines[['top', 'right']].set_visible(False)
fig.tight_layout()
fig.savefig(ROOT/'figures/ch02-absolute-bound-strip.svg', bbox_inches='tight', facecolor='white')
fig.savefig(ROOT/'tmp/absolute-bound-strip.png', dpi=140, bbox_inches='tight', facecolor='white')
plt.close(fig)

fig, ax = plt.subplots(figsize=(6, 2.2))
# Choose a schematic interval with |m| > |B|: the original lower bound
# coincides with -M. The labels make that equality explicit.
ax.plot([-3, 3], [.65, .65], color=GREEN, lw=8, solid_capstyle='butt')
ax.plot([-3, 1.7], [0, 0], color=BLUE, lw=8, solid_capstyle='butt')
for x in [-3, 0, 1.7, 3]:
    ax.plot([x, x], [-.16, .85], color=GREY, lw=.7, ls=':')
ax.text(-3, -.3, '$-M=m$', ha='center')
ax.text(0, -.3, '$0$', ha='center')
ax.text(1.7, -.3, '$B$', ha='center')
ax.text(3, -.3, '$M$', ha='center')
ax.text(-.65, .12, r'$[m,B]$', color=BLUE, ha='center')
ax.text(0, .8, r'$[-M,M]$', color=GREEN, ha='center')
ax.set_title(r'$M=\max\{|m|,|B|\}\qquad [m,B]\subseteq[-M,M]$')
ax.set(xlim=(-3.8, 3.8), ylim=(-.65, 1.2))
ax.axis('off')
fig.tight_layout()
fig.savefig(ROOT/'figures/ch02-absolute-bound-enclosure.svg', bbox_inches='tight', facecolor='white')
fig.savefig(ROOT/'tmp/absolute-bound-enclosure.png', dpi=140, bbox_inches='tight', facecolor='white')
plt.close(fig)
