"""Number-line illustration of finite visual resolution; no numerical point labels."""
from pathlib import Path
from xml.sax.saxutils import escape
L, scale, N, epsilon = 610, 540, 5, 1/70
parts=['<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 760 210" role="img" aria-labelledby="title desc">',
'<title id="title">איברי סדרה מצטופפים ליד הגבול</title>',
'<desc id="desc">איברי סדרה מתקרבים אל L משמאל. באיור N=5: מכאן כל האיברים בתוך סביבת אפסילון. האיברים הבאים מצטופפים עד שסימוניהם אינם נבדלים מסימון הגבול.</desc>',
'<rect x="1" y="1" width="758" height="208" rx="10" fill="#faf9ff" stroke="#d5cee7"/>']
def element(tag, text=None, **attrs):
    att=' '.join(f'{k.replace("_","-")}="{v}"' for k,v in attrs.items())
    parts.append(f'<{tag} {att}/>' if text is None else f'<{tag} {att}>{escape(text)}</{tag}>')
def line(x1,y1,x2,y2,color='#64748b',**kw):
    element('line',x1=x1,y1=y1,x2=x2,y2=y2,stroke=color,**kw)
def text(s,x,y,color='#334155',size=19):
    element('text',s,x=x,y=y,fill=color,font_family='Cambria Math, Times New Roman, serif',font_size=size,text_anchor='middle',direction='ltr')
y=105
left,right=L-scale*epsilon,L+scale*epsilon
element('rect',x=left,y=63,width=right-left,height=72,fill='#ded4f7')
for x in [left,right]:line(x,63,x,135,'#7351ba',stroke_dasharray='4 3')
line(40,y,720,y)
for n in range(1,10):
    x=L-scale/(3**(n-1))
    element('circle',cx=x,cy=y,r=3.5,fill='#2757b8' if n<N else '#7351ba')
# True positions, with leader labels spaced to remain legible.
for n,label,lx,ly in [(1,'a₁',70,55),(2,'a₂',430,55),(3,'a₃',530,42),(4,'a₄',566,25),(5,'aᴺ',617,25),(6,'aᴺ⁺¹',678,45)]:
    x=L-scale/(3**(n-1));color='#2757b8' if n<N else '#7351ba'
    line(x,y-5,lx,ly+8,color)
    # Use ordinary subscripts for N and N+1, avoiding superscript notation.
    if n>=5:
        suffix='N' if n==5 else 'N+1'
        parts.append(f'<text x="{lx-3}" y="{ly}" fill="{color}" font-family="Cambria Math, Times New Roman, serif" font-size="19" text-anchor="end" direction="ltr">a</text>')
        parts.append(f'<text x="{lx-3}" y="{ly+5}" fill="{color}" font-family="Cambria Math, Times New Roman, serif" font-size="13" text-anchor="start" direction="ltr">{suffix}</text>')
    else:text(label,lx,ly,color)
text('…',706,80,'#7351ba')
element('circle',cx=L,cy=y,r=4,fill='#7351ba')
text('L',L,151,'#7351ba',21)
for x,label,lx in [(left,'L − ε',552),(right,'L + ε',672)]:
    line(x,137,lx,174,'#9b87c6');text(label,lx,195,'#7351ba',18)
parts.append('</svg>')
Path(__file__).with_name('figures').joinpath('ch02-limit-resolution.svg').write_text('\n'.join(parts))
