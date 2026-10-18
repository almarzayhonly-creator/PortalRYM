# Stitch para Portal RYM

`npm run` no se usa para publicar desde Stitch. El workflow manual `Stitch design snapshot` exporta únicamente el proyecto configurado y lo entrega como artefacto de GitHub Actions por 7 días. No escribe commits, no hace push ni despliega a Cloudflare.

En GitHub, configura `STITCH_API_KEY` como Actions secret y `STITCH_PROJECT_ID` como Actions variable del repositorio `almarzayhonly-creator/PortalRYM`. La variable acepta el ID solo o la URL `https://stitch.withgoogle.com/projects/<id>`. Después ejecuta Actions → Stitch design snapshot → Run workflow y descarga el artefacto. La captura resultante es referencia de diseño; cada vista se implementa y revisa en Vue por separado.

El SDK está fijado en `0.3.5`; instala dependencias con `npm ci` usando el lockfile.
