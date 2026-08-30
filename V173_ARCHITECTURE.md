# Portal RYM V173 Clean

## Objetivo
V173 reemplaza la arquitectura monolitica del frontend por un shell pequeno y modulos independientes, sin reescribir reglas de negocio que ya funcionan.

## Regla de seguridad
- `main`: produccion, no tocar durante la migracion.
- `v172-preview`: referencia funcional/congelada para paridad.
- `audit-v172-index`: auditoria temporal.
- `v173-clean`: nueva arquitectura.
- Ningun modulo se considera migrado hasta pasar paridad funcional, permisos, escritorio y movil.

## Shell objetivo
`index.html` debe contener solamente:
1. metadatos y document shell;
2. mounts de login/portal/app;
3. CSS core;
4. bootstrap/loader V173;
5. fallback de error de carga.

Meta: index en decenas de KB, no MB.

## Modulos
- `modules/v173/core/`: auth, sesion, permisos, router, API client, UI compartida.
- `modules/v173/panapass/`: dashboard, negativos/pagos, ranking, recurrentes, bajas/ENA.
- `modules/v173/revisados/`: dashboard, operaciones, historial, estadisticas, cupos/compras, eCarCheck.
- `modules/v173/control-auto/`: flota, filtros, auditorias, detalle unidad.
- `modules/v173/gps/`: dashboard, flota, reportes, auditorias.
- `modules/v173/usuarios/`: administracion de usuarios y permisos.
- `modules/v173/validador/`: modulo independiente y permiso independiente.
- `css/v173/`: estilos core y por modulo.
- `qa/v173/`: contratos, rutas, permisos y smoke tests.

## Contratos que no se rompen
- Acciones existentes de botones y tabs.
- Nombres/contratos globales necesarios mientras un modulo antiguo siga activo.
- Filtros por galera y roles.
- Consultas/escrituras Supabase existentes.
- Reglas de negocio de Panapass, Revisados, Control de Auto y GPS.
- Validador no inventa estados Panapass/GPS mientras sus APIs no esten conectadas.

## Estrategia
1. Inventariar V172 y congelar comportamiento de referencia.
2. Crear shell V173 y core.
3. Migrar un modulo por vez.
4. Durante cada migracion usar adaptadores de compatibilidad si una funcion antigua sigue siendo requerida.
5. Ejecutar pruebas de contrato antes de retirar codigo legado.
6. Eliminar legado solo despues de comprobar paridad.
7. Prueba integral escritorio + movil.
8. Solo despues de aprobacion: PR hacia `main`.

## Orden de migracion
1. Core/login/portal/router/permisos.
2. Panapass.
3. Revisados.
4. Control de Auto.
5. GPS.
6. Usuarios.
7. Validador.

## Definition of Done por modulo
- Renderiza sin errores.
- Todos los botones tienen accion.
- Tabs no rebotan al portal/dashboard.
- Permisos correctos por rol/galera.
- Sin duplicacion visual relevante.
- Responsive movil.
- Sin regresion en llamadas API/Supabase.
- Smoke/contract tests pasan.
