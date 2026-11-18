"""Draw the base case and the general induction step as adjacent dominoes.

Run from Notes: MPLCONFIGDIR=tmp/mpl-cache ../.venv/bin/python tools/draw-induction.py
"""
from pathlib import Path
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.patches import Rectangle, FancyArrowPatch
from matplotlib.transforms import Affine2D

ROOT = Path(__file__).resolve().parents[1]
plt.rcParams.update({'font.size': 15, 'mathtext.fontset': 'cm', 'svg.fonttype': 'path'})
fig, axes = plt.subplots(1, 2, figsize=(8, 2.35))

for ax, labels, heading in zip(
        axes, [('$1$', '$2$', '$3$'), ('$n$', '$n+1$', '$n+2$')],
        ('$n=1$', r'$n\longrightarrow n+1$')):
    ax.set(xlim=(-.5, 4.25), ylim=(-.55, 2.3), aspect='equal')
    ax.axis('off')
    ax.plot([-.25, 3.4], [0, 0], color='#cbd5e1', linewidth=1)
    for i, label in enumerate(labels):
        x = i * 1.12
        transform = Affine2D().rotate_deg_around(x+.25, 0, -37 if i == 0 else 0) + ax.transData
        colour = '#be6208' if i == 0 else '#2563a6'
        ax.add_patch(Rectangle((x, 0), .25, 1.75, transform=transform,
                               facecolor=colour, edgecolor=colour, linewidth=1.5))
        ax.plot([x+.04, x+.21], [.875, .875], color='white', linewidth=1.5, transform=transform)
        ax.plot([x+.125, x+.125], [.4, 1.3], 'o', color='white', markersize=3, transform=transform)
        ax.text(x+.125, -.26, label, ha='center', va='top')
    ax.add_patch(FancyArrowPatch((-.15, 1.8), (.85, 1.7), connectionstyle='arc3,rad=-.35',
                                arrowstyle='->', mutation_scale=16, color='#be6208', linewidth=1.8))
    ax.text(3.65, .8, r'$\cdots$', ha='center', va='center', color='#64748b', fontsize=24)
    ax.set_title(heading, pad=8)

fig.tight_layout(w_pad=2)
fig.savefig(ROOT / 'figures/ch02-induction-domino.svg', bbox_inches='tight', facecolor='white')
fig.savefig(ROOT / 'tmp/ch02-induction-domino.png', dpi=160, bbox_inches='tight', facecolor='white')
plt.close(fig)
