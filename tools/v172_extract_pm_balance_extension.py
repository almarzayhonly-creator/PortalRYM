#!/usr/bin/env python3
from pathlib import Path
MIGRATION_VERSION='1.0'
root=Path(__file__).resolve().parents[1]
src=root/'modules/panapass/runtime/034-rym-v74-responsive-pm-behavior-3578d7fc.js'
idx=root/'index.html'
s=src.read_text(encoding='utf-8')
s=s.replace("(function(){\n  const previousPagosTrabajo=pagosTrabajo;\n  const wait=ms=>new Promise(r=>setTimeout(r,ms));\n  pagosTrabajo=async function(v){\n    await previousPagosTrabajo(v);", "(function(){\n  const wait=ms=>new Promise(r=>setTimeout(r,ms));\n  (window.__RYM_PANAPASS_PENDING_AFTER__ ||= []).push(['cargar_pagos',async function(ctx){\n    const v=ctx.view;")
s=s.replace(";await pagosTrabajo(v);const msg2=", ";await ctx.router.open('cargar_pagos');const msg2=")
s=s.replace("\n  };\n})();\n", "\n  }]);\n})();\n")
if 'previousPagosTrabajo' in s or 'pagosTrabajo=async function' in s: raise SystemExit('PM wrapper conversion incomplete')
out=root/'modules/panapass/pm-balance-validator.js';out.write_text(s,encoding='utf-8')
h=idx.read_text(encoding='utf-8')
old='/modules/panapass/runtime/034-rym-v74-responsive-pm-behavior-3578d7fc.js?v=172-clean'
if old not in h: raise SystemExit('PM source reference missing')
h=h.replace(old,'/modules/panapass/pm-balance-validator.js?v=172-clean',1);idx.write_text(h,encoding='utf-8')
src.unlink()
print('PM balance validator moved to Panapass after-hook',MIGRATION_VERSION)
