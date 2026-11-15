"""Compact illustrations for the sequence-limit reading progression.

Run from Notes with ../.venv/bin/python make-figures-sequence-limits.py.
Hebrew explanations are in the surrounding text; formulas label the plots.
"""
from pathlib import Path
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import numpy as np

OUT = Path(__file__).parent / 'figures'
BLUE, ORANGE, GREY = '#4f46e5', '#ea580c', '#64748b'
plt.rcParams.update({'font.size': 11, 'mathtext.fontset': 'cm'})

def save(fig, name):
    fig.savefig(OUT / name, dpi=180, bbox_inches='tight', facecolor='white')
    plt.close(fig)

def axes(ax, indices, values, title, yticks):
    ax.scatter(indices, values, color=BLUE, s=23, zorder=3)
    ax.set_xticks(indices)
    ax.set_yticks(yticks)
    ax.set_xlim(.5, indices[-1]+.5)
    ax.set_xlabel('$n$', loc='right')
    ax.set_title(title)
    ax.grid(alpha=.13)
    ax.spines[['top', 'right']].set_visible(False)

fig, ax = plt.subplots(figsize=(6, 1.7))
ax.plot([1.87, 2.13], [0, 0], color=GREY, lw=1)
ax.plot([1.9, 2.1], [0, 0], color=BLUE, lw=5, alpha=.3)
ax.scatter([1.9, 2.1], [0, 0], facecolors='white', edgecolors=BLUE, s=55, zorder=4)
ax.scatter([2.03], [0], color=BLUE, s=40, zorder=4)
for x, text in [(1.9, '$1.9$\n$L-\\varepsilon$'), (2, '$2$\n$L$'), (2.1, '$2.1$\n$L+\\varepsilon$')]:
    ax.plot([x,x], [-.025,.025], color=GREY, lw=1)
    ax.text(x,-.055,text,ha='center',va='top')
ax.annotate('$a_n=2.03$', (2.03,0), (2.055,.16), ha='center', arrowprops={'arrowstyle':'-','color':GREY})
ax.annotate('',(2,.1),(2.03,.1),arrowprops={'arrowstyle':'<->','color':ORANGE})
ax.text(2.015,.12,'$0.03$',ha='center',color=ORANGE)
ax.set(xlim=(1.87,2.13),ylim=(-.24,.23));ax.axis('off')
save(fig,'ch02-error-interval.png')

n=np.arange(1,7)
fig, axs=plt.subplots(1,3,figsize=(9,2.7))
for ax, values, title, ticks, bounds in [
    (axs[0],1/n,r'$a_n=1/n$',[0,1],[0,1]),
    (axs[1],(-1.)**n,r'$a_n=(-1)^n$',[-1,0,1],[-1,1]),
    (axs[2],n,r'$a_n=n$',[1,3,6],[1])]:
    axes(ax,n,values,title,ticks)
    for bound in bounds: ax.axhline(bound,color=ORANGE,ls='--',lw=1)
    ax.margins(y=.18)
fig.tight_layout();save(fig,'ch02-bounds-comparison.png')

n=np.arange(1,8)
fig, axs=plt.subplots(1,2,figsize=(7,2.7))
for ax, values, title in [(axs[0],1/n,r'$a_n=1/n$'),(axs[1],1-1/n,r'$a_n=1-1/n$')]:
    axes(ax,n,values,title,[0,.5,1]);ax.set_ylim(-.06,1.12)
fig.tight_layout();save(fig,'ch02-monotone-directions.png')

n=np.arange(1,9)
fig, axs=plt.subplots(1,2,figsize=(7,2.7))
for ax,q in zip(axs,[.5,-.5]):
    axes(ax,n,q**n,r'$a_n=(\frac{'+('1' if q>0 else '-1')+r'}{2})^n$',[-.5,0,.5])
    ax.axhline(0,color=GREY,lw=.8);ax.set_ylim(-.57,.57)
fig.tight_layout();save(fig,'ch02-geometric-zero.png')

# The same late term would have to belong to both disjoint neighborhoods.
fig, ax = plt.subplots(figsize=(7, 1.8))
ax.plot([-1.5, 4.5], [0, 0], color=GREY, lw=1)
for center, label in [(0, r'$L_1$'), (3, r'$L_2$')]:
    ax.plot([center-1, center+1], [0, 0], lw=8, color=BLUE, alpha=.22)
    ax.scatter([center-1, center+1], [0, 0], s=55, facecolors='white', edgecolors=BLUE, zorder=3)
    ax.plot([center, center], [-.08, .08], color=GREY)
    ax.text(center, -.19, label, ha='center', va='top')
    ax.annotate('', (center, .35), (center+1, .35), arrowprops={'arrowstyle':'<->', 'color':GREY})
    ax.text(center+.5, .43, r'$\varepsilon$', ha='center')
ax.annotate('', (1, -.02), (2, -.02), arrowprops={'arrowstyle':'<->', 'color':ORANGE})
ax.set(xlim=(-1.5, 4.5), ylim=(-.55, .7));ax.axis('off')
save(fig, 'ch02-limit-unique.png')

fig, ax = plt.subplots(figsize=(7, 2))
for n in range(1, 9):
    ax.text(n, 1.05, f'$a_{{{n}}}$', ha='center', color=BLUE if n%2==0 else GREY)
    if n%2==0:
        k=n//2
        ax.annotate('', (n, .36), (n, .87), arrowprops={'arrowstyle':'->','color':BLUE})
        ax.text(n, .17, f'$a_{{n_{k}}}=a_{{{n}}}$', ha='center', color=BLUE)
        ax.text(n, -.15, rf'$k={k},\ n_{k}={n}$', ha='center', fontsize=10)
ax.set(xlim=(.5, 8.7), ylim=(-.4, 1.4));ax.axis('off')
save(fig, 'ch02-subsequence-indices.png')

indices=np.arange(1,8)
values=[1.]
for _ in indices[1:]: values.append(np.sqrt(2+values[-1]))
fig,ax=plt.subplots(figsize=(5.5,2.4))
axes(ax,indices,values,r'$a_1=1,\quad a_{n+1}=\sqrt{2+a_n}$',[1,1.5,2])
ax.axhline(2,color=ORANGE,ls='--',lw=1)
ax.set_ylim(.9,2.12)
fig.tight_layout();save(fig,'ch02-recursive-root.png')
