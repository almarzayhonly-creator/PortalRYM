# Validador independiente v21

Manuel Chavez tiene rol OPERATIVO y Yhonly Almarza ADMIN_TOTAL; ambos tienen
el permiso control_auto.validador_unidad_app. Se comprobaron sus configuraciones
sin modificar perfiles, permisos ni RLS y sin iniciar sesión en sus cuentas.

El host dedicado ahora carga solamente el transporte de autenticación y las
funciones canónicas del validador. No ejecuta Home, rankings, resúmenes de flota,
prefetch de Revisados ni módulos del portal. El HTML pasa de aproximadamente
1,6 MB a 439 kB; las reglas y estilos del modal se conservan desde main.

La sesión dedicada exige autenticar al usuario, comprobar perfil activo y obtener
sus permisos. Conserva renovación de tokens, cierre de sesión, cambios de sesión
y cambio obligatorio de contraseña. Tener perfil full no añade consultas de Home.

revisados-validator requiere JWT, perfil activo, permiso de la app y una unidad
exacta visible mediante el RPC ejecutado con el token del usuario. Lee únicamente
los estados de esa unidad, conserva el cálculo canónico de Revisados y devuelve
estado/bloqueos sin notas privadas ni capacidades de operación o historial.
La función nueva fue autorizada expresamente tras la revisión automática;
revisados-final permanece sin modificar.

GPS usa un coordinador aislado para compartir sólo descargas en curso de los
dos feeds. El secreto se genera en el workflow, se configura por stdin y sólo
se exporta cifrado con RSA-OAEP SHA-256. La clave privada permanece en .sandbox,
excluida de Git y de los assets. La activación modifica únicamente el transporte
de gps-rym-validator; conserva su autenticación y filtrado de unidades.

Pruebas: HTML real con autenticación simulada para básico/full, acceso denegado
y cambio obligatorio; paridad de estados por unidad, filtros y rechazos del backend;
tormenta de mutaciones, pruebas responsivas y concurrencia controlada.
La prueba de perfiles no sustituye una medición con sesiones reales de Manuel y Yhonly.
No se promete latencia de producción a partir de proveedores simulados.
