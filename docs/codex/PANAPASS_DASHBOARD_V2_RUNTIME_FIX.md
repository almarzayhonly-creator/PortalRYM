# Panapass Dashboard V2 runtime fix

Este archivo documenta el fallo observado en preview el 2026-09-05.

Sintoma: con `?panapassDashboardV2=1` la pantalla visible seguia mostrando el dashboard legacy/generico aunque el loader V2 estaba cargado.

Causa corregida: el boundary conservaba `context.root` capturado antes de abrir el shell legacy. Si el shell reconstruia `#view`, ese nodo quedaba desconectado y V2 podia renderizar en un nodo viejo no visible.

Correccion:
- resolver `#view` vivo despues de que el shell legacy termine;
- desmontar V2 usando el nodo vivo actual;
- mantener el flag preview durante recargas/redirecciones de login en `sessionStorage`;
- corregir el falso positivo del contrato QA para CSS responsive de una sola linea.

Para apagar el preview en la misma pestana usar `?panapassDashboardV2=0` y recargar.
