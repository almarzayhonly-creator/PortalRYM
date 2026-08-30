RYM eCarCheck V2 Bridge v0.4.4

CAMBIOS
- Acepta bloqueos estructurados de eCarCheck con status 4xx/5xx, no solo 400.
- Conserva exactamente title, detail y status del bloqueo recibido.
- Mantiene separadas las tres categorias: Infracciones ENA, Boletas por Documento y Boletas por Placa.
- Muestra los tres conteos en la etiqueta cuando una placa queda bloqueada.
- Reduce la pausa conservadora entre ciclos a 3 segundos; nunca procesa placas en paralelo.
- Un formato de respuesta desconocido sigue marcandose API_CAMBIO y detiene la cola.
- SESION_REQUERIDA sigue deteniendo la cola hasta que el usuario vuelva a iniciar sesion.
- No solicita permiso de cookies ni exporta cookies, JWT, contrasena o Turnstile.

ACTUALIZACION
1. Quita la version anterior o reemplaza su carpeta.
2. chrome://extensions -> Modo de desarrollador -> Cargar extension sin empaquetar.
3. Selecciona la carpeta ecarcheck_v2_bridge_extension_v040.
4. Recarga la pestana de eCarCheck V2.

0.4.2: soporte LISTADO_REVISADOS V2, reanudacion de sesion y conserva timeout al final de cola.
0.4.3: interpreta React Flight/RSC anidado de /dashboard/revisados, consulta paginas aprobadas de las ultimas 48 horas y deduplica por inspectionId antes de enviar el listado al bridge.
0.4.4: el rango de listado es desde el primer dia del mes vigente hasta hoy (01/08/2026 a hoy durante agosto). La base deduplica por inspectionId; solo se encolan revisados nuevos.
