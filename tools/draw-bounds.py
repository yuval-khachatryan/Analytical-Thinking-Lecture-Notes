"""Individual figures placed next to the boundedness examples.

Run from Notes: ../.venv/bin/python tools/draw-bounds.py --preview
"""
from pathlib import Path
import sys
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
BLUE, ORANGE, GREY = '#2563a6', '#be6208', '#64748b'
plt.rcParams.update({'font.size': 11, 'mathtext.fontset': 'cm', 'svg.fonttype': 'path'})


def save(fig, name):
    fig.savefig(ROOT/'figures'/f'{name}.svg', bbox_inches='tight', facecolor='white')
    if '--preview' in sys.argv:
        fig.savefig(ROOT/'tmp'/f'{name}.png', dpi=150, bbox_inches='tight', facecolor='white')
    plt.close(fig)


def sequence(name, values, title, lower, upper=None, ticks=None, ticklabels=None, continuations=None, term='a_n'):
    n = np.arange(1, len(values)+1)
    fig, ax = plt.subplots(figsize=(5.5, 2.45))
    if upper is not None:
        ax.axhspan(lower, upper, color=BLUE, alpha=.07)
    for bound in [lower]+([] if upper is None else [upper]):
        ax.axhline(bound, color=ORANGE, ls=(0, (4, 3)), lw=1.2)
    ax.scatter(n, values, s=28, color=BLUE, zorder=4)
    for value in (continuations if continuations is not None else [values[-1]]):
        ax.text(n[-1]+.6, value, r'$\cdots$', color=BLUE, va='center')
    ax.set_xlim(.5, n[-1]+1.1)
    ax.set_xticks(n)
    if ticks is not None:
        ax.set_yticks(ticks, ticklabels if ticklabels is not None else ticks)
    ax.set_xlabel('$n$', loc='right', labelpad=0)
    ax.set_ylabel(f'${term}$', rotation=0, labelpad=10)
    ax.set_title(title, pad=12)
    ax.spines[['top', 'right']].set_visible(False)
    ax.margins(y=.2)
    fig.tight_layout()
    save(fig, name)


n = np.arange(1, 9)
sequence('ch02-bounded-reciprocal', 1/n,
         r'$a_n=\frac{1}{n},\qquad m=0,\quad M=1$', 0, 1,
         [0, .5, 1], ['$0$', r'$\frac{1}{2}$', '$1$'])
sequence('ch02-absolute-bound', (-1.)**n,
         r'$a_n=(-1)^n,\qquad |a_n|\leq1$', -1, 1,
         [-1, 0, 1], ['$-M=-1$', '$0$', '$M=1$'], continuations=[-1, 1])
sequence('ch02-unbounded-indices', n,
         r'$a_n=n,\qquad a_n\geq1$', 1, ticks=[1, 4, 8])

sequence('ch02-bounds-arcsin', np.arcsin((-1.)**n/n),
         r'$a_n=\arcsin\!\left(\frac{(-1)^n}{n}\right)$', -np.pi/2, np.pi/2,
         [-np.pi/2, 0, np.pi/2], [r'$-\frac{\pi}{2}$', '$0$', r'$\frac{\pi}{2}$'])
sequence('ch02-bounds-arccos', np.arccos(1/n),
         r'$b_n=\arccos\!\left(\frac{1}{n}\right)$', 0, np.pi,
         [0, np.pi/2, np.pi], ['$0$', r'$\frac{\pi}{2}$', r'$\pi$'], term='b_n')
sequence('ch02-bounds-arctan', np.arctan(n**2),
         r'$c_n=\arctan(n^2)$', -np.pi/2, np.pi/2,
         [-np.pi/2, 0, np.pi/2], [r'$-\frac{\pi}{2}$', '$0$', r'$\frac{\pi}{2}$'], term='c_n')
sequence('ch02-bounds-amgm', np.sqrt(n)/(n+1),
         r'$a_n=\frac{\sqrt{n}}{n+1}$', 0, .5,
         [0, .25, .5], ['$0$', r'$\frac{1}{4}$', r'$\frac{1}{2}$'])
sequence('ch02-bounds-induction', 2-2.**(2-n),
         r'$a_1=0,\qquad a_{n+1}=\frac{a_n+2}{2}$', 0, 2,
         [0, 1, 2], ['$0$', '$1$', '$2$'])

sequence('ch02-bounds-shifted-cosine', 2+np.cos(n),
         r'$a_n=2+\cos(n),\qquad 1\leq a_n\leq3$', 1, 3,
         [1, 2, 3], ['$1$', '$2$', '$3$'])
sequence('ch02-bounds-sine-input', n*np.sin(1/n),
         r'$a_n=n\sin\!\left(\frac{1}{n}\right),\qquad |a_n|\leq1$', -1, 1,
         [-1, 0, 1], ['$-1$', '$0$', '$1$'])
sequence('ch02-bounds-cosine-input', n**2*(1-np.cos(1/n)),
         r'$b_n=n^2\left(1-\cos\!\left(\frac{1}{n}\right)\right)$', 0, .5,
         [0, .25, .5], ['$0$', r'$\frac{1}{4}$', r'$\frac{1}{2}$'], term='b_n')
sequence('ch02-bounds-logarithm', n*np.log1p(1/n),
         r'$a_n=n\ln\!\left(1+\frac{1}{n}\right),\qquad 0\leq a_n\leq1$', 0, 1,
         [0, .5, 1], ['$0$', r'$\frac{1}{2}$', '$1$'])

# The curves are bounds; the isolated points are the terms of the sequence.
fig, ax = plt.subplots(figsize=(5.5, 2.7))
x = np.linspace(1, 8.5, 240)
ax.fill_between(x, -1/x, 1/x, color=ORANGE, alpha=.08)
ax.plot(x, 1/x, color=ORANGE, ls='--', lw=1.3, label=r'$\pm\frac{1}{n}$')
ax.plot(x, -1/x, color=ORANGE, ls='--', lw=1.3)
ax.scatter(n, np.sin(1/n), color=BLUE, s=28, zorder=4,
           label=r'$\sin\!\left(\frac{1}{n}\right)$')
ax.axhline(0, color=GREY, lw=.8)
ax.set(xticks=n, yticks=[-1, -.5, 0, .5, 1], xlim=(.7, 8.7))
ax.set_yticklabels(['$-1$', r'$-\frac{1}{2}$', '$0$', r'$\frac{1}{2}$', '$1$'])
ax.set_xlabel('$n$', loc='right', labelpad=0)
ax.set_title(r'$a_n=\sin\!\left(\frac{1}{n}\right)\ \longrightarrow\ 0$', pad=12)
ax.legend(loc='lower right', frameon=False, ncol=2)
ax.spines[['top', 'right']].set_visible(False)
fig.tight_layout()
save(fig, 'ch02-sine-reciprocal-squeeze')

# An open interval has tight bounds even though neither endpoint belongs to it.
fig, ax = plt.subplots(figsize=(5.5, 1.55))
ax.annotate('', (2.35, 0), (-1.35, 0), arrowprops={'arrowstyle': '->', 'color': GREY})
ax.plot([0, 1], [0, 0], color=BLUE, lw=6, solid_capstyle='butt')
ax.scatter([0, 1], [0, 0], s=62, facecolors='white', edgecolors=BLUE, lw=1.7, zorder=4)
for x in [-1, 2]:
    ax.plot([x, x], [-.06, .06], color=ORANGE, lw=1.2)
ax.text(-1, .16, '$m=-1$', ha='center', color=ORANGE)
ax.text(2, .16, '$M=2$', ha='center', color=ORANGE)
ax.text(0, -.22, r'$\inf A=0$', ha='center', va='top', color=BLUE)
ax.text(1, -.22, r'$\sup A=1$', ha='center', va='top', color=BLUE)
ax.set_title('$A=(0,1)$', pad=8)
ax.set(xlim=(-1.5, 2.5), ylim=(-.55, .45))
ax.axis('off')
fig.tight_layout()
save(fig, 'ch02-bounded-set')
print('Created fourteen individual boundedness and squeeze figures.')
