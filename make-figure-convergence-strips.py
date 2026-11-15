"""Schematic convergence illustrations: symbolic vertical labels, explicit N ticks."""
from pathlib import Path
from xml.sax.saxutils import escape
parts=['<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 740 540" role="img" aria-labelledby="title desc">',
'<title id="title">כל רצועה מכילה את כל האיברים מאינדקס מתאים והלאה</title>',
'<desc id="desc">ברצועה הרחבה אפשר לבחור N=11. ברצועה הצרה אפשר לבחור N=101. בציור הראשון יש שנתה לכל אינדקס מוצג; בשני מסומנת רק השנתה של N. הנקודות קטנות ומופרדות, ולא מוצגים ערכי איברים או נוסחת סדרה.</desc>']
BLUE,RED,PURPLE,GREY='#305bc2','#c13c53','#7351ba','#64748b'
def element(tag, content=None, **attrs):
    at=' '.join(f'{k.replace("_","-")}="{v}"' for k,v in attrs.items())
    parts.append(f'<{tag} {at}/>' if content is None else f'<{tag} {at}>{escape(content)}</{tag}>')
def text(s,x,y,color='#38445b',size=16,he=False):
    element('text',s,x=x,y=y,fill=color,font_family='Arial, sans-serif' if he else 'Georgia, serif',font_size=size,text_anchor='middle',direction='rtl' if he else 'ltr')
def line(x1,y1,x2,y2,color=GREY,**attrs):element('line',x1=x1,y1=y1,x2=x2,y2=y2,stroke=color,**attrs)
# A single convergent schematic sequence, with visible entry into each strip.
# No formula is displayed: the illustration is about eventual containment.
def term_value(n):
    if n<=10:return 1/n
    if n<=100:return .07-(n-11)*(.07-.021)/89
    return .004*101/n

for offset,cutoff,count,radius,title in [(0,11,18,3.4,'רצועה רחבה'),(270,101,140,1.15,'רצועה צרה יותר')]:
    parts.append(f'<g transform="translate(0,{offset})" data-cutoff="{cutoff}" data-count="{count}">')
    left,right,top,bottom=82,690,38,228
    epsilon=.1 if cutoff==11 else .02
    X=lambda n:left+(n-.5)*(right-left)/count
    Y=lambda value:top+(1.08-value)/1.28*(bottom-top)
    upper,lower,center=Y(epsilon),Y(-epsilon),Y(0)
    element('rect',x=left,y=upper,width=right-left,height=lower-upper,fill='#c5b2ee')
    for height in [upper,lower]:line(left,height,right,height,PURPLE,stroke_width=.7,stroke_dasharray='3 3')
    line(left,center,right,center,'#aa98c4',stroke_width=.6)
    line(left,top,left,bottom,stroke_width=1.2);line(left,bottom,right,bottom,stroke_width=1.2)
    text('a',40,43)
    text('n',48,48,size=11)
    text('n',714,233);text('L',35,center+5,PURPLE)
    # When the strip is thin, move labels only; its true boundaries stay put.
    for sign,height,label_y in [(1,upper,min(upper+5,center-23)),(-1,lower,max(lower+5,center+29))]:
        text('L + ε' if sign>0 else 'L − ε',40,label_y,PURPLE,15)
        line(66,label_y-5,left,height,'#a99ac6',stroke_width=.7)
    for n in range(1,count+1):
        if cutoff==11:line(X(n),bottom,X(n),bottom+5,stroke_width=1)
        element('circle',cx=f'{X(n):.5f}',cy=f'{Y(term_value(n)):.5f}',r=radius,fill=BLUE if n>=cutoff else RED,data_index=n,data_inside=str(n>=cutoff).lower())
    line(X(cutoff),top,X(cutoff),bottom,'#4b8065',stroke_dasharray='3 4',stroke_width=.9)
    line(X(cutoff),bottom-1,X(cutoff),bottom+8,'#426a55',stroke_width=2,data_cutoff_tick='true')
    text(f'N = {cutoff}',X(cutoff),251,'#426a55')
    text('⋯',710,center+4,BLUE)
    parts.append('</g>')
parts.append('</svg>')
Path(__file__).with_name('figures').joinpath('ch02-convergence-strips.svg').write_text('\n'.join(parts)+'\n')
