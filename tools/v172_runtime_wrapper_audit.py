#!/usr/bin/env python3
from pathlib import Path
import re,json
AUDIT_VERSION='1.0'
root=Path(__file__).resolve().parents[1]
patterns={
 'saved_previous':re.compile(r'\b(?:const|let|var)\s+([A-Za-z_$][\w$]*(?:old|previous|base)[\w$]*)\s*=\s*([A-Za-z_$][\w$]*)',re.I),
 'window_reassign':re.compile(r'\bwindow\.([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?function\b'),
 'function_reassign':re.compile(r'(?m)^\s*([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?function\b')
}
rows=[]
for p in sorted((root/'modules').glob('*/runtime/*.js')):
    s=p.read_text(encoding='utf-8')
    hits={k:len(v.findall(s)) for k,v in patterns.items()}
    if sum(hits.values()):
        rows.append({'path':str(p.relative_to(root)),'bytes':len(s.encode()),**hits})
report={'audit_version':AUDIT_VERSION,'files_with_wrapper_signals':len(rows),'wrapper_signal_total':sum(sum(r[k] for k in patterns) for r in rows),'files':rows}
out=root/'docs/arquitectura/V172_RUNTIME_WRAPPERS.json';out.parent.mkdir(parents=True,exist_ok=True);out.write_text(json.dumps(report,indent=2),encoding='utf-8')
print(json.dumps(report,indent=2))
