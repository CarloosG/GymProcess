# T03 · Evidencia (hoja PRUEBAS)

Fecha: 2026-11-07. Hecho por el arquitecto con los conectores de Google Drive y Google Sheets.

- Creada **GymProcess PRUEBAS** (Google Sheets nativa, ID de 44 caracteres): `1fSbk1Th6v6RpmG7pWoJ4n4TuP58V7st05a5zBXjC3Wg`.
- Propiedades leídas de vuelta: `locale = es_CO`, `timeZone = America/Bogota`.
- 10 pestañas con fila 1 congelada y en negrita: Usuarios, Invitaciones, Ejercicios, Sesiones, Series, Amigos, Permisos, Por confirmar, Cambios, Log Bot.
- Encabezados releídos con `spreadsheets.get` (fila 1 de cada pestaña): idénticos a `hoja/esquema.json`.
- Validaciones de lista (filas 2–1000): Invitaciones.Estado, Ejercicios.Tipo, Ejercicios.Por mano, Series.Unidad, Series.Modalidad, Amigos.Estado, Permisos.Métricas, Cambios.Acción.
- Catálogo semilla: 37 ejercicios (`Provisional = Sí`), releídos de `Ejercicios!A2:A38`.

Pendiente:
- **Hoja real:** se crea después de la ronda 2 (puede agregar pestañas de puntos/metas/retos), copiando esta estructura.
- Retos/Participantes: ronda 2.
- No probado: escritura desde n8n (no hay instancia todavía).
