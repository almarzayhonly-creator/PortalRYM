(() => {
  'use strict';
  const app=window.RYM173;if(!app)throw new Error('V173 bootstrap missing');
  const api=()=>app.registry.get('api'),core=()=>app.registry.get('core'),perms=()=>app.registry.get('permissions');

  function apply(profile,codes){
    if(!profile?.activo)throw new Error('Tu usuario no esta habilitado.');
    const permissions=perms().projects(codes,profile.rol);
    core().setSession({user:profile,role:profile.rol,galera:profile.galera||null,permissions});
    return Object.freeze({profile,modules:Object.freeze([...(codes||[])]),permissions});
  }

  async function login(usuario,password){
    const data=await api().fn('auth-username',{usuario,password});
    if(!data?.ok||!data.access_token)throw new Error(data?.error||'No se pudo iniciar sesion.');
    api().setTokens(data);
    if(data.profile&&Array.isArray(data.modules))return apply(data.profile,data.modules);
    return load();
  }

  async function load(){
    const me=await api().request('/auth/v1/user');
    const rows=await api().rest('perfiles_usuario','select=id,nombre,email,usuario,rol,activo,supervisora_id,must_change_password&id=eq.'+encodeURIComponent(me.id));
    const profile=rows?.[0];if(!profile?.activo)throw new Error('Tu usuario no esta habilitado.');
    const [base,overrides]=await Promise.all([
      api().rest('rol_modulo_permisos','select=modulo_codigo,puede_ver&rol=eq.'+encodeURIComponent(String(profile.rol).toUpperCase())+'&puede_ver=eq.true'),
      api().rest('usuario_permisos','select=modulo_codigo,puede_ver&user_id=eq.'+encodeURIComponent(me.id))
    ]);
    const map=new Map((base||[]).map(x=>[String(x.modulo_codigo),true]));
    for(const o of overrides||[]){if(o.puede_ver===true)map.set(String(o.modulo_codigo),true);if(o.puede_ver===false)map.delete(String(o.modulo_codigo));}
    return apply(profile,[...map.keys()]);
  }

  function logout(){api().clear();core().setSession({});}
  app.register('auth',{login,load,logout});
})();
