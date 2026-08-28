from pathlib import Path

p = Path('index.html')
s = p.read_text(encoding='utf-8')
marker = '<script src="./v169-final-polish.js?v=169final" defer></script>'
if marker not in s:
    head = '</head>'
    if head not in s:
        raise SystemExit('head close marker missing')
    s = s.replace(head, marker + '\n' + head, 1)
p.write_text(s, encoding='utf-8')
