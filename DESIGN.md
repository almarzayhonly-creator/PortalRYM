# Portal RYM Design System

## Purpose
This file is the shared design contract for Google Stitch, ChatGPT/Codex and the Vue 3 implementation of Portal RYM.

## Product character
- Enterprise fleet-management software.
- Modern, premium and operational.
- High information density without visual clutter.
- Avoid generic AI-dashboard layouts.
- Prioritize scanning, filters, status, exceptions and next actions.

## Architecture boundary
- UI may change without changing business rules or Supabase contracts.
- Existing production HTML remains untouched during migration.
- New UI work is implemented in Vue 3 + TypeScript.
- Each operational domain is isolated by module.
- CSS must not leak between modules.

## Core stack
- Vue 3
- Vite
- TypeScript
- Tailwind CSS
- Reka UI / shadcn-vue where useful
- Apache ECharts for analytical visualizations
- Supabase for data
- Cloudflare for delivery

## Layout
- Desktop-first operational shell with responsive behavior.
- Persistent sidebar on desktop; drawer on small screens.
- Main content max-width should not make dense tables unnecessarily narrow.
- Prefer page sections over stacks of oversized cards.

## Surfaces
- Border radius: 10-12px.
- Subtle borders and restrained shadows.
- Avoid glassmorphism and decorative gradients for core operational surfaces.
- Cards are for grouped information, not for every metric.

## Status semantics
- Vigente / OK: success.
- Pendiente / requiere accion: warning.
- Bloqueado / error real: danger.
- Informativo / no aplica: neutral.
- Cambio de color: distinct warning treatment.
- Never use color as the only indicator; include icon/text.

## Tables
- High-density, readable rows.
- Sticky header where useful.
- Filters remain visible while reviewing long result sets.
- Row actions should be explicit.
- Column alignment should reflect data type.
- Empty states must explain why there is no data.

## Filters
- Galera, supervisora, estatus and periodo may be multi-select where operationally useful.
- KPI and charts must react to the same active filter state.
- Filter state must be visible and removable individually.
- Never show hidden filters affecting totals.

## KPI
- KPIs are contextual, not global when filters are active.
- Avoid four-identical-card templates.
- Show trend/context only where it helps a decision.
- KPI values and detailed tables must reconcile.

## Revisados domain
Required states:
- Vigente
- Pendiente por ciclo
- Pendiente por cambio de color
- No aplica
- Incidencia real that prevents issuance

Do not use a generic "Bloqueado" state when the underlying reason can be shown.

## eCarCheck / ATTT incidents
Keep these concepts separate:
- ENA de empresa/documento
- Boleta asociada a placa
- Restriccion asociada a placa
- Other ATTT/document incidents

A corporate/document debt must not be rendered as if every vehicle has an individual ticket.

## Components
Prefer reusable components:
- AppShell
- PageHeader
- FilterBar
- FilterChip
- StatusBadge
- MetricBlock
- DataTable
- EmptyState
- ExceptionPanel
- DateStatus

## Motion
- Use subtle transitions for filters, drawers and expanded detail.
- No decorative motion that slows operations.

## Accessibility
- Keyboard-accessible filters and menus.
- Visible focus states.
- Sufficient text/background contrast.
- Icons must have labels or accessible names.

## Stitch instructions
When generating a Portal RYM screen:
1. Treat this DESIGN.md as authoritative.
2. Produce a desktop operational view first, then responsive behavior.
3. Preserve domain terminology in Spanish.
4. Do not invent backend fields.
5. Do not embed business logic in generated UI.
6. Prefer reusable sections and components over monolithic HTML.
7. Return layouts that can map cleanly to Vue components.
