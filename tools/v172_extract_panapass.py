#!/usr/bin/env python3
from pathlib import Path
import re

ROOT=Path(__file__).resolve().parents[1]
INDEX=ROOT/'index.html'
CSS=ROOT/'css/core-base.css'
RUNTIME=ROOT/'modules/core/runtime.js'

html=INDEX.read_text(encoding='utf-8')
css_tag='<link id="rym-v172-core-base" rel="stylesheet" href="/css/core-base.css?v=172-clean">'
runtime_tag='<script id="rym-v172-core-runtime" src="/modules/core/runtime.js?v=172-clean"></script>'

# Idempotent verification path.
if css_tag in html and runtime_tag in html:
    if not CSS.exists() or not RUNTIME.exists():
        raise SystemExit('V172 tags exist but extracted files are missing')
    print('V172 base runtime already extracted')
    print('index bytes:',INDEX.stat().st_size)
    print('runtime bytes:',RUNTIME.stat().st_size)
    print('css bytes:',CSS.stat().st_size)
    raise SystemExit(0)

# Base stylesheet: choose the stylesheet that owns the original Portal RYM root variables.
styles=list(re.finditer(r'<style(?P<attrs>[^>]*)>(?P<body>.*?)</style>',html,re.S|re.I))
base_style=next((m for m in styles if ':root{font-family:"Segoe UI",Arial,sans-serif' in m.group('body')),None)
if not base_style:
    raise SystemExit('Base Portal stylesheet not found')
base_css=base_style.group('body').strip()+'\n'
if len(base_css.encode())<10000:
    raise SystemExit('Base stylesheet unexpectedly small; refusing extraction')

# Base runtime: choose the classic inline script that declares endpoint + state.
scripts=list(re.finditer(r'<script(?P<attrs>[^>]*)>(?P<body>.*?)</script>',html,re.S|re.I))
base_script=next((m for m in scripts if "const URL='https://avczyvcpmicpuhdkmxzx.supabase.co'" in m.group('body') and 'const state={' in m.group('body')),None)
if not base_script:
    raise SystemExit('Base Portal runtime not found')
base_js=base_script.group('body').strip()+'\n'
required=['async function dashboard','async function negativos','async function pagosTrabajo','async function historial','async function operaciones','async function reportes']
missing=[x for x in required if x not in base_js]
if missing:
    raise SystemExit('Base runtime missing expected Panapass views: '+', '.join(missing))
if len(base_js.encode())<100000:
    raise SystemExit('Base runtime unexpectedly small; refusing extraction')

CSS.parent.mkdir(parents=True,exist_ok=True)
RUNTIME.parent.mkdir(parents=True,exist_ok=True)
CSS.write_text(base_css,encoding='utf-8')
RUNTIME.write_text(base_js,encoding='utf-8')

# Replace from right to left so source offsets remain valid.
replacements=[(base_style.start(),base_style.end(),css_tag),(base_script.start(),base_script.end(),runtime_tag)]
for start,end,repl in sorted(replacements,reverse=True):
    html=html[:start]+repl+html[end:]

INDEX.write_text(html,encoding='utf-8')

final=INDEX.read_text(encoding='utf-8')
if "const URL='https://avczyvcpmicpuhdkmxzx.supabase.co'" in final:
    raise SystemExit('Base runtime still present inline')
if ':root{font-family:"Segoe UI",Arial,sans-serif' in final:
    raise SystemExit('Base stylesheet still present inline')
if final.count(css_tag)!=1 or final.count(runtime_tag)!=1:
    raise SystemExit('Extracted source tags are not unique')

print('V172 base runtime extraction OK')
print('index bytes:',INDEX.stat().st_size)
print('runtime bytes:',RUNTIME.stat().st_size)
print('css bytes:',CSS.stat().st_size)
