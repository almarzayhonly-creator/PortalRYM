
(() => {
  if (window.__RYM_ECARCHECK_MAIN_V020__) return;
  window.__RYM_ECARCHECK_MAIN_V020__ = true;

  function findRscObject(value, predicate, seen = new Set()) {
    if (!value || typeof value !== "object" || seen.has(value)) return null;
    seen.add(value);
    if (predicate(value)) return value;
    for (const child of Array.isArray(value) ? value : Object.values(value)) {
      const found = findRscObject(child, predicate, seen);
      if (found) return found;
    }
    return null;
  }

  function parseRscObject(text, predicate) {
    const lines = String(text || "").split("\n");
    for (const line of lines) {
      const i = line.indexOf(":");
      if (i < 0) continue;
      const raw = line.slice(i + 1).trim();
      if (!raw || (raw[0] !== "{" && raw[0] !== "[")) continue;
      try {
        const obj = JSON.parse(raw);
        const found = findRscObject(obj, predicate);
        if (found) return found;
      } catch {}
    }
    return null;
  }

  function looksLikeLogin(text) {
    const s = String(text || "");
    return s.includes('"login"') &&
      (s.includes("AuthProvider") || s.includes("serverProvidedParams") || s.includes("Verifique que es un ser humano"));
  }

  async function callAction(actionId, args) {
    const r = await fetch("/dashboard/revisados/nuevo", {
      method: "POST",
      credentials: "include",
      headers: {
        "Accept": "text/x-component",
        "Content-Type": "text/plain;charset=UTF-8",
        "next-action": actionId
      },
      body: JSON.stringify(args)
    });
    const text = await r.text();
    if (looksLikeLogin(text)) {
      const e = new Error("SESION_REQUERIDA");
      e.code = "SESION_REQUERIDA";
      throw e;
    }
    if (!r.ok) {
      const e = new Error(`ECARCHECK_HTTP_${r.status}`);
      e.code = "ECARCHECK_HTTP";
      throw e;
    }
    return text;
  }


  function panamaYmd(offsetDays = 0) {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone:"America/Panama", year:"numeric", month:"2-digit", day:"2-digit"
    }).formatToParts(new Date()).reduce((out, part) => ({...out, [part.type]:part.value}), {});
    const date = new Date(`${parts.year}-${parts.month}-${parts.day}T12:00:00-05:00`);
    date.setUTCDate(date.getUTCDate() + offsetDays);
    return date.toISOString().slice(0,10);
  }

  function panamaMonthStartYmd() {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone:"America/Panama", year:"numeric", month:"2-digit"
    }).formatToParts(new Date()).reduce((out, part) => ({...out, [part.type]:part.value}), {});
    return `${parts.year}-${parts.month}-01`;
  }

  async function queryListPage(page, startDate, endDate) {
    const params = new URLSearchParams({
      status:"APROBADO", page:String(page), startDate, endDate,
      _rsc:Math.random().toString(36).slice(2,9)
    });
    const r = await fetch(`/dashboard/revisados?${params}`, {
      method: "GET",
      credentials: "include",
      headers: {"Accept": "text/x-component", "RSC":"1"},
      cache: "no-store"
    });
    const text = await r.text();
    if (looksLikeLogin(text)) {
      const e = new Error("SESION_REQUERIDA"); e.code = "SESION_REQUERIDA"; throw e;
    }
    if (!r.ok) { const e = new Error(`ECARCHECK_HTTP_${r.status}`); e.code = "ECARCHECK_HTTP"; throw e; }
    const payload = parseRscObject(text, obj => obj && typeof obj === "object" && Array.isArray(obj.data) && obj.pagination && typeof obj.pagination === "object");
    if (!payload) { const e = new Error("RESPUESTA_LISTADO_INVALIDA"); e.code = "API_CAMBIO"; throw e; }
    return payload;
  }

  async function queryList() {
    // eCarCheck filters by date.  Re-read the current month so a revisado
    // issued earlier this month is not missed; the server deduplicates by
    // inspectionId and only queues records it has never imported.
    const startDate = panamaMonthStartYmd(), endDate = panamaYmd(0);
    const maxRecords = 100; // Operational ceiling: never fan out an unlimited monthly listing in one run.
    const first = await queryListPage(1, startDate, endDate);
    const totalPages = Math.min(Math.max(1, Number(first.pagination?.totalPages) || 1), 100);
    const rows = [], known = new Set();
    const append = payload => {
      for (const row of Array.isArray(payload?.data) ? payload.data : []) {
        const id = Number(row?.inspectionId);
        if (!Number.isFinite(id) || known.has(id)) continue;
        if (rows.length >= maxRecords) return;
        known.add(id); rows.push(row);
      }
    };
    append(first);
    for (let page = 2; page <= totalPages && rows.length < maxRecords; page++) append(await queryListPage(page, startDate, endDate));
    return {
      data: rows,
      pagination: {...first.pagination, currentPage:1, totalPages, totalRecords:rows.length},
      range:{startDate,endDate,maxRecords,truncated:rows.length>=maxRecords}
    };
  }

  async function query(payload) {
    const {placa, garageId, actionVehicleId, actionBoletasId} = payload;
    const boletasText = await callAction(actionBoletasId, [placa]);
    const bw = parseRscObject(boletasText, obj =>
      obj && typeof obj === "object" && obj.ok === true && obj.data &&
      String(obj.data.placa || "").toUpperCase() === placa.toUpperCase()
    );
    if (!bw) {
      const e = new Error("RESPUESTA_BOLETAS_INVALIDA");
      e.code = "API_CAMBIO";
      throw e;
    }

    const vehicleText = await callAction(actionVehicleId, [{placa, garageId}]);
    const vehiculo = parseRscObject(vehicleText, obj =>
      obj && typeof obj === "object" &&
      String(obj.nroPlaca || "").toUpperCase() === placa.toUpperCase() &&
      ("detalleRespuesta" in obj || "status" in obj)
    );
    if (!vehiculo) {
      const bloqueo = parseRscObject(vehicleText, obj =>
        obj && typeof obj === "object" && Number.isFinite(Number(obj.status)) && Number(obj.status) >= 400 && Number(obj.status) < 600 && Array.isArray(obj.errors) && obj.errors.length > 0 && obj.errors.every(e => e && typeof e === "object" && ("title" in e || "detail" in e || "status" in e))
      );
      if (bloqueo) return {vehiculo:null, boletas:bw.data, bloqueo};
      const e = new Error("RESPUESTA_VEHICULO_INVALIDA");
      e.code = "API_CAMBIO";
      throw e;
    }

    return {vehiculo, boletas:bw.data, bloqueo:null};
  }

  window.addEventListener("message", async ev => {
    if (ev.source !== window) return;
    const m = ev.data;
    if (!m || m.source !== "RYM_V2_ISOLATED" || m.type !== "QUERY" || !m.requestId) return;
    try {
      const result = m.payload?.tipoConsulta === "LISTADO_REVISADOS" ? await queryList() : await query(m.payload);
      window.postMessage({source:"RYM_V2_MAIN",type:"RESULT",requestId:m.requestId,ok:true,result},"*");
    } catch (err) {
      window.postMessage({
        source:"RYM_V2_MAIN",type:"RESULT",requestId:m.requestId,ok:false,
        error:{code:err?.code || "ERROR", message:String(err?.message || err)}
      },"*");
    }
  });
})();
