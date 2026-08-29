#!/usr/bin/env python3
from pathlib import Path

# trigger: final session wiring
root=Path(__file__).resolve().parents[1]
p=root/'modules/core/runtime.js'
s=p.read_text(encoding='utf-8')

old="function clearSession(){state.sessionVersion=Number(state.sessionVersion||0)+1;state.token='';state.refreshToken='';state.expiresAt=0;authRefreshPromise=null;resetUserRuntime()}"
new="function clearSession(){state.sessionVersion=Number(state.sessionVersion||0)+1;state.token='';state.refreshToken='';state.expiresAt=0;authRefreshPromise=null;try{window.RYM_SESSION?.clear()}catch(_){}resetUserRuntime()}"
if old not in s: raise SystemExit('clearSession marker missing')
s=s.replace(old,new,1)

old="async function refreshSessionToken(){\n  if(!state.refreshToken)throw Error('Tu sesión expiró. Ingresa nuevamente.');"
new="async function refreshSessionToken(){\n  if(window.RYM_SESSION){\n    try{window.RYM_SESSION.configure({url:URL,apikey:KEY});window.RYM_SESSION.syncLegacy(state);const snap=await window.RYM_SESSION.refresh();state.token=snap.accessToken;state.refreshToken=snap.refreshToken;state.expiresAt=snap.expiresAt;return state.token}catch(e){if(String(e?.message||e)==='SESSION_CHANGED')throw Error('La sesión cambió.');if(String(e?.message||e)==='SESSION_EXPIRED'){clearSession();throw Error('Tu sesión expiró. Ingresa nuevamente.')}}\n  }\n  if(!state.refreshToken)throw Error('Tu sesión expiró. Ingresa nuevamente.');"
if old not in s: raise SystemExit('refreshSessionToken marker missing')
s=s.replace(old,new,1)

old="const nextToken=data.access_token,nextRefresh=String(data.refresh_token||''),nextExpires=Number(data.expires_at||0)||0;clearSession();state.token=nextToken;state.refreshToken=nextRefresh;state.expiresAt=nextExpires;"
new="const nextToken=data.access_token,nextRefresh=String(data.refresh_token||''),nextExpires=Number(data.expires_at||0)||0;clearSession();state.token=nextToken;state.refreshToken=nextRefresh;state.expiresAt=nextExpires;try{window.RYM_SESSION?.configure({url:URL,apikey:KEY});window.RYM_SESSION?.set({accessToken:nextToken,refreshToken:nextRefresh,expiresAt:nextExpires});window.RYM_SESSION?.startActivityRenewal()}catch(_){}"
if old not in s: raise SystemExit('login token marker missing')
s=s.replace(old,new,1)

old="loginView();\n\n\n/* ===== V10 OVERRIDES ===== */"
new="(async function bootstrapSession(){\n  const wait=()=>new Promise(r=>setTimeout(r,25));\n  for(let i=0;i<120&&!window.RYM_SESSION;i++)await wait();\n  if(!window.RYM_SESSION){loginView();return}\n  try{\n    window.RYM_SESSION.configure({url:URL,apikey:KEY});\n    const snap=window.RYM_SESSION.restore();\n    window.RYM_SESSION.startActivityRenewal();\n    if(!snap.refreshToken&&!snap.accessToken){loginView();return}\n    state.token=snap.accessToken;state.refreshToken=snap.refreshToken;state.expiresAt=snap.expiresAt;\n    if(window.RYM_SESSION.isExpiringSoon(90)){const fresh=await window.RYM_SESSION.refresh();state.token=fresh.accessToken;state.refreshToken=fresh.refreshToken;state.expiresAt=fresh.expiresAt}\n    await loadApp();\n  }catch(_){clearSession();loginView()}\n})();\n\n\n/* ===== V10 OVERRIDES ===== */"
if old not in s: raise SystemExit('bootstrap marker missing')
s=s.replace(old,new,1)

p.write_text(s,encoding='utf-8')
print('wired runtime session persistence')
