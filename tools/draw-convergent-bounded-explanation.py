"""Two schematic stages: bound the tail, then include the finite prefix."""
from pathlib import Path
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import numpy as np
ROOT=Path(__file__).resolve().parents[1]
plt.rcParams.update({'font.size':11,'mathtext.fontset':'cm','svg.fonttype':'path'})
n=np.arange(1,13)
y=np.array([3.8,.25,2.9,.9,2.3,1.8,2.12,1.93,2.05,1.97,2.02,1.99])

def draw(ax,whole):
    ax.set(xlim=(.5,14),ylim=(-.25,4.3))
    if whole:
        ax.axhspan(0,4,color='#e8f4ea')
        for level in [0,4]:ax.axhline(level,color='#3c8050',linewidth=1.4)
    ax.axhspan(1.5,2.5,color='#dbeafe')
    ax.axhline(2,color='#2563a6',linestyle=':',linewidth=1)
    for level in [1.5,2.5]:ax.axhline(level,color='#2563a6',linestyle='--',linewidth=.9)
    ax.scatter(n[:4],y[:4],color='#64748b',s=40,zorder=3)
    ax.scatter(n[4:],y[4:],color='#2563a6',s=34,zorder=3)
    ax.axvline(5,color='#94a3b8',linestyle=':',linewidth=1)
    ax.set_xticks([1,5],['$1$','$N$'])
    ticks=[1.5,2,2.5];labels=[r'$L-\varepsilon$','$L$',r'$L+\varepsilon$']
    if whole:ticks=[0]+ticks+[4];labels=['$m$']+labels+['$M$']
    ax.set_yticks(ticks,labels)
    ax.set_xlabel('$n$',loc='right',labelpad=0)
    ax.set_ylabel('$a_n$',rotation=0,labelpad=12)
    ax.spines[['top','right']].set_visible(False)
    ax.set_title(r'$m\leq a_n\leq M\quad(n\geq1)$' if whole else r'$L-\varepsilon<a_n<L+\varepsilon\quad(n\geq N)$',pad=12)
    ax.text(12.8,2.13,r'$\cdots$',color='#2563a6')

for whole,name in [(False,'tail'),(True,'all')]:
    fig,ax=plt.subplots(figsize=(6,3));draw(ax,whole);fig.tight_layout()
    fig.savefig(ROOT/'figures'/f'ch02-convergent-bound-{name}.svg',bbox_inches='tight',facecolor='white');plt.close(fig)
fig,axes=plt.subplots(2,1,figsize=(6,6))
for ax,whole in zip(axes,[False,True]):draw(ax,whole)
fig.tight_layout();fig.savefig(ROOT/'tmp/convergent-bounded-explanation.png',dpi=140,bbox_inches='tight',facecolor='white');plt.close(fig)
