# Flujos de n8n

| Agente | Flujo | Versión | Archivo | Plantilla |
|---|---|---|---|---|
| Gym | Gym - Entrada | v1 | `flujos/gym/gym-entrada-v1.json` | `flujos/plantillas/gym-entrada.json` |
| Gym | Gym - Errores | v1 | `flujos/gym/gym-errores-v1.json` | `flujos/plantillas/gym-errores.json` |

- Nombre: `<agente>-<flujo>-v<N>.json`, minúsculas, sin espacios. Solo la versión vigente.
- Los JSON de `flujos/gym/` se **generan** (`node scripts/build_flujos.js`) desde la plantilla + `src/nucleo/` + `src/code/`. Nunca se edita a mano el `jsCode`: se cambia el código fuente y se vuelve a generar.
- Exportar: flujo → ⋯ → Download; `pinData` vacío.

## Importar Gym v1 (en este orden)

1. **Gym - Errores** primero: Create workflow → ⋯ → Import from file → `gym-errores-v1.json`.
   - Credenciales: reasignar `Telegram Gym (reasignar al importar)` (`PENDIENTE_TELEGRAM`) en *Enviar* y `Google Sheets OAuth2 (reasignar al importar)` (`PENDIENTE_SHEETS`) en *Leer admins*.
   - Nodo *Config*: reemplazar `PENDIENTE_ID_HOJA` por el ID de la hoja (PRUEBAS o real; no es secreto).
   - Copiar el ID del flujo (número en la URL de n8n).
2. **Gym - Entrada**: importar `gym-entrada-v1.json`.
   - Credenciales: *Telegram Trigger* y *Responder* (Telegram), *Leer hoja* y *Escribir hoja* (Google Sheets OAuth2).
   - Nodo *Config*: el mismo ID de hoja que en Errores (cambiar PRUEBAS ↔ real solo aquí y en el *Config* de Errores).
   - Settings → *Error workflow*: elegir **Gym - Errores** (el JSON trae el marcador `PENDIENTE_ID_ERRORES`; n8n no lo resuelve solo).
3. Verificar que la hoja tenga todas las pestañas y encabezados de `hoja/esquema.json` (incluida la columna `Rol` en *Usuarios*) y al menos un usuario con `Rol = admin` y `Activo = Sí`.
4. Despublicar versiones viejas, publicar *Errores* y luego *Entrada* (los JSON se entregan con `active: false`) y probar: usuario activo dice "hola"; `/start <código>` válido; código usado; sin código; mismo mensaje dos veces.

## Nodos a revisar tras importar
- *Telegram Trigger*: el `webhookId` se conserva; al activar, n8n registra el webhook en Telegram.
- *Leer hoja* / *Escribir hoja* / *Leer admins*: credencial Google Sheets OAuth2 con acceso a la hoja.
- *Escribir hoja* no tiene reintento a propósito (un append repetido duplicaría filas).
