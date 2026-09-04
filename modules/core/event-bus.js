/* Portal RYM Architecture V2 - Event Bus */
(function(w){
  'use strict';
  if(w.RYM_EVENTS) return;

  const listeners = new Map();

  function on(name, handler){
    if(typeof handler !== 'function') throw new Error('Event handler invalido');
    const key = String(name || '');
    if(!key) throw new Error('Event name invalido');
    if(!listeners.has(key)) listeners.set(key, new Set());
    listeners.get(key).add(handler);
    return function off(){
      const set = listeners.get(key);
      if(!set) return;
      set.delete(handler);
      if(!set.size) listeners.delete(key);
    };
  }

  function emit(name, payload){
    const set = listeners.get(String(name || ''));
    if(!set) return 0;
    [...set].forEach(fn => {
      try { fn(payload); }
      catch (err) { setTimeout(() => { throw err; }, 0); }
    });
    return set.size;
  }

  function clear(name){
    if(typeof name === 'undefined') listeners.clear();
    else listeners.delete(String(name));
  }

  w.RYM_EVENTS = Object.freeze({on, emit, clear});
})(window);
