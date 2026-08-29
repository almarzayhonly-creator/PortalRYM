#!/usr/bin/env python3
from pathlib import Path
import json,re

root=Path(__file__).resolve().parents[1]
idx=root/'index.html'
html=idx.read_text(encoding='utf-8')

WRAP_PATTERNS=[
    r'\b(?:const|let|var)\s+\w*(?:old|previous|base)\w*\s*=\s*\w+',
    r'\bwindow\.\w+\s*=\s*(?:async\s*)?function\b',
    r'\b\w+\s*=\s*(?:async\s*)?function\b',
]

def classify(text, ident=''):
    s=(ident+' '+text[:8000]).lower()
    scores={
      'panapass':sum(s.count(k) for k in ['panapass','pagos','negativos','ranking','recurrent','ena','cobra','recorrido']),
      'revisados':sum(s.count(k) for k in ['revisados','ecarcheck','revisado','cupos attt']),
      'control-auto':sum(s.count(k) for k in ['control-auto','control de auto','control_auto','ca6','ca7','v75control','v11unit']),
      'gps':sum(s.count(k) for k in ['gps','geotab','rastreo']),
      'usuarios':sum(s.count(k) for k in ['usuarios','admin-user','user activity','actividad usuario']),
      'core':sum(s.count(k) for k in ['portal','login','session','shell','sidebar','router','modal-safety'])
    }
    best=max(scores,key=scores.get)
    return best if scores[best]>0 else 'core'

styles=[]
for i,m in enumerate(re.finditer(r'<style(?P<attrs>[^>]*)>(?P<body>.*?)</style>',html,re.S|re.I),1):
    attrs=m.group('attrs');body=m.group('body')
    im=re.search(r'\bid=["\']([^"\']+)',attrs,re.I); sid=im.group(1) if im else f'inline-style-{i}'
    styles.append({'n':i,'id':sid,'bytes':len(body.encode()),'domain':classify(body,sid),'start':m.start(),'end':m.end()})

scripts=[]
for i,m in enumerate(re.finditer(r'<script(?P<attrs>[^>]*)>(?P<body>.*?)</script>',html,re.S|re.I),1):
    attrs=m.group('attrs');body=m.group('body')
    if re.search(r'\bsrc\s*=',attrs,re.I):
        continue
    im=re.search(r'\bid=["\']([^"\']+)',attrs,re.I); sid=im.group(1) if im else f'inline-script-{i}'
    wrappers=[]
    for p in WRAP_PATTERNS:
        hits=re.findall(p,body,re.I)
        if hits: wrappers.extend(hits[:20])
    scripts.append({'n':i,'id':sid,'bytes':len(body.encode()),'domain':classify(body,sid),'wrapper_hits':len(wrappers),'wrapper_samples':wrappers[:8],'start':m.start(),'end':m.end()})

report={
  'index_bytes':len(html.encode()),
  'inline_style_count':len(styles),
  'inline_style_bytes':sum(x['bytes'] for x in styles),
  'inline_script_count':len(scripts),
  'inline_script_bytes':sum(x['bytes'] for x in scripts),
  'wrapper_hit_total':sum(x['wrapper_hits'] for x in scripts),
  'styles':styles,
  'scripts':scripts,
}
out=root/'docs/arquitectura/V172_ZERO_INLINE_AUDIT.json'
out.parent.mkdir(parents=True,exist_ok=True)
out.write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({k:report[k] for k in ['index_bytes','inline_style_count','inline_style_bytes','inline_script_count','inline_script_bytes','wrapper_hit_total']},indent=2))
for x in styles: print('STYLE',x['domain'],x['bytes'],x['id'])
for x in scripts: print('SCRIPT',x['domain'],x['bytes'],x['wrapper_hits'],x['id'])
