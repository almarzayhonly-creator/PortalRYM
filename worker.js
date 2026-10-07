export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const validatorApp = ["validador","validator","validador-unidad","unit-validator"].includes((url.searchParams.get("app") || "").toLowerCase());
    const response = await env.ASSETS.fetch(request);
    const headers = new Headers(response.headers);
    const contentType = headers.get("content-type") || "";

    if (contentType.includes("text/html")) {
      headers.set("cache-control", "no-store, no-cache, must-revalidate");
      headers.set("x-portal-build", validatorApp ? "unit-validator-tablet-app-v6" : "panapass-dashboard-owner-v12");
      if (validatorApp) headers.set("x-rym-app", "unit-validator-tablet");

      const html = await response.text();
      const staleInline = /<script\b[^>]*\bid=["']rym-dashboard-payments-inline["'][^>]*>[\s\S]*?<\/script\s*>/gi;
      const staleExternal = /<script\b[^>]*\bsrc=["'][^"']*\/modules\/core\/dashboard-payments-enhance\.js(?:\?[^"']*)?["'][^>]*>\s*<\/script\s*>/gi;
      const staleRanking = /<script\b[^>]*\bid=["']rym-ranking-criteria-inline["'][^>]*>[\s\S]*?<\/script\s*>/gi;
      const staleNegLast = /<script\b[^>]*\bsrc=["'][^"']*\/modules\/core\/panapass-negativos-ultima-consulta\.js(?:\?[^"']*)?["'][^>]*>\s*<\/script\s*>/gi;
      const owner = '<script id="rym-dashboard-payments-owner" src="/modules/core/dashboard-payments-enhance.js?v=12" defer></script>';
      const rankingOwner = '<script id="rym-ranking-criteria-owner" src="/modules/core/panapass-ranking-criteria-final.js?v=13" defer></script>';
      const negativosLastOwner = '<script id="rym-negativos-last-query-owner" src="/modules/core/panapass-negativos-ultima-consulta.js?v=1" defer></script>';

      const validatorHead = validatorApp ? `
<script id="rym-unit-validator-route">document.documentElement.classList.add("rym-unit-validator-route");</script>
<style id="rym-unit-validator-route-style">
html.rym-unit-validator-route{background:#f4f7fb}
html.rym-unit-validator-route body{margin:0!important;background:
  radial-gradient(circle at 8% 12%,rgba(83,183,232,.11),transparent 28%),
  radial-gradient(circle at 92% 84%,rgba(244,124,32,.07),transparent 24%),
  #f4f7fb!important;color:#10224e!important}
html.rym-unit-validator-route body .v101-shell{display:block!important;min-height:100dvh!important;width:100%!important;background:transparent!important}
html.rym-unit-validator-route body .v101-side,
html.rym-unit-validator-route body .v101-top,
html.rym-unit-validator-route body #v115MobileNav{display:none!important}
html.rym-unit-validator-route body .v101-main{width:100%!important;min-width:0!important;margin:0!important;padding:0!important;background:transparent!important}
html.rym-unit-validator-route body .v101-content{
  width:min(1120px,100%)!important;min-height:100dvh!important;margin:0 auto!important;
  padding:118px 26px 42px!important;display:flex!important;flex-direction:column!important;
  justify-content:center!important;box-sizing:border-box!important}
html.rym-unit-validator-route body .v101-content>*:not(.v101-validator){display:none!important}
html.rym-unit-validator-route body .v101-validator{
  position:relative!important;width:100%!important;margin:0!important;padding:30px!important;
  border:1px solid #c9d9ed!important;border-radius:26px!important;background:rgba(255,255,255,.99)!important;
  box-shadow:0 28px 70px rgba(13,45,87,.13)!important;overflow:visible!important}
html.rym-unit-validator-route body .v101-validator:before{
  content:"";position:absolute;left:28px;right:28px;top:0;height:4px;border-radius:0 0 99px 99px;
  background:linear-gradient(90deg,#0a1b4d,#244aa5,#53b7e8,#f47c20)}
html.rym-unit-validator-route body .v101-validator-head{
  display:flex!important;align-items:flex-start!important;justify-content:space-between!important;
  gap:20px!important;margin:0 0 22px!important}
html.rym-unit-validator-route body .v101-validator-head h3{
  margin:0!important;color:#0a1b4d!important;font-size:31px!important;line-height:1.05!important;letter-spacing:-.04em!important}
html.rym-unit-validator-route body .v101-validator-head p{
  display:block!important;max-width:720px!important;margin:8px 0 0!important;color:#62708c!important;
  font-size:14px!important;line-height:1.5!important;font-weight:700!important}
html.rym-unit-validator-route body .v101-validator-badge{
  flex:0 0 auto!important;margin:2px 0 0!important;padding:9px 12px!important;border-radius:999px!important;
  background:#eef5ff!important;border:1px solid #c9daf2!important;color:#244aa5!important;font-size:10px!important;font-weight:1000!important}
html.rym-unit-validator-route body .v101-validator-tools{
  display:grid!important;grid-template-columns:minmax(0,1fr) 190px!important;gap:12px!important;align-items:stretch!important}
html.rym-unit-validator-route body .v101-validator-box{position:relative!important;min-width:0!important}
html.rym-unit-validator-route body .v101-validator-input{
  width:100%!important;height:62px!important;margin:0!important;padding:0 18px!important;border:1px solid #b9cae0!important;
  border-radius:17px!important;background:#fff!important;color:#10224e!important;outline:none!important;font-size:18px!important;
  font-weight:800!important;box-shadow:inset 0 1px 0 rgba(10,27,77,.02)!important}
html.rym-unit-validator-route body .v101-validator-input:focus{border-color:#244aa5!important;box-shadow:0 0 0 4px rgba(36,74,165,.10)!important}
html.rym-unit-validator-route body .v101-validator-go{
  width:100%!important;height:62px!important;margin:0!important;padding:0 18px!important;border:0!important;border-radius:17px!important;
  background:linear-gradient(180deg,#2a61bd,#174a9b)!important;color:#fff!important;box-shadow:0 10px 24px rgba(36,74,165,.20)!important;
  font-size:14px!important;font-weight:1000!important}
html.rym-unit-validator-route body .v101-validator-note{
  display:flex!important;align-items:center!important;gap:8px!important;margin-top:15px!important;color:#62708c!important;font-size:12px!important;font-weight:800!important}
html.rym-unit-validator-route body .v101-validator-list{
  top:70px!important;z-index:100400!important;max-height:340px!important;border:1px solid #cfdcee!important;border-radius:17px!important;
  background:#fff!important;box-shadow:0 20px 55px rgba(10,27,77,.20)!important;overflow:auto!important}
html.rym-unit-validator-route body .v101-validator-item{min-height:68px!important;padding:12px 14px!important;gap:14px!important}
html.rym-unit-validator-route body .v101-validator-item b{font-size:15px!important}
html.rym-unit-validator-route body .v101-validator-item small{margin-top:4px!important;font-size:11px!important;line-height:1.35!important}
#rymUnitValidatorAppbar{
  position:fixed;inset:0 0 auto 0;z-index:100300;min-height:78px;padding:12px 22px;display:flex;align-items:center;
  justify-content:space-between;gap:18px;background:rgba(255,255,255,.96);border-bottom:1px solid #d8e3f2;
  box-shadow:0 10px 30px rgba(10,27,77,.07);backdrop-filter:blur(16px)}
#rymUnitValidatorAppbar .brand{display:flex;align-items:center;gap:13px;min-width:0}
#rymUnitValidatorAppbar .mark{width:48px;height:48px;display:grid;place-items:center;border-radius:15px;background:linear-gradient(145deg,#0a1b4d,#244aa5);
  color:#fff;font-size:22px;font-weight:1000;box-shadow:0 9px 24px rgba(36,74,165,.22)}
#rymUnitValidatorAppbar .title b{display:block;color:#0a1b4d;font-size:20px;line-height:1.05;letter-spacing:-.025em}
#rymUnitValidatorAppbar .title span{display:block;margin-top:5px;color:#62708c;font-size:11px;font-weight:800}
#rymUnitValidatorAppbar .actions{display:flex;align-items:center;gap:10px}
#rymUnitValidatorAppbar .online{display:inline-flex;align-items:center;gap:7px;padding:9px 11px;border-radius:999px;background:#f0fdf4;border:1px solid #bde6ca;color:#166534;font-size:11px;font-weight:900}
#rymUnitValidatorAppbar .online:before{content:"";width:8px;height:8px;border-radius:50%;background:#22c55e}
#rymUnitValidatorAppbar .exit{min-height:46px;margin:0;padding:0 16px;border:1px solid #f4c6c6;border-radius:13px;background:#fff7f7;color:#b42318;box-shadow:none;font-size:12px;font-weight:1000}
html.rym-unit-validator-route body #v101OpenModule{display:none!important}
html.rym-unit-validator-route body .v117-check-actions{justify-content:flex-end!important}
html.rym-unit-validator-route body .v101-check-modal,
html.rym-unit-validator-route body .v117-check-modal{z-index:100500!important;padding:18px!important;align-items:center!important;background:rgba(5,18,52,.62)!important;backdrop-filter:blur(7px)!important}
html.rym-unit-validator-route body .v101-check-card,
html.rym-unit-validator-route body .v117-check-card{width:min(1120px,96vw)!important;max-width:1120px!important;max-height:92dvh!important;margin:auto!important;padding:22px!important;border-radius:25px!important;overflow:auto!important}
@media(max-width:900px){
  html.rym-unit-validator-route body .v101-content{padding:102px 16px 26px!important;justify-content:flex-start!important}
  html.rym-unit-validator-route body .v101-validator{padding:22px!important;border-radius:22px!important}
  html.rym-unit-validator-route body .v101-validator-tools{grid-template-columns:minmax(0,1fr) 160px!important}
  html.rym-unit-validator-route body .v101-validator-input,
  html.rym-unit-validator-route body .v101-validator-go{height:58px!important}
}
@media(max-width:650px){
  #rymUnitValidatorAppbar{min-height:68px;padding:9px 12px}
  #rymUnitValidatorAppbar .title span,#rymUnitValidatorAppbar .online{display:none}
  html.rym-unit-validator-route body .v101-content{padding:86px 10px 18px!important}
  html.rym-unit-validator-route body .v101-validator{padding:17px!important}
  html.rym-unit-validator-route body .v101-validator-head h3{font-size:23px!important}
  html.rym-unit-validator-route body .v101-validator-badge{display:none!important}
  html.rym-unit-validator-route body .v101-validator-tools{grid-template-columns:1fr!important}
}
</style>` : "";

      const validatorInline = validatorApp ? `
<script id="rym-unit-validator-inline">
(function(w,d){
  if(w.__RYM_UNIT_VALIDATOR_INLINE__)return;
  w.__RYM_UNIT_VALIDATOR_INLINE__=true;
  var wrapped=false,observer=null;

  function getState(){try{return typeof state!=="undefined"?state:null}catch(_){return null}}
  function logout(){
    try{if(typeof clearSession==="function")clearSession()}catch(_){}
    try{if(typeof loginView==="function")loginView();else location.reload()}catch(_){location.reload()}
  }
  function appbar(){
    var p=(getState()&&getState().profile)||{};
    var bar=d.getElementById("rymUnitValidatorAppbar");
    if(!bar){
      bar=d.createElement("header");bar.id="rymUnitValidatorAppbar";
      bar.innerHTML='<div class="brand"><div class="mark">R</div><div class="title"><b>Validador de Unidad</b><span id="rymUnitValidatorUser">Portal RYM</span></div></div><div class="actions"><span class="online">Conectado</span><button type="button" class="exit" id="rymUnitValidatorExit">Salir</button></div>';
      d.body.appendChild(bar);
      d.getElementById("rymUnitValidatorExit").onclick=logout;
    }
    var label=d.getElementById("rymUnitValidatorUser");
    if(label)label.textContent=(p.nombre||p.email||"Usuario")+" · Portal RYM";
  }
  function lockModal(){
    var b=d.getElementById("v101OpenModule");
    if(b){b.style.display="none";b.disabled=true;b.onclick=null}
  }
  function activate(){
    var validator=d.querySelector(".v101-validator"),q=d.getElementById("v101ValidatorQ"),go=d.getElementById("v101ValidatorGo");
    if(!validator||!q||!go)return false;
    d.documentElement.classList.add("rym-unit-validator-ready");
    appbar();lockModal();
    q.setAttribute("inputmode","search");q.setAttribute("enterkeyhint","search");q.setAttribute("autocomplete","off");
    q.setAttribute("aria-label","Buscar unidad, empresa, placa o Panapass");
    go.setAttribute("aria-label","Validar unidad");
    requestAnimationFrame(function(){try{q.focus({preventScroll:true})}catch(_){}});
    return true;
  }
  function watchUntilReady(){
    if(activate())return;
    if(observer)return;
    observer=new MutationObserver(function(){
      if(activate()){observer.disconnect();observer=null}
    });
    observer.observe(d.body||d.documentElement,{childList:true,subtree:true});
    setTimeout(function(){if(observer){observer.disconnect();observer=null;activate()}},12000);
  }
  function wrapHome(){
    if(wrapped)return true;
    var base=w.v36PortalHome;
    if(typeof base!=="function")return false;
    w.v36PortalHome=async function(){
      var result=await base.apply(this,arguments);
      watchUntilReady();
      return result;
    };
    try{v36PortalHome=w.v36PortalHome}catch(_){}
    wrapped=true;
    return true;
  }
  function boot(attempt){
    if(!wrapHome()){if(attempt<40)setTimeout(function(){boot(attempt+1)},100);return}
    watchUntilReady();
    if(getState()&&getState().profile&&!d.querySelector(".v101-validator")){
      setTimeout(function(){try{w.v36PortalHome()}catch(_){}},0);
    }
  }
  d.addEventListener("click",function(){setTimeout(lockModal,0)},true);
  if(d.readyState==="loading")d.addEventListener("DOMContentLoaded",function(){boot(0)},{once:true});else boot(0);
})(window,document);
</script>` : "";

      let body = html.replace(staleInline, "").replace(staleExternal, "").replace(staleRanking, "").replace(staleNegLast, "");
      if (validatorApp) {
        const headEnd = body.toLowerCase().lastIndexOf("</head>");
        body = headEnd >= 0 ? body.slice(0, headEnd) + validatorHead + body.slice(headEnd) : validatorHead + body;
      }
      const bodyEnd = body.toLowerCase().lastIndexOf("</body>");
      body = bodyEnd >= 0
        ? body.slice(0, bodyEnd) + owner + rankingOwner + negativosLastOwner + validatorInline + body.slice(bodyEnd)
        : body + owner + rankingOwner + negativosLastOwner + validatorInline;

      return new Response(body, {
        status: response.status,
        statusText: response.statusText,
        headers,
      });
    }

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  },
};
