#!/usr/bin/env python3
from pathlib import Path
import re

ROOT=Path(__file__).resolve().parents[1]
INDEX=ROOT/'index.html'
CSS=ROOT/'css/core-base.css'
RUNTIME=ROOT/'modules/core/runtime.js'
css_tag='<link id="rym-v172-core-base" rel="stylesheet" href="/css/core-base.css?v=172-clean">'
runtime_tag='<script id="rym-v172-core-runtime" src="/modules/core/runtime.js?v=172-clean"></script>'
VIEWS=[
 ('dashboard','modules/panapass/dashboard/base.js'),
 ('openSupervisoraProfile','modules/panapass/perfil-supervisora.js'),
 ('negativos','modules/panapass/negativos/base.js'),
 ('pagosConsultaHoy','modules/panapass/pagos/consulta.js'),
 ('pagosTrabajo','modules/panapass/pagos/trabajo.js'),
 ('historial','modules/panapass/historial/base.js'),
 ('operaciones','modules/panapass/operaciones/base.js'),
 ('reportes','modules/panapass/reportes/base.js'),
]

def extract_base_if_needed():
 html=INDEX.read_text(encoding='utf-8')
 if css_tag in html and runtime_tag in html:
  if not CSS.exists() or not RUNTIME.exists(): raise SystemExit('V172 extracted base files missing')
  return html
 styles=list(re.finditer(r'<style(?P<attrs>[^>]*)>(?P<body>.*?)</style>',html,re.S|re.I))
 bs=next((m for m in styles if ':root{font-family:"Segoe UI",Arial,sans-serif' in m.group('body')),None)
 scripts=list(re.finditer(r'<script(?P<attrs>[^>]*)>(?P<body>.*?)</script>',html,re.S|re.I))
 bj=next((m for m in scripts if "const URL='https://avczyvcpmicpuhdkmxzx.supabase.co'" in m.group('body') and 'const state={' in m.group('body')),None)
 if not bs or not bj: raise SystemExit('Base Portal sources not found')
 css=bs.group('body').strip()+'\n'; js=bj.group('body').strip()+'\n'
 if len(css.encode())<10000 or len(js.encode())<100000: raise SystemExit('Base sources unexpectedly small')
 CSS.parent.mkdir(parents=True,exist_ok=True);RUNTIME.parent.mkdir(parents=True,exist_ok=True)
 CSS.write_text(css,encoding='utf-8');RUNTIME.write_text(js,encoding='utf-8')
 for start,end,repl in sorted([(bs.start(),bs.end(),css_tag),(bj.start(),bj.end(),runtime_tag)],reverse=True): html=html[:start]+repl+html[end:]
 INDEX.write_text(html,encoding='utf-8');return html

def span_from_match(src,m,name):
 i=m.end();n=len(src);state='normal';esc=False;brace=None
 while i<n:
  c=src[i];nxt=src[i+1] if i+1<n else ''
  if state=='normal':
   if c=="'":state='single'
   elif c=='"':state='double'
   elif c=='`':state='template'
   elif c=='/' and nxt=='/':state='line';i+=1
   elif c=='/' and nxt=='*':state='block';i+=1
   elif c=='{':brace=i;break
  elif state in ('single','double','template'):
   if esc:esc=False
   elif c=='\\':esc=True
   elif (state=='single' and c=="'") or (state=='double' and c=='"') or (state=='template' and c=='`'):state='normal'
  elif state=='line' and c=='\n':state='normal'
  elif state=='block' and c=='*' and nxt=='/':state='normal';i+=1
  i+=1
 if brace is None:raise SystemExit('Opening brace not found: '+name)
 depth=0;i=brace;state='normal';esc=False;regex_class=False;prev_sig=''
 while i<n:
  c=src[i];nxt=src[i+1] if i+1<n else ''
  if state=='normal':
   if c=="'":state='single'
   elif c=='"':state='double'
   elif c=='`':state='template'
   elif c=='/' and nxt=='/':state='line';i+=1
   elif c=='/' and nxt=='*':state='block';i+=1
   elif c=='/' and (not prev_sig or prev_sig in '([=,:;!?&|{'):state='regex';regex_class=False
   elif c=='{':depth+=1
   elif c=='}':
    depth-=1
    if depth==0:
     end=i+1
     while end<n and src[end] in ' \t':end+=1
     if end<n and src[end]=='\r':end+=1
     if end<n and src[end]=='\n':end+=1
     return m.start(),end,src[m.start():end]
   if not c.isspace():prev_sig=c
  elif state in ('single','double','template'):
   if esc:esc=False
   elif c=='\\':esc=True
   elif (state=='single' and c=="'") or (state=='double' and c=='"') or (state=='template' and c=='`'):state='normal'
  elif state=='line' and c=='\n':state='normal'
  elif state=='block' and c=='*' and nxt=='/':state='normal';i+=1
  elif state=='regex':
   if esc:esc=False
   elif c=='\\':esc=True
   elif c=='[':regex_class=True
   elif c==']':regex_class=False
   elif c=='/' and not regex_class:state='normal';prev_sig='/'
  i+=1
 raise SystemExit('Closing brace not found: '+name)

def function_spans(src,name):
 pat=re.compile(r'(?m)^[ \t]*(?:async\s+)?function\s+'+re.escape(name)+r'\s*\(')
 matches=list(pat.finditer(src))
 if not matches:raise SystemExit('Function not found in shared runtime: '+name)
 return [span_from_match(src,m,name) for m in matches]

def split_views(html):
 runtime=RUNTIME.read_text(encoding='utf-8')
 tags=[f'<script data-rym-panapass-view="{n}" src="/{p}?v=172-clean"></script>' for n,p in VIEWS]
 if all((ROOT/p).exists() and tag in html for (n,p),tag in zip(VIEWS,tags)):
  return html
 removals=[]
 for name,path in VIEWS:
  spans=function_spans(runtime,name)
  # Global function declarations are hoisted; when historical copies exist, the last declaration is the effective base owner.
  latest=spans[-1][2]
  p=ROOT/path;p.parent.mkdir(parents=True,exist_ok=True)
  p.write_text('/* Portal RYM V172 clean - Panapass '+name+' */\n'+latest.strip()+'\n',encoding='utf-8')
  for start,end,_ in spans:removals.append((start,end,name))
 ordered=sorted(removals)
 for a,b in zip(ordered,ordered[1:]):
  if a[1]>b[0]:raise SystemExit('Overlapping Panapass extraction: '+a[2]+' / '+b[2])
 for start,end,_ in sorted(removals,reverse=True):runtime=runtime[:start]+runtime[end:]
 RUNTIME.write_text(runtime,encoding='utf-8')
 if runtime_tag not in html:raise SystemExit('Core runtime tag missing')
 html=html.replace(runtime_tag,'\n'.join(tags)+'\n'+runtime_tag,1)
 INDEX.write_text(html,encoding='utf-8');return html

html=extract_base_if_needed();html=split_views(html)
final=INDEX.read_text(encoding='utf-8');runtime=RUNTIME.read_text(encoding='utf-8')
if final.count(css_tag)!=1 or final.count(runtime_tag)!=1:raise SystemExit('Core source tags are not unique')
for name,path in VIEWS:
 tag=f'<script data-rym-panapass-view="{name}" src="/{path}?v=172-clean"></script>'
 if final.count(tag)!=1:raise SystemExit('Panapass view tag missing or duplicated: '+name)
 if re.search(r'(?m)^[ \t]*(?:async\s+)?function\s+'+re.escape(name)+r'\s*\(',runtime):raise SystemExit('Panapass view still owned by shared runtime: '+name)
print('V172 Panapass view split OK')
print('index bytes:',INDEX.stat().st_size);print('runtime bytes:',RUNTIME.stat().st_size);print('css bytes:',CSS.stat().st_size)
for name,path in VIEWS:print(name,'bytes:',(ROOT/path).stat().st_size)
