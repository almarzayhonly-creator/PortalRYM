# Google Stitch + Vue migration lane

## Goal
Use Google Stitch as a design/prototyping layer and Vue 3 as the production UI implementation while the existing Portal RYM remains operational.

## Current repository state
The current sandbox still serves the legacy application from the root HTML/JS structure. Migration must therefore be incremental.

## Safe workflow
1. Design or revise a screen in Google Stitch using the repository DESIGN.md.
2. Export/share the screen specification or generated frontend.
3. Translate the result into Vue components; do not paste generated monolithic HTML into the legacy index.
4. Connect Vue components to existing domain services/contracts.
5. Validate filters, roles, Supabase data and visual isolation.
6. Deploy only the sandbox preview.
7. Merge to main only after explicit approval.

## Migration order
Recommended pilot:
1. Revisados
2. Control Auto
3. Panapass
4. GPS
5. Remaining administrative modules

## Vue boundaries
Each domain should follow:
```
src/modules/<domain>/
  components/
  composables/
  services/
  types/
  views/
```

Shared UI:
```
src/shared/
  components/
  composables/
  styles/
  types/
```

## Non-negotiable rules
- No change to main during migration experiments.
- No cross-module CSS leakage.
- No direct Supabase calls scattered through presentation components.
- No duplicated business-rule calculations in the UI.
- Existing role/permission behavior must be preserved.
- KPIs and tables must consume the same filtered dataset or the same canonical query contract.
