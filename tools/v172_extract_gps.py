#!/usr/bin/env python3
from pathlib import Path
import re

ROOT=Path(__file__).resolve().parents[1]
INDEX=ROOT/'index.html'
APP=ROOT/'modules/gps/app.js'
CSS=ROOT/'css/gps-v157.css'
SCRIPT_ID='rym-v157-gps-js'
STYLE_ID='rym-v157-gps-css'
SCRIPT_TAG='<script id="rym-v157-gps-js" src="/modules/gps/app.js?v=172-clean"></script>'
STYLE_TAG='<link id="rym-v157-gps-css" rel="stylesheet" href="/css/gps-v157.css?v=172-clean">'

def extract(html,tag,element_id):
    pat=re.compile(rf'<{tag}\s+id=["\']{re.escape(element_id)}["\'][^>]*>(.*?)</{tag}>',re.S|re.I)
    m=pat.search(html)
    if not m: raise SystemExit(f'missing inline {tag}#{element_id}')
    return m.group(1).strip()+'\n',m.start(),m.end()

html=INDEX.read_text(encoding='utf-8')
if SCRIPT_TAG in html and STYLE_TAG in html:
    if not APP.exists() or not CSS.exists(): raise SystemExit('GPS source tags exist but files are missing')
    print('GPS V157 already extracted')
    raise SystemExit(0)

js,js_start,js_end=extract(html,'script',SCRIPT_ID)
css,css_start,css_end=extract(html,'style',STYLE_ID)
if len(js.encode())<20000 or len(css.encode())<5000: raise SystemExit('GPS V157 blocks unexpectedly small')
if 'async function openGps' not in js: raise SystemExit('GPS canonical openGps missing')
if 'window.v113OpenGps' not in js: raise SystemExit('GPS compatibility entrypoint missing')

# Keep the legacy alias only as compatibility, while exposing a canonical module API.
needle='window.v113OpenGps=openGps'
last=js.rfind(needle)
if last<0: raise SystemExit('GPS final entrypoint not found')
insert='window.RYM_GPS_APP=Object.freeze({open:openGps});\n '
js=js[:last]+insert+js[last:]

APP.parent.mkdir(parents=True,exist_ok=True)
CSS.parent.mkdir(parents=True,exist_ok=True)
APP.write_text('/* Portal RYM V172 clean - GPS application */\n'+js,encoding='utf-8')
CSS.write_text('/* Portal RYM V172 clean - GPS V157 */\n'+css,encoding='utf-8')

for start,end,repl in sorted([(js_start,js_end,SCRIPT_TAG),(css_start,css_end,STYLE_TAG)],reverse=True):
    html=html[:start]+repl+html[end:]
INDEX.write_text(html,encoding='utf-8')

final=INDEX.read_text(encoding='utf-8')
if final.count(SCRIPT_TAG)!=1 or final.count(STYLE_TAG)!=1: raise SystemExit('GPS external source tags are not unique')
if re.search(r'<script\s+id=["\']rym-v157-gps-js["\'][^>]*>\s*\(',final,re.I): raise SystemExit('Inline GPS V157 JS remains')
print('V172 GPS extraction OK')
print('index bytes:',INDEX.stat().st_size)
print('gps app bytes:',APP.stat().st_size)
print('gps css bytes:',CSS.stat().st_size)
