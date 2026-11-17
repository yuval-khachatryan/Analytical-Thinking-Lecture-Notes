"""Small paired-strip figures for the definition of a limit.

Run from Notes: ../.venv/bin/python tools/draw-epsilon-strips.py
Use --preview to also save PNG previews under Notes/tmp/.
"""
from pathlib import Path
import sys
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.patches import Patch
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
BLUE, ORANGE, RED, GREY = '#2563a6', '#be6208', '#b4233d', '#64748b'
plt.rcParams.update({'font.size': 10, 'mathtext.fontset': 'cm', 'svg.fonttype': 'path'})


def save(fig, name):
    fig.savefig(ROOT / 'figures' / (name + '.svg'), bbox_inches='tight', facecolor='white')
    if '--preview' in sys.argv:
        fig.savefig(ROOT / 'tmp' / (name + '.png'), dpi=150, bbox_inches='tight', facecolor='white')
    plt.close(fig)


def paired_strips(L, wide, wide_label, name):
    narrow = .5
    n = np.arange(1, 13)
    values = (-1.) ** n
    fig, ax = plt.subplots(figsize=(6.2, 3.2))
    ax.axhspan(L-wide, L+wide, color=BLUE, alpha=.10)
    ax.axhspan(L-narrow, L+narrow, color=ORANGE, alpha=.18)
    for delta, color in [(wide, BLUE), (narrow, ORANGE)]:
        for edge in [L-delta, L+delta]:
            ax.axhline(edge, color=color, lw=1, ls=(0, (4, 3)))
    ax.axhline(L, color=GREY, lw=.8)
    inside = np.abs(values-L) < narrow
    ax.scatter(n[inside], values[inside], s=30, color=BLUE, zorder=4)
    ax.scatter(n[~inside], values[~inside], s=30, color=RED, zorder=4)
    ax.text(12.7, 1, r'$\cdots$', color=BLUE if abs(1-L)<narrow else RED, va='center')
    ax.text(12.7, -1, r'$\cdots$', color=BLUE if abs(-1-L)<narrow else RED, va='center')
    ax.set_xlim(.5, 13.3)
    ax.set_ylim(min(L-wide, -1)-.35, max(L+wide, 1)+.35)
    ax.set_xticks(n)
    ticks = sorted(set([-1, 1, L]))
    ax.set_yticks(ticks, [rf'$L={v}$' if v==L else rf'${v}$' for v in ticks])
    ax.set_xlabel('$n$', loc='right', labelpad=0)
    ax.set_ylabel('$a_n$', rotation=0, labelpad=12)
    ax.spines[['top','right']].set_visible(False)
    ax.set_title(rf'$a_n=(-1)^n,\qquad L={L}$', pad=33)
    ax.legend(handles=[Patch(facecolor=BLUE, alpha=.25, label=wide_label),
                       Patch(facecolor=ORANGE, alpha=.35, label=r'$\varepsilon=\frac{1}{2}$')],
              loc='lower center', bbox_to_anchor=(.5,1.01), ncol=2, frameon=False,
              borderaxespad=0, handlelength=1.3)
    fig.tight_layout()
    save(fig,name)


paired_strips(1,2.5,r'$\varepsilon=\frac{5}{2}$','ch02-alternating-strips-one')
paired_strips(-1,2.5,r'$\varepsilon=\frac{5}{2}$','ch02-alternating-strips-minus-one')
paired_strips(0,1.5,r'$\varepsilon=\frac{3}{2}$','ch02-alternating-strips-zero')
paired_strips(0,.75,r'$\varepsilon_0=\frac{3}{4}$','ch02-narrower-strips')

fig, ax = plt.subplots(figsize=(5.8,2.8))
for center, color, label in [(2,BLUE,'a'),(6,ORANGE,'b')]:
    ax.axhspan(center-1,center+1,color=color,alpha=.12)
    for edge in [center-1,center+1]:
        ax.axhline(edge,color=color,ls='--',lw=1)
    ax.axhline(center,color=color,lw=.7)
    ax.text(.5,center,rf'${label}={center},\quad\varepsilon=1$',ha='center',va='center',
            bbox={'facecolor':'white','edgecolor':'none','alpha':.9,'pad':3})
ax.annotate('',(.84,3),(.84,5),arrowprops={'arrowstyle':'<->','color':GREY})
ax.text(.81,4,r'$3<5$',ha='right',va='center',color=GREY)
ax.set(xlim=(0,1),ylim=(.5,7.5))
ax.set_xticks([])
ax.set_yticks([1,2,3,5,6,7])
ax.spines[['top','right','bottom']].set_visible(False)
ax.set_title(r'$a=2,\quad b=6,\quad\varepsilon=\frac{6-2}{4}=1$',pad=12)
fig.tight_layout()
save(fig,'ch02-separated-strips')
print('Created five paired-strip figures.')

# The same terms pass the same condition; only their indices shift.
fig, ax = plt.subplots(figsize=(7,2.5))
for y in [1.1,.1]:
    ax.plot([5.6,8.6],[y,y],color=BLUE,lw=28,alpha=.10,solid_capstyle='round')
for i in range(1,9):
    color = BLUE if i>=6 else GREY
    ax.text(i,1.1,rf'$a_{{{i}}}$',ha='center',va='center',color=color,fontsize=14)
    if i>=4:
        ax.text(i,.1,rf'$b_{{{i-3}}}$',ha='center',va='center',color=color,fontsize=14)
        ax.annotate('',(i,.33),(i,.87),arrowprops={'arrowstyle':'<->','color':color,'lw':1})
ax.text(8.6,1.1,r'$\cdots$',va='center',color=BLUE)
ax.text(8.6,.1,r'$\cdots$',va='center',color=BLUE)
ax.text(6,1.45,r'$N_a=6$',ha='center',color=BLUE)
ax.text(6,-.3,r'$N_b=3$',ha='center',color=BLUE)
ax.set(xlim=(.5,9),ylim=(-.6,1.75))
ax.set_title(r'$b_n=a_{n+3},\qquad N_b=N_a-3$',pad=3)
ax.axis('off');fig.tight_layout()
save(fig,'ch02-tail-cutoff-shift')
