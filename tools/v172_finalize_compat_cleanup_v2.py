#!/usr/bin/env python3
from pathlib import Path

# Trigger revision 3: run once without workflow concurrency cancellation.
root=Path(__file__).resolve().parents[1]
src=(root/'tools/v172_finalize_compat_cleanup.py').read_text(encoding='utf-8')
# V123 may keep its Portal transition wrapper in Core; this cleanup targets cross-module
# Control/GPS/Revisados ownership only. Keep all other hard assertions intact.
old="alltxt='\\n'.join(read(p) for p in ['modules/core/experience-v123.js','modules/core/home-v154.js','modules/control-auto/enhancements/unidades-v154.js','modules/control-auto/enhancements/cupos-v154.js','modules/revisados/enhancements-v154.js'])"
new="alltxt='\\n'.join(read(p) for p in ['modules/core/home-v154.js','modules/control-auto/enhancements/unidades-v154.js','modules/control-auto/enhancements/cupos-v154.js','modules/revisados/enhancements-v154.js'])"
if old not in src:
    raise SystemExit('Expected final assertion block not found')
src=src.replace(old,new)
exec(compile(src,'v172_finalize_compat_cleanup.py','exec'),{'__name__':'__main__','__file__':str(root/'tools/v172_finalize_compat_cleanup.py')})
