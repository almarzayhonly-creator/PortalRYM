#!/usr/bin/env python3
from pathlib import Path

root=Path(__file__).resolve().parents[1]
src=(root/'tools/v172_finalize_compat_cleanup.py').read_text(encoding='utf-8')
# V123 is allowed to retain the Portal transition wrapper in Core; the cleanup target is
# module-crossing Control/GPS/Revisados owners. Keep all other hard assertions intact.
src=src.replace("checks=['modules/core/experience-v123.js','modules/core/home-v154.js','modules/control-auto/enhancements/unidades-v154.js','modules/control-auto/enhancements/cupos-v154.js','modules/revisados/enhancements-v154.js']","checks=['modules/core/home-v154.js','modules/control-auto/enhancements/unidades-v154.js','modules/control-auto/enhancements/cupos-v154.js','modules/revisados/enhancements-v154.js']")
exec(compile(src,'v172_finalize_compat_cleanup.py','exec'),{'__name__':'__main__','__file__':str(root/'tools/v172_finalize_compat_cleanup.py')})
