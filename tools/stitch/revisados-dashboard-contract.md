# Revisados Dashboard visual contract

Source of truth: PortalRYM `main`.

This contract is intentionally conservative. Stitch may redesign presentation, hierarchy, spacing, typography, cards, tables, badges, filters and responsive layout. It must not invent, rename, remove or reinterpret business logic, data, metrics, states or actions.

## Existing functional content that must be preserved

Dashboard:
- Hero state: either "Todo al día" or "{N} unidades necesitan atención".
- Hero detail may include: pendientes antiguos, mes anterior, mes actual, unidades al día.
- Existing hero actions: "Atender pendientes" / "Ver detalle" and "Revisar alertas" when alerts exist.
- Existing KPIs only:
  - Unidades en tu alcance
  - Al día
  - Pendientes ahora
  - Alertas reales / Sin alertas
  - Pendientes Revisado Taxi (conditional)
  - Sin fotos
  - Emitidos hoy
- Existing sections:
  - Estado por galera / Tu avance
  - Avance por mes
  - Qué atender primero (only when applicable)
- Existing actions:
  - Abrir Operaciones
  - Ver completo
  - Abrir cola de trabajo
  - KPI drill-down actions already present in main

Do not add:
- Mission Control
- RUV
- Gateway
- Telemetry
- Node
- Station
- Dispatch / Despacho Fiscal
- Core Online
- Vehicle Operations Workspace
- Bahías, estaciones, servidor, telemetría o infraestructura ficticia
- RUV, fiscalización, retenciones, trazabilidad o auditoría forense
- columnas, filtros o acciones que no existan en `main`
- new KPIs
- new filters
- new statuses
- new sources
- new workflows
- new buttons
- new modules

## Existing navigation labels

- Dashboard
- Operaciones
- Avance mensual
- Reporte diario
- Historial
- Estadísticas
- Boletas
- Cupos

Do not rename them.

## Portal RYM visual identity from main

- Navy: #0A1B4D
- Blue: #244AA5
- Sky: #53B7E8
- Orange accent: #F47C20
- Background: #F4F7FB
- Border: #D8E3F2
- Primary text: #10224E
- Muted text: #62708C
- Green: #047857
- Red: #DC2626

Design direction:
- clear/light sidebar, not dark;
- white surfaces on very light blue-gray background;
- blue as primary interaction color;
- orange only as accent;
- subtle borders and shadows;
- 14–18px radii;
- enterprise, clean, restrained;
- desktop-first at 1366–1920px;
- preserve all functional information but improve hierarchy;
- do not fill empty space with invented data.

## Output scope

Generate ONLY the Dashboard screen in this run.
