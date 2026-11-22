"""Vertex illustrations. Run with the repository venv; labels use LTR mathematics."""
from pathlib import Path
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import numpy as np
ROOT=Path(__file__).resolve().parents[1]
plt.rcParams.update({'font.size':12,'mathtext.fontset':'cm'})
def axes(title):
    fig,ax=plt.subplots(figsize=(5.5,3.4))
    ax.axhline(0,color='#94a3b8',lw=.8);ax.axvline(0,color='#94a3b8',lw=.8)
    ax.spines[['top','right']].set_visible(False)
    ax.set_xlabel('$x$',loc='right');ax.set_ylabel('$y$',rotation=0)
    ax.set_title(title);return fig,ax
def save(fig,name):
    fig.tight_layout();fig.savefig(ROOT/'figures'/f'{name}.png',dpi=170);plt.close(fig)
fig,ax=axes(r'$\frac{x^2}{4}-y^2=1$')
y=np.linspace(-2.5,2.5,350);x=2*np.sqrt(1+y*y)
ax.plot(x,y,color='#2563a6');ax.plot(-x,y,color='#2563a6')
for x,xy in [(-2,(-77,15)),(2,(12,15))]:
    ax.scatter([x],[0],color='#b91c1c',zorder=5)
    ax.annotate(f'$({x},0)$',(x,0),xytext=xy,textcoords='offset points',color='#b91c1c',arrowprops={'arrowstyle':'-','color':'#b91c1c'})
ax.set(xlim=(-5.5,5.5),ylim=(-2.6,2.6),xticks=[-4,-2,0,2,4],yticks=[-2,-1,0,1,2])
save(fig,'hyperbola-vertices')
for name,title,x,y,vertex in [
    ('parabola-vertex',r'$y=(x-2)^2+1$',np.linspace(-.3,4.3,300),lambda x:(x-2)**2+1,(2,1)),
    ('absolute-vertex',r'$y=-|x+1|+2$',np.linspace(-4,2,301),lambda x:-abs(x+1)+2,(-1,2))]:
    fig,ax=axes(title);ax.plot(x,y(x),color='#2563a6',lw=2)
    ax.scatter(*vertex,color='#b91c1c',zorder=5)
    ax.annotate(f'$({vertex[0]},{vertex[1]})$',vertex,xytext=(16,16),textcoords='offset points',color='#b91c1c',arrowprops={'arrowstyle':'-','color':'#b91c1c'})
    ax.set_ylim((-.4,7) if name=='parabola-vertex' else (-1.4,3.2))
    ax.set_xticks(range(0,5) if name=='parabola-vertex' else range(-4,3))
    save(fig,name)
