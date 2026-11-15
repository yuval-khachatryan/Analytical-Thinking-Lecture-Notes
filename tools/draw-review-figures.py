"""Small, actual-term plots for the Chapter 2 review additions."""
from pathlib import Path
from math import sqrt
from html import escape

DEST = Path(__file__).resolve().parents[1] / 'figures'

def plot(name, title, values, ymin, ymax, ticks, guides):
    w, h = 650, 280
    left, right, top, bottom = 58, 24, 34, 40
    x = lambda n: left + (n - .5) / len(values) * (w-left-right)
    y = lambda v: top + (ymax-v) / (ymax-ymin) * (h-top-bottom)
    parts = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" role="img" aria-labelledby="title">',
             f'<title id="title">{escape(title)}</title>',
             '<style>text{font:15px Georgia,serif;fill:#334155}.axis{stroke:#94a3b8;stroke-width:1.2}</style>',
             f'<path class="axis" fill="none" d="M {left} {top} V {h-bottom} H {w-right}"/>']
    def text(label, xx, yy, anchor='middle', color=None):
        parts.append(f'<text x="{xx:.2f}" y="{yy:.2f}" text-anchor="{anchor}"'+(f' style="fill:{color}"' if color else '')+f'>{escape(str(label))}</text>')
    for value,label in ticks:
        parts.append(f'<path class="axis" d="M {left-4} {y(value):.2f} h 4"/>')
        text(label,left-9,y(value)+5,'end')
    for value,label,color in guides:
        parts.append(f'<path stroke="{color}" stroke-width="1.6" stroke-dasharray="5 4" d="M {left} {y(value):.2f} H {w-right}"/>')
        text(label,w-right-3,y(value)-9,'end',color)
    for n,value in enumerate(values,1):
        parts.append(f'<circle cx="{x(n):.2f}" cy="{y(value):.2f}" r="3.8" fill="#6d4bc3"/>')
        parts.append(f'<path class="axis" d="M {x(n):.2f} {h-bottom} v 4"/>')
        text(n,x(n),h-bottom+20)
    text('n',w-right,h-7,'end')
    text('aₙ',left-17,top-13)
    parts.append('</svg>')
    (DEST/name).write_text('\n'.join(parts)+'\n')

plot('ch02-bound-and-limit.svg', 'aₙ = 1 − 1/n: limit 1; upper bounds 1 and 2',
     [1-1/n for n in range(1,13)], -.12, 2.35,
     [(0,'0'),(1,'1'),(2,'2')], [(1,'L = 1','#6d4bc3'),(2,'M = 2','#527a82')])
plot('ch02-conjugate-difference.svg', 'aₙ = √(n²+n) − n → 1/2',
     [1/(sqrt(1+1/n)+1) for n in range(1,17)], .39, .53,
     [(.4,'2/5'),(.45,'9/20'),(.5,'1/2')], [(.5,'L = 1/2','#6d4bc3')])
