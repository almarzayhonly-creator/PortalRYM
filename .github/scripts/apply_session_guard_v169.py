from pathlib import Path

p = Path('index.html')
s = p.read_text(encoding='utf-8')

old_refresh = "if(!r.ok||!d?.access_token){clearSession();throw Error('Tu sesión expiró. Ingresa nuevamente.')}"
new_refresh = "if(!r.ok||!d?.access_token){clearSession();if(typeof loginView==='function')loginView('Tu sesión expiró. Ingresa nuevamente.');throw Error('Tu sesión expiró. Ingresa nuevamente.')}"
if old_refresh in s:
    s = s.replace(old_refresh, new_refresh)

old_terminal = "if(r.status===401&&/invalid jwt|jwt expired|token.*expired|expired.*token/i.test(m)){clearSession();throw Error('Tu sesión expiró. Ingresa nuevamente.')}"
new_terminal = "if(r.status===401&&/invalid jwt|jwt expired|token.*expired|expired.*token/i.test(m)){clearSession();if(typeof loginView==='function')loginView('Tu sesión expiró. Ingresa nuevamente.');throw Error('Tu sesión expiró. Ingresa nuevamente.')}"
if old_terminal in s:
    s = s.replace(old_terminal, new_terminal)

marker = 'id="v169-session-expiry-guard"'
if marker not in s:
    guard = r'''
<script id="v169-session-expiry-guard">
(function(){
  'use strict';
  if(window.__RYM_V169_SESSION_GUARD__)return;
  window.__RYM_V169_SESSION_GUARD__=true;
  let checking=false;
  const expiredMessage='Tu sesión expiró. Ingresa nuevamente.';
  function showExpired(){
    try{if(typeof clearSession==='function')clearSession()}catch(_){}
    try{if(typeof loginView==='function')loginView(expiredMessage)}catch(_){}
  }
  async function checkSession(){
    if(checking)return;
    try{
      if(typeof state==='undefined'||!state||!state.refreshToken||!state.expiresAt)return;
      const now=Math.floor(Date.now()/1000);
      if(now<Number(state.expiresAt)-90)return;
      checking=true;
      try{
        if(typeof refreshSessionToken!=='function')return;
        await refreshSessionToken();
      }catch(e){
        const msg=String(e&&e.message||e||'');
        if(/sesión expir|session expir|invalid jwt|jwt expired|refresh_token/i.test(msg))showExpired();
      }finally{checking=false}
    }catch(_){checking=false}
  }
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)checkSession()});
  window.addEventListener('focus',checkSession);
  window.addEventListener('pageshow',checkSession);
  window.addEventListener('unhandledrejection',e=>{
    const msg=String(e&&e.reason&&e.reason.message||e&&e.reason||'');
    if(/sesión expir|session expir|invalid jwt|jwt expired|refresh_token/i.test(msg))showExpired();
  });
  setInterval(checkSession,45000);
})();
</script>
'''
    body_end = s.rfind('</body>')
    if body_end < 0:
        raise SystemExit('body end marker missing')
    s = s[:body_end] + guard + '\n' + s[body_end:]

if new_refresh not in s:
    raise SystemExit('refresh expiry redirect patch missing')
if new_terminal not in s:
    raise SystemExit('terminal 401 redirect patch missing')
if marker not in s:
    raise SystemExit('session guard missing')

p.write_text(s, encoding='utf-8')
