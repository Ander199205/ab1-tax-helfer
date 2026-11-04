# Genera estado-tax-helfer.html (copiado de ab1web/tools/estado/build.py) a partir de datos.json, el informe de tools/capturas.mjs y las capturas de .capturas/.
import json,re,io,base64,html,sys,collections
from PIL import Image
D=sys.argv[1]; REPO=sys.argv[2]; INF=sys.argv[3]
d=json.load(open(D+'/datos.json')); e=html.escape
inf=open(INF).read()
avisos=[l.strip()[2:] for l in inf.splitlines() if l.startswith('   - ')]
tot=int(re.search(r'(\d+) problema',inf).group(1))
scroll=sum('scroll horizontal' in a for a in avisos); part=sum('texto partido' in a for a in avisos)
terc=0
m=re.search(r'peticiones a terceros.*?\n((?:   - .*\n?)*)',inf); terc=len(m.group(1).strip().splitlines()) if m else 0
# avisos agrupados por página
pag=collections.OrderedDict(); cur=None
for l in inf.splitlines():
    mm=re.match(r'[✓✗] (\S+) \[(\w+)\] @(\d+)px',l)
    if mm: cur=mm.group(1).strip('/') or 'inicio'; continue
    if l.startswith('   - ') and cur and 'https://' not in l:
        t=re.sub(r' \d+×\d+','',l.strip()[2:]); pag.setdefault(cur,collections.Counter())[t]+=1
PAGES=[('inicio','Übersicht'),('steuerjahre','Steuerjahre'),('belege','Belege'),('kategorien','Kategorien'),('export','Export')]
W=[375,768,1200,1440]
def img(p,w):
    im=Image.open(f'{REPO}/.capturas/{p}-de-{w}.jpg').convert('RGB')
    if im.width>760: im=im.resize((760,int(im.height*760/im.width)))
    b=io.BytesIO(); im.save(b,'JPEG',quality=62); return 'data:image/jpeg;base64,'+base64.b64encode(b.getvalue()).decode()
shots={p:{w:img(p,w) for w in W} for p,_ in PAGES}
a=d['antes']
def kpi(n,lab,antes,bueno):
    cls='ok' if bueno else 'warn'
    return f'<div class="kpi {cls}"><span class="kv">{n}</span><span class="kl">{e(lab)}</span><span class="ka">antes: {antes}</span></div>'
kpis=kpi(tot,'avisos en el informe',a['avisos'],tot==0)+kpi(scroll,'páginas con scroll horizontal',a['scroll'],scroll==0)+kpi(part,'textos partidos en menú o botones',a['partidos'],part==0)+kpi(terc,'peticiones a terceros',a['terceros'],terc==0)
hechos=''.join(f'<li><span class="chip ok">Hecho</span><div><h3>{e(h["t"])}</h3><p>{e(h["d"])}</p><a href="{d["repo"]}/commit/{h["commit"]}" target="_blank" rel="noopener">commit {h["commit"]}</a></div></li>' for h in d['hechos'])
pend=''.join(f'<li><span class="chip warn">{e(p["tipo"])}</span><div><h3>{e(p["t"])}</h3><p>{e(p["d"])}</p></div></li>' for p in d['pendientes'])
dec=''.join(f'<div class="dec"><dt>{e(k)}</dt><dd>{e(v)}</dd></div>' for k,v in d['decisiones'])
avt=''.join(f'<tr><td>{e(p)}</td><td>{e(t)}</td><td class="num">{n}</td></tr>' for p,c in pag.items() for t,n in c.items()) or '<tr><td colspan="3">Sin avisos.</td></tr>'
tabs=''.join(f'<button type="button" class="tab" role="tab" id="tab-{p}" aria-controls="panel" aria-selected="{str(i==0).lower()}" data-p="{p}">{e(n)}</button>' for i,(p,n) in enumerate(PAGES))
anch=''.join(f'<button type="button" class="ancho" aria-pressed="{str(w==375).lower()}" data-w="{w}">{w} px</button>' for w in W)
tpl=open(D+'/plantilla.html').read()
out=(tpl.replace('__ACT__',e(d['actualizado'])).replace('__COMMIT__',e(d['commit'])).replace('__REPO__',d['repo'])
 .replace('__KPIS__',kpis).replace('__HECHOS__',hechos).replace('__PEND__',pend).replace('__DEC__',dec).replace('__AVT__',avt)
 .replace('__TABS__',tabs).replace('__ANCH__',anch).replace('__SHOTS__',json.dumps(shots)).replace('__NHECHOS__',str(len(d['hechos']))).replace('__NPEND__',str(len(d['pendientes']))))
open(D+'/estado-tax-helfer.html','w').write(out); print(len(out)//1024,'KB',tot,scroll,part,terc)
