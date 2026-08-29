#!/usr/bin/env python3
from pathlib import Path
import re,json
AUDIT_VERSION='1.3'
root=Path(__file__).resolve().parents[1]
patterns={
 'saved_previous':re.compile(r'\b(?:const|let|var)\s+([A-Za-z_$][\w$]*(?:old|previous|base)[\w$]*)\s*=\s*(?:window\.)?([A-Za-z_$][\w$]*)',re.I),
 'window_reassign':re.compile(r'\bwindow\.([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?function\b'),
 'function_reassign':re.compile(r'(?m)^\s*([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?function\b')
}
rows=[]
for p in sorted((root/'modules').glob('*/runtime/*.js')):
    s=p.read_text(encoding='utf-8')
    saved=[{'alias':a,'target':b} for a,b in patterns['saved_previous'].findall(s)]
    win=patterns['window_reassign'].findall(s)
    direct=patterns['function_reassign'].findall(s)
    if saved or win or direct:
        rows.append({'path':str(p.relative_to(root)),'bytes':len(s.encode()),'saved_previous':saved,'window_reassign':win,'function_reassign':direct})
report={'audit_version':AUDIT_VERSION,'files_with_wrapper_signals':len(rows),'wrapper_signal_total':sum(len(r['saved_previous'])+len(r['window_reassign'])+len(r['function_reassign']) for r in rows),'files':rows}
out=root/'docs/arquitectura/V172_RUNTIME_WRAPPERS.json';out.parent.mkdir(parents=True,exist_ok=True);out.write_text(json.dumps(report,indent=2),encoding='utf-8')
print(json.dumps(report,indent=2))
