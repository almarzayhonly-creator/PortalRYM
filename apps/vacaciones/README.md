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

La sincronizacion de empleados y supervisores se conectara en una etapa posterior mediante una Edge Function. No se deben poner tokens de GeoVictoria ni claves secretas en este directorio.

## Regla de aislamiento

Esta rama no se mergea a `main`. Si en el futuro se enlaza PortalRYM, la integracion debe hacerse mediante una interfaz explicita (SSO, API o enlace), sin compartir tablas ni secretos por accidente.
