"""Figures for monotone limits and infinite limits; run from Notes with the project venv."""
from pathlib import Path
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import numpy as np
ROOT=Path(__file__).resolve().parents[1]
plt.rcParams.update({'font.size':11,'mathtext.fontset':'cm','svg.fonttype':'path'})
BLUE='#2563a6';ORANGE='#a45a13';GRAY='#94a3b8';RED='#b91c1c'
LABEL={'facecolor':'white','edgecolor':'none','pad':2}

def base(ax):
    ax.spines[['top','right']].set_visible(False)
    ax.set_xlabel('$n$',loc='right',labelpad=0)
    ax.set_ylabel('$a_n$',rotation=0,labelpad=13)

def extrema(ax,increasing):
    n=np.arange(1,11);y=np.array([.3,.7,1.05,1.38,1.62,1.73,1.81,1.87,1.91,1.94])
    if not increasing:y=4-y
    base(ax);ax.set(xlim=(.5,12.7),ylim=(.1,2.72) if increasing else (1.28,3.9))
    ax.axhspan(1.5,2.5,color='#dbeafe',alpha=.5)
    ax.axhline(2,color=ORANGE,linewidth=1.5)
    for level in [1.5,2.5]:ax.axhline(level,color=BLUE,linestyle='--',linewidth=.8)
    ax.scatter(n[:4],y[:4],color=GRAY,s=28,zorder=3);ax.scatter(n[4:],y[4:],color=BLUE,s=34,zorder=3)
    ax.axvline(5,color=GRAY,linestyle=':',linewidth=1)
    ax.set_xticks([1,5,6],[r'$1$',r'$N$',r'$N+1$'])
    symbol='S' if increasing else 'I'
    ax.set_yticks([1.5,2,2.5],[f'${symbol}-\\varepsilon$',f'${symbol}$',f'${symbol}+\\varepsilon$'])
    ax.annotate('$a_N$',(5,y[4]),xytext=(0,-21 if increasing else 14),textcoords='offset points',ha='center',color=BLUE)
    ax.text(10.7,2,f'${symbol}='+('\\sup' if increasing else '\\inf')+r'\,a_n$',va='center',color=ORANGE,bbox=LABEL)
    ax.set_title(r'$\lim_{n\to\infty}a_n='+symbol+'$',pad=10)

def infinite(ax,positive):
    n=np.arange(1,11);y=np.array([.7,1.8,1.2,3.1,4.4,5.3,4.7,6.6,7.2,6.8])
    if not positive:y=-y
    M=4 if positive else -4
    base(ax);ax.set(xlim=(.5,11.8),ylim=(0,8.4) if positive else (-8.4,0))
    ax.axhspan(M,8.4 if positive else -8.4,color='#dbeafe',alpha=.55)
    ax.axhline(M,color=ORANGE,linestyle='--',linewidth=1.3)
    ax.axvline(5,color=GRAY,linestyle=':',linewidth=1)
    ax.scatter(n[:4],y[:4],color=GRAY,s=28,zorder=3);ax.scatter(n[4:],y[4:],color=BLUE,s=34,zorder=3)
    ax.set_xticks([1,5,6],[r'$1$',r'$N$',r'$N+1$']);ax.set_yticks([M],['$M$'])
    ax.annotate('$a_N$',(5,y[4]),xytext=(-10,15 if positive else -20),textcoords='offset points',ha='center',color=BLUE)
    ax.text(7,7.8 if positive else -7.8,r'$n\geq N\;\Longrightarrow\;a_n'+('>M$' if positive else '<M$'),ha='center')
    ax.set_title(r'$a_n\to'+('\\infty$' if positive else '-\\infty$'),pad=10)

def concrete_extremum(ax,increasing):
    n=np.arange(1,13);y=1-1/n if increasing else 1+1/n
    base(ax);term='a_n' if increasing else 'b_n';ax.set_ylabel('$'+term+'$',rotation=0,labelpad=13);ax.set(xlim=(.5,17),ylim=(-.18,2.3),xticks=[1,3,5,8,12],yticks=[0,1,2])
    ax.scatter(n,y,s=32,color=BLUE,zorder=3)
    ax.axhline(1,color=ORANGE,linestyle='--',linewidth=1.3)
    other=2 if increasing else 0
    ax.axhline(other,color=GRAY,linestyle=':',linewidth=1.3)
    ax.text(12.8,1,r'$L='+('\\sup' if increasing else '\\inf')+r'\,'+term+'=1$',va='center',color=ORANGE,bbox=LABEL)
    ax.text(12.8,other,'$M=2$' if increasing else '$m=0$',va='center',color='#64748b',bbox=LABEL)
    ax.set_title('$'+term+'=1'+('-' if increasing else '+')+r'\frac{1}{n}$',pad=10)

def root(ax):
    n=np.arange(1,13);base(ax);ax.set(xlim=(.5,14),ylim=(0,4),xticks=[1,4,5,8,12],yticks=[0,1,2,3,4])
    ax.scatter(n,np.sqrt(n),c=[GRAY]*3+[ORANGE]+[BLUE]*8,s=33,zorder=3)
    ax.axhline(2,color=ORANGE,linestyle='--');ax.axvline(5,color=GRAY,linestyle=':')
    ax.text(12.8,2,'$M=2$',va='center',bbox=LABEL,color=ORANGE)
    ax.annotate('$N=5$',(5,np.sqrt(5)),xytext=(12,-32),textcoords='offset points',color=BLUE)
    ax.set_title(r'$a_n=\sqrt{n}\ \longrightarrow\ \infty$',pad=10)

def returns(ax):
    n=np.arange(1,15);y=np.where(n%2==0,n/2,0)
    base(ax);ax.set_ylabel('$b_n$',rotation=0,labelpad=13)
    ax.set(xlim=(.5,16),ylim=(-.5,7.8),xticks=[1,2,4,6,8,10,12,14],yticks=[0,1,3,5,7])
    ax.scatter(n,y,c=[BLUE if x%2==0 else RED for x in n],s=33,zorder=3)
    ax.axhline(1,color=ORANGE,linestyle='--');ax.text(14.5,1,'$M=1$',va='center',bbox=LABEL,color=ORANGE)
    ax.set_title(r'$b_{2k-1}=0,\qquad b_{2k}=k$',pad=10)

cases=[('monotone-supremum',lambda ax:extrema(ax,True)),('monotone-infimum',lambda ax:extrema(ax,False)),
 ('increasing-supremum',lambda ax:concrete_extremum(ax,True)),('decreasing-infimum',lambda ax:concrete_extremum(ax,False)),
 ('infinite-positive-definition',lambda ax:infinite(ax,True)),('infinite-negative-definition',lambda ax:infinite(ax,False)),
 ('root-infinite-threshold',root),('unbounded-returns-zero',returns)]
for name,draw in cases:
    fig,ax=plt.subplots(figsize=(6,2.9));draw(ax);fig.tight_layout()
    fig.savefig(ROOT/'figures'/f'ch02-{name}.svg',bbox_inches='tight',facecolor='white');plt.close(fig)
fig,axes=plt.subplots(4,2,figsize=(12,11.6))
for ax,(_,draw) in zip(axes.flat,cases):draw(ax)
fig.tight_layout();fig.savefig(ROOT/'tmp/extrema-infinity-preview.png',dpi=125,bbox_inches='tight',facecolor='white');plt.close(fig)
