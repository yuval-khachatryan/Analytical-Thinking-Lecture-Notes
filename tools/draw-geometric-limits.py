from pathlib import Path
from html import escape
DEST=Path(__file__).resolve().parents[1]/'figures'
def begin(title,h=250):
    return [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 650 {h}" role="img"><title>{escape(title)}</title>', '<style>text{font:16px Georgia,serif;fill:#38445b;direction:ltr;text-anchor:middle}</style>']
def line(out,x1,y1,x2,y2,color='#8996a8',dash=''):
    out.append(f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="{color}" stroke-width="1.2" stroke-dasharray="{dash}"/>')
def text(out,s,x,y):out.append(f'<text x="{x}" y="{y}">{escape(s)}</text>')
def strip(out,center,r):
    out.append(f'<rect x="92" y="{center-r}" width="510" height="{2*r}" fill="#e2d9f7"/>')
    for y in [center-r,center+r]:line(out,92,y,602,y,'#9376bd','5 4')
    line(out,92,center,602,center,'#9376bd')
def point(out,x,y,c='#3b68bd'):out.append(f'<circle cx="{x}" cy="{y}" r="4" fill="{c}"/>')
def save(out,name): (DEST/name).write_text('\n'.join(out+['</svg>'])+'\n')
out=begin('רצועה סביב L, ללא איברי סדרה');strip(out,120,37)
line(out,92,25,92,210);line(out,92,210,615,210)
for s,y in [('L + ε',83),('L',120),('L − ε',157)]:text(out,s,46,y+5)
text(out,'n',620,232);text(out,'aₙ',65,25);save(out,'ch02-empty-strip.svg')
out=begin('איברים מחוץ לרצועה ממשיכים להופיע');strip(out,125,29)
line(out,92,25,92,210);line(out,92,210,615,210)
for i in range(12):point(out,115+i*40,125 if i%2 else 60,'#3b68bd' if i%2 else '#c13c53')
text(out,'L',63,130);text(out,'⋯',615,60);text(out,'⋯',615,125);text(out,'n',620,232)
save(out,'ch02-outside-strip.svg')
out=begin('סביבות נפרדות סביב L ואחת, בשני הסדרים האפשריים',230)
for i,(a,b,title) in enumerate([('L','1','L < 1'),('1','L','1 < L')]):
    y=65+110*i;text(out,title,325,y-40);line(out,50,y,610,y)
    for x,t in [(210,a),(450,b)]:
        line(out,x-60,y,x+60,y,'#9376bd');point(out,x,y,'#7351ba');text(out,t,x,y+28)
        for end in [x-60,x+60]:out.append(f'<circle cx="{end}" cy="{y}" r="4" fill="white" stroke="#9376bd"/>')
    text(out,'ε = |L − 1|/4',325,y+51)
save(out,'ch02-candidate-separation.svg')
out=begin('איברים שנשארים ליד L1 אינם יכולים להישאר גם ליד L2');strip(out,70,22);strip(out,160,22)
text(out,'L₁',63,75);text(out,'L₂',63,165);line(out,92,25,92,220);line(out,92,220,615,220)
for i in range(12):point(out,115+i*40,70+18*((-1)**i)/(i+1))
line(out,102,25,102,220,'#4b8065','3 4');text(out,'N',102,242);text(out,'n',620,242);text(out,'⋯',615,70)
save(out,'ch02-unique-destinations.svg')
