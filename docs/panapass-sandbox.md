# Panapass sandbox V2

Este espacio es exclusivo para rediseño y correcciones visuales de Panapass.
`main` permanece como producción estable.

## Límites

- No modifica RPC, RLS, autenticación, pagos ni asignaciones.
- Cada módulo se carga y se prueba de forma aislada en el preview.
- No se integra a `main` sin validación visual y funcional del módulo afectado.

## Módulos

| Área | JavaScript | Estilos |
| --- | --- | --- |
| Base y tokens | `modules/panapass-sandbox/dashboard/index.js` | `css/panapass-sandbox/tokens.css` |
| Resumen/KPI | `modules/panapass-sandbox/dashboard/` | `css/panapass-sandbox/dashboard/` |
| Galeras | `modules/panapass-sandbox/galeras/` | `css/panapass-sandbox/galeras/` |
| Ranking | `modules/panapass-sandbox/ranking/` | `css/panapass-sandbox/ranking/` |

Cada cambio debe limitarse a un módulo y conservar su fuente de datos actual.
