#!/usr/bin/env python3
from pathlib import Path
import json,re

root=Path(__file__).resolve().parents[1]
html=(root/'index.html').read_text(encoding='utf-8')
patterns=('ranking','recurrentes','dashboard','negativos','pagosTrabajo','pagosConsultaHoy','historial','operaciones','reportes','recorrido','bajas_panapass','v70OpenPanapass','shell=function','render=async')
rows=[]
for i,m in enumerate(re.finditer(r'<script(?P<attrs>[^>]*)>(?P<body>.*?)</script>',html,re.S|re.I),1):
    attrs,body=m.group('attrs'),m.group('body')
    im=re.search(r'\bid=["\']([^"\']+)',attrs,re.I)
    hits={p:body.count(p) for p in patterns if p in body}
    if hits:
        rows.append({'script':i,'id':im.group(1) if im else None,'bytes':len(body.encode()),'hits':hits,'start':m.start(),'end':m.end()})
styles=[]
for i,m in enumerate(re.finditer(r'<style(?P<attrs>[^>]*)>(?P<body>.*?)</style>',html,re.S|re.I),1):
    attrs,body=m.group('attrs'),m.group('body')
    im=re.search(r'\bid=["\']([^"\']+)',attrs,re.I)
    if any(x in body for x in ('rank','recurrent','bajas','panapass','v117','v93','v92','v87')):
        styles.append({'style':i,'id':im.group(1) if im else None,'bytes':len(body.encode()),'start':m.start(),'end':m.end()})
report={'index_bytes':len(html.encode()),'scripts':rows,'styles':styles}
out=root/'docs/arquitectura/V172_PANAPASS_INVENTORY.json'
out.write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(report,ensure_ascii=False,indent=2))
