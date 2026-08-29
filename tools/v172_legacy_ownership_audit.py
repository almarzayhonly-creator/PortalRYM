#!/usr/bin/env python3
from pathlib import Path
import json,re

ROOT=Path(__file__).resolve().parents[1]
INDEX=ROOT/'index.html'
OUT=ROOT/'docs/arquitectura/V172_LEGACY_OWNERSHIP.json'
html=INDEX.read_text(encoding='utf-8')
TARGETS=[
 'ranking','recurrentes','dashboard','shell','render',
 'v70OpenPanapass','v36PortalHome','v70OpenUsers','v70OpenControl',
 'v60OpenRevisados','v113OpenGps','pagosTrabajo','pagosConsultaHoy',
 'historial','operaciones','reportes'
]
VERSION_IDS=('v92','v93','v99','v123','v124','v154','v155')
rows=[]
for idx,m in enumerate(re.finditer(r'<script(?P<attrs>[^>]*)>(?P<body>.*?)</script>',html,re.S|re.I),1):
    attrs=m.group('attrs'); body=m.group('body')
    im=re.search(r'\bid=["\']([^"\']+)',attrs,re.I)
    sid=im.group(1) if im else None
    if not sid or not any(v in sid.lower() for v in VERSION_IDS):
        continue
    owners=[]
    for name in TARGETS:
        pats=[
          rf'\b{name}\s*=\s*(?:async\s*)?function\b',
          rf'\bwindow\.{name}\s*=\s*(?:async\s*)?function\b',
          rf'\bfunction\s+{name}\s*\(',
          rf'\bconst\s+_[A-Za-z0-9_]*{name}[A-Za-z0-9_]*\s*=\s*{name}\b'
        ]
        matches=sum(len(re.findall(p,body,re.I)) for p in pats)
        if matches:
            owners.append({'name':name,'matches':matches})
    rows.append({
      'script':idx,'id':sid,'bytes':len(body.encode()),
      'owners':owners,
      'references':{name:len(re.findall(rf'\b{re.escape(name)}\b',body)) for name in TARGETS if re.search(rf'\b{re.escape(name)}\b',body)},
      'start':m.start(),'end':m.end()
    })
styles=[]
for idx,m in enumerate(re.finditer(r'<style(?P<attrs>[^>]*)>(?P<body>.*?)</style>',html,re.S|re.I),1):
    attrs=m.group('attrs'); body=m.group('body')
    im=re.search(r'\bid=["\']([^"\']+)',attrs,re.I)
    sid=im.group(1) if im else None
    if sid and any(v in sid.lower() for v in VERSION_IDS):
        styles.append({'style':idx,'id':sid,'bytes':len(body.encode()),'start':m.start(),'end':m.end()})
report={'index_bytes':len(html.encode()),'scripts':rows,'styles':styles}
OUT.parent.mkdir(parents=True,exist_ok=True)
OUT.write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(report,ensure_ascii=False,indent=2))
# audit trigger: 2026-08-28
