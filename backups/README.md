# Respaldos Portal RYM

Los respaldos de codigo se manejan con ramas y referencias Git para evitar duplicar archivos grandes dentro del repositorio.

## Puntos creados
- `backup/main-2026-08-28`: estado de produccion/base antes de V171.
- `backup/v171-structure-2026-08-28`: primer punto estructural de V171 antes de separar CSS.

## Regla
Antes de cambios estructurales importantes se crea un nuevo punto `backup/<version>-<fecha>` desde el commit validado. Los ZIP externos, si se generan, no se guardan dentro de este repositorio.
