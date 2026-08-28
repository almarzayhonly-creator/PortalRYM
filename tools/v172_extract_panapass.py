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
        if not CSS.exists() or not RUNTIME.exists():
            raise SystemExit('V172 source tags exist but extracted files are missing')
        return html

    styles=list(re.finditer(r'<style(?P<attrs>[^>]*)>(?P<body>.*?)</style>',html,re.S|re.I))
    base_style=next((m for m in styles if ':root{font-family:"Segoe UI",Arial,sans-serif' in m.group('body')),None)
    if not base_style:
        raise SystemExit('Base Portal stylesheet not found')
    base_css=base_style.group('body').strip()+'\n'
    if len(base_css.encode())<10000:
        raise SystemExit('Base stylesheet unexpectedly small; refusing extraction')

    scripts=list(re.finditer(r'<script(?P<attrs>[^>]*)>(?P<body>.*?)</script>',html,re.S|re.I))
    base_script=next((m for m in scripts if "const URL='https://avczyvcpmicpuhdkmxzx.supabase.co'" in m.group('body') and 'const state={' in m.group('body')),None)
    if not base_script:
        raise SystemExit('Base Portal runtime not found')
    base_js=base_script.group('body').strip()+'\n'
    if len(base_js.encode())<100000:
        raise SystemExit('Base runtime unexpectedly small; refusing extraction')

    CSS.parent.mkdir(parents=True,exist_ok=True)
    RUNTIME.parent.mkdir(parents=True,exist_ok=True)
    CSS.write_text(base_css,encoding='utf-8')
    RUNTIME.write_text(base_js,encoding='utf-8')

    for start,end,repl in sorted([
        (base_style.start(),base_style.end(),css_tag),
        (base_script.start(),base_script.end(),runtime_tag),
    ],reverse=True):
        html=html[:start]+repl+html[end:]
    INDEX.write_text(html,encoding='utf-8')
    return html


def function_span(src,name):
    m=re.search(r'(?m)^[ \t]*(?:async\s+)?function\s+'+re.escape(name)+r'\s*\(',src)
    if not m:
        raise SystemExit('Function not found in shared runtime: '+name)

    # Locate the opening body brace while respecting strings/comments.
    i=m.end(); n=len(src); state='normal'; esc=False; prev=''
    brace=None
    while i<n:
        c=src[i]; nxt=src[i+1] if i+1<n else ''
        if state=='normal':
            if c in "'\"`": state={'\'':'single','\"':'double','`':'template'}[c]
            elif c=='/' and nxt=='/': state='line'; i+=1
            elif c=='/' and nxt=='*': state='block'; i+=1
            elif c=='{': brace=i; break
        elif state in ('single','double','template'):
            if esc: esc=False
            elif c=='\\': esc=True
            elif (state=='single' and c=="'") or (state=='double' and c=='\"') or (state=='template' and c=='`'): state='normal'
        elif state=='line':
            if c=='\n': state='normal'
        elif state=='block':
            if c=='*' and nxt=='/': state='normal'; i+=1
        prev=c; i+=1
    if brace is None:
        raise SystemExit('Opening brace not found: '+name)

    # Match the function body. Template literals are treated as literals: braces
    # inside ${...} do not affect the outer function body balance.
    depth=0; i=brace; state='normal'; esc=False; regex_class=False; prev_sig=''
    while i<n:
        c=src[i]; nxt=src[i+1] if i+1<n else ''
        if state=='normal':
            if c=="'": state='single'
            elif c=='\"': state='double'
            elif c=='`': state='template'
            elif c=='/' and nxt=='/': state='line'; i+=1
            elif c=='/' and nxt=='*': state='block'; i+=1
            elif c=='/' and (not prev_sig or prev_sig in '([=,:;!?&|{'):
                state='regex'; regex_class=False
            elif c=='{': depth+=1
            elif c=='}':
                depth-=1
                if depth==0:
                    end=i+1
                    while end<n and src[end] in ' \t': end+=1
                    if end<n and src[end]=='\r': end+=1
                    if end<n and src[end]=='\n': end+=1
                    return m.start(),end,src[m.start():end]
            if not c.isspace(): prev_sig=c
        elif state in ('single','double','template'):
            if esc: esc=False
            elif c=='\\': esc=True
            elif (state=='single' and c=="'") or (state=='double' and c=='\"') or (state=='template' and c=='`'): state='normal'
        elif state=='line':
            if c=='\n': state='normal'
        elif state=='block':
            if c=='*' and nxt=='/': state='normal'; i+=1
        elif state=='regex':
            if esc: esc=False
            elif c=='\\': esc=True
            elif c=='[': regex_class=True
            elif c==']': regex_class=False
            elif c=='/' and not regex_class: state='normal'; prev_sig='/'
        i+=1
    raise SystemExit('Closing brace not found: '+name)


def split_views(html):
    runtime=RUNTIME.read_text(encoding='utf-8')
    tags=[]
    existing=True
    for name,path in VIEWS:
        p=ROOT/path
        tag=f'<script data-rym-panapass-view="{name}" src="/{path}?v=172-clean"></script>'
        tags.append(tag)
        if not p.exists() or tag not in html:
            existing=False
    if existing:
        return html

    spans=[]
    for name,path in VIEWS:
        start,end,text=function_span(runtime,name)
        spans.append((start,end,name,path,text))

    # Refuse overlapping/duplicate matches.
    ordered=sorted(spans)
    for a,b in zip(ordered,ordered[1:]):
        if a[1]>b[0]:
            raise SystemExit('Overlapping Panapass function extraction')

    for _,_,name,path,text in spans:
        p=ROOT/path
        p.parent.mkdir(parents=True,exist_ok=True)
        p.write_text('/* Portal RYM V172 clean - Panapass '+name+' */\n'+text.strip()+'\n',encoding='utf-8')

    for start,end,_,_,_ in sorted(spans,reverse=True):
        runtime=runtime[:start]+runtime[end:]
    RUNTIME.write_text(runtime,encoding='utf-8')

    block='\n'.join(tags)+'\n'
    if runtime_tag not in html:
        raise SystemExit('Core runtime tag missing from index')
    html=html.replace(runtime_tag,block+runtime_tag,1)
    INDEX.write_text(html,encoding='utf-8')
    return html


html=extract_base_if_needed()
html=split_views(html)

# Final hard checks.
final=INDEX.read_text(encoding='utf-8')
runtime=RUNTIME.read_text(encoding='utf-8')
if final.count(css_tag)!=1 or final.count(runtime_tag)!=1:
    raise SystemExit('Core source tags are not unique')
for name,path in VIEWS:
    tag=f'<script data-rym-panapass-view="{name}" src="/{path}?v=172-clean"></script>'
    if final.count(tag)!=1:
        raise SystemExit('Panapass view tag missing or duplicated: '+name)
    if re.search(r'(?m)^[ \t]*(?:async\s+)?function\s+'+re.escape(name)+r'\s*\(',runtime):
        raise SystemExit('Panapass view still owned by shared runtime: '+name)

print('V172 Panapass view split OK')
print('index bytes:',INDEX.stat().st_size)
print('runtime bytes:',RUNTIME.stat().st_size)
print('css bytes:',CSS.stat().st_size)
for name,path in VIEWS:
    print(name,'bytes:',(ROOT/path).stat().st_size)
