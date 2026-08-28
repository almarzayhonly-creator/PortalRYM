#!/usr/bin/env python3
from pathlib import Path
import re

ROOT=Path(__file__).resolve().parents[1]
INDEX=ROOT/'index.html'
RUNTIME=ROOT/'modules/core/runtime.js'
SHELL=ROOT/'modules/core/shell.js'
TAG='<script id="rym-v172-core-shell" src="/modules/core/shell.js?v=172-clean"></script>'
RUNTIME_TAG='<script id="rym-v172-core-runtime" src="/modules/core/runtime.js?v=172-clean"></script>'


def function_span(src,name):
    m=re.search(r'(?m)^[ \t]*(?:async\s+)?function\s+'+re.escape(name)+r'\s*\(',src)
    if not m: raise SystemExit('Function not found: '+name)
    i=m.end(); n=len(src); state='normal'; esc=False; brace=None
    while i<n:
        c=src[i]; nxt=src[i+1] if i+1<n else ''
        if state=='normal':
            if c=="'": state='single'
            elif c=='"': state='double'
            elif c=='`': state='template'
            elif c=='/' and nxt=='/': state='line'; i+=1
            elif c=='/' and nxt=='*': state='block'; i+=1
            elif c=='{': brace=i; break
        elif state in ('single','double','template'):
            if esc: esc=False
            elif c=='\\': esc=True
            elif (state=='single' and c=="'") or (state=='double' and c=='"') or (state=='template' and c=='`'): state='normal'
        elif state=='line':
            if c=='\n': state='normal'
        elif state=='block':
            if c=='*' and nxt=='/': state='normal'; i+=1
        i+=1
    if brace is None: raise SystemExit('Opening brace missing: '+name)
    depth=0; i=brace; state='normal'; esc=False; regex_class=False; prev_sig=''
    while i<n:
        c=src[i]; nxt=src[i+1] if i+1<n else ''
        if state=='normal':
            if c=="'": state='single'
            elif c=='"': state='double'
            elif c=='`': state='template'
            elif c=='/' and nxt=='/': state='line'; i+=1
            elif c=='/' and nxt=='*': state='block'; i+=1
            elif c=='/' and (not prev_sig or prev_sig in '([=,:;!?&|{'): state='regex'; regex_class=False
            elif c=='{': depth+=1
            elif c=='}':
                depth-=1
                if depth==0:
                    end=i+1
                    while end<n and src[end] in ' \t\r': end+=1
                    if end<n and src[end]=='\n': end+=1
                    return m.start(),end,src[m.start():end]
            if not c.isspace(): prev_sig=c
        elif state in ('single','double','template'):
            if esc: esc=False
            elif c=='\\': esc=True
            elif (state=='single' and c=="'") or (state=='double' and c=='"') or (state=='template' and c=='`'): state='normal'
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
    raise SystemExit('Closing brace missing: '+name)

html=INDEX.read_text(encoding='utf-8')
runtime=RUNTIME.read_text(encoding='utf-8')
if TAG in html:
    if not SHELL.exists(): raise SystemExit('Shell tag exists but file missing')
    print('Shell already split')
    raise SystemExit(0)

spans=[]
for name in ('shell','render'):
    spans.append((*function_span(runtime,name),name))
for a,b in zip(sorted(spans),sorted(spans)[1:]):
    if a[1]>b[0]: raise SystemExit('Overlapping shell functions')
parts=[x[2].strip() for x in sorted(spans)]
SHELL.parent.mkdir(parents=True,exist_ok=True)
SHELL.write_text('/* Portal RYM V172 clean - core shell and renderer */\n'+'\n\n'.join(parts)+'\n',encoding='utf-8')
for start,end,_,_ in sorted(spans,reverse=True):
    runtime=runtime[:start]+runtime[end:]
RUNTIME.write_text(runtime,encoding='utf-8')
if RUNTIME_TAG not in html: raise SystemExit('Runtime tag missing from index')
html=html.replace(RUNTIME_TAG,TAG+'\n'+RUNTIME_TAG,1)
INDEX.write_text(html,encoding='utf-8')

print('V172 shell split OK')
print('runtime bytes:',RUNTIME.stat().st_size)
print('shell bytes:',SHELL.stat().st_size)
print('index bytes:',INDEX.stat().st_size)
