# RYM Vacaciones

Aplicacion independiente de gestion de vacaciones. Vive temporalmente dentro de la rama `feat/vacaciones-modular` del repositorio PortalRYM, pero no depende del portal ni debe mezclarse con `main`.

## Backend

Proyecto Supabase dedicado: `rym-vacaciones` (`uetfiohwdmehqayytxxm`). El frontend usa exclusivamente una publishable key; RLS controla el acceso a filas.

## Desarrollo

```bash
npm ci
npm run dev
```

## Build

```bash
npm run build
```

## Estructura

- `index.html`: shell minimo.
- `src/components`: UI por modulo.
- `src/hooks`: estado y orquestacion del portal.
- `src/services`: acceso a Supabase.
- `src/config/*.json`: configuracion editable.
- `src/styles`: CSS separado por responsabilidad.

## GeoVictoria

La integracion con GeoVictoria ya esta activa en el proyecto Supabase dedicado.

- `geovictoria-sync`: sincroniza empleados desde GeoVictoria hacia `public.employees`.
- `geovictoria-explorer`: explorador de solo lectura para validar modulos adicionales de la API antes de modelarlos en la base.
- Credenciales y secretos se almacenan como secretos de Edge Functions; nunca deben escribirse en el repositorio ni enviarse al frontend.

La exploracion validada incluye usuarios, turnos, perfiles, cargos, grupos, tipos de permisos, libro de asistencia, marcas, permisos y horas extra. Ver `docs/GEOVICTORIA_CAPABILITIES.md`.

## Regla de aislamiento

Esta rama no se mergea a `main`. Si en el futuro se enlaza PortalRYM, la integracion debe hacerse mediante una interfaz explicita (SSO, API o enlace), sin compartir tablas ni secretos por accidente.
