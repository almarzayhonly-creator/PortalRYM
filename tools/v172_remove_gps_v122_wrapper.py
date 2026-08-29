#!/usr/bin/env python3
from pathlib import Path
root=Path(__file__).resolve().parents[1]
idx=root/'index.html';s=idx.read_text(encoding='utf-8')
old='/modules/gps/runtime/056-rym-v122-readability-history-js-c58b9eb0.js?v=172-clean'
new='/modules/gps/readability.js?v=172-clean'
if old not in s: raise SystemExit('GPS V122 index reference missing')
s=s.replace(old,new,1);idx.write_text(s,encoding='utf-8')
p=root/'modules/gps/runtime/056-rym-v122-readability-history-js-c58b9eb0.js'
if p.exists():p.unlink()
print('retired GPS V122 draw/open wrappers; kept readability helper')
