# V171 Changelog

## 2026-08-28
- Creada rama `v171-modular` aislada de produccion.
- Creado registro central de modulos.
- Separados limites de Panapass, Revisados, Control de Auto, GPS y Usuarios.
- ENA movido a `modules/panapass/ena/`.
- CSS separado en `css/core.css` y archivos por modulo.
- CSS aislado por `data-rym-module` para reducir efectos cruzados.
- Cargador V171 actualizado para montar JS y CSS modular.
- QA automatico de carga modular habilitado en preview Cloudflare.
- Respaldos Git creados antes de cambios estructurales.

## Regla de trabajo
No cambiar reglas de negocio mientras se extrae codigo legacy. Cada bloque se prueba antes de retirar su equivalente del monolito.
