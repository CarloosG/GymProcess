---
name: auditar-entrega
description: Auditoría del trabajo realizado en la sesión antes de decirle a William que algo está listo. Revisa el diff real contra lo que se va a reportar, corre n8n-workflow-check sobre cada JSON tocado, prueba el tablero de Apps Script si cambió, exige el formato de entrega (qué cambió, instalación, nodos a revisar, pruebas en Telegram), verifica que cada "probado" tenga evidencia, que la documentación esté al día y que no queden secretos ni archivos sueltos. Úsala al terminar cualquier cambio en flujos, tablero, docs o skills del repo, y cuando William pida "audita lo que hiciste" o /auditar-entrega.
---

# Auditar la entrega

Objetivo: que lo que se le dice a William coincida con lo que de verdad se hizo y se probó. Es una revisión **adversarial de su propio trabajo**: busque lo que está mal, no confirme lo que salió bien.

## 1. Qué cambió de verdad
```bash
git fetch -q origin main                                  # en sesiones en la nube main no viene descargada
git status --short
git diff --stat origin/main...HEAD; git diff --stat      # commits de la rama + cambios sin commit
```
(Si la rama por defecto no es `main`: `git ls-remote --symref origin HEAD`.)
- Cada archivo tocado debe estar explicado en la entrega. Archivos que nadie pidió → ❌ (revertir o justificar).
- Nada de borradores, `.bak`, `node_modules`, zips nuevos ni exports con datos personales. Tampoco fixtures de prueba hechas con el Excel de William (`hoja.json`, `batch.json`, `*.xlsx`): esas se quedan en el scratchpad o en `/tmp`.

## 2. Flujos JSON tocados
Para cada `*.json` de flujo nuevo o modificado:
```bash
S=.claude/skills/n8n-workflow-check/scripts
python3 $S/check_workflow.py "Nuevo.json" --base "Anterior.json"
```
- La base es el export anterior (`git show origin/main:"Archivo.json" > /tmp/base.json` si se sobrescribió).
- 0 ❌ obligatorio. Cada ⚠️ aparece en la entrega con su explicación.
- Cada nodo Code modificado tiene simulación con casos **válido, inválido y duplicado** (`simular_code.js`), y su resultado X/Y se reporta.
- Si cambió el nombre o la versión del flujo: el nombre del archivo, el campo `name` y la tabla de versiones del `CLAUDE.md` coinciden.

## 2b. Tablero tocado (`apps-script/tablero/`)
Si cambió `Codigo.gs` o `Index.html` (cómo armar las pruebas: sección "Tablero (Apps Script) fuera de Google" del `CLAUDE.md`):
- **Sintaxis:** `cp apps-script/tablero/Codigo.gs /tmp/c.js && node --check /tmp/c.js`. Para el JavaScript de `Index.html`, basta con abrirlo en Chromium sin errores en la consola.
- **Cifras:** `calcular()` con los datos reales da las mismas cifras que el bot (disponible, te deben, patrimonio, tarjeta). Reporte X/Y.
- **Escrituras** (`corregirMovimiento`, `registrarPago`, `deshacerCambio` o funciones nuevas), con `SpreadsheetApp` y `LockService` simulados. Casos:
  - válidos;
  - inválidos (monto, cuenta, categoría, fecha futura, sin clave);
  - **duplicado** (misma clave dos veces);
  - candado ocupado;
  - deshacer.
- **Página:** pruebas en Chromium con Playwright a 390 px y a 1366 px (sin desborde ni errores de JavaScript) y de punta a punta tocando los botones. Incluyen un doble toque.
- **Lógica repetida:** si en el bot cambió *Contexto*/*Reporte*, `cobrar_cuota`, `/deshacer` o `limpio()`, el cambio equivalente está en `Codigo.gs`, y al revés (lista en el `CLAUDE.md`). Si no está → ❌.
- **Permisos:** si se usa un servicio nuevo de Google (por ejemplo `DriveApp` o `UrlFetchApp`), la entrega avisa que Google pedirá autorizar otra vez.

## 3. Formato de la entrega (CLAUDE.md)
La respuesta final debe tener, en este orden:
1. **Qué cambió** (por nodo o por función, no "mejoras varias").
2. **Cómo instalarlo** en orden exacto (incluye: despublicar la versión vieja **antes** de publicar la nueva si comparten bot de Telegram; credenciales a reasignar; `active` queda en false).
3. **Qué nodos revisar al importar.**
4. **Pruebas sugeridas en Telegram** (mensajes concretos para escribir, incluidos un caso inválido y un doble toque).
5. **Qué NO se ejecutó dentro de n8n.**
Falta alguno → ❌.

En el tablero, el punto 3 no son nodos: es pegar los archivos en Apps Script → **Nueva versión** de la implementación (la URL no cambia) → reautorizar si cambiaron los permisos. El punto 5 es lo que no se ejecutó dentro de Google: la implementación, la autorización, `LockService` y cómo convierte Sheets lo que se escribe.

## 4. Honestidad de lo reportado
- Cada "probado", "funciona" o "verificado" tiene detrás una salida de script o de simulación en esta sesión. Si no, se cambia por "no probado".
- Metas del plan no cumplidas se reportan con el número real (p. ej. "el prompt bajó 18 %, la meta era 30 %").
- Ninguna afirmación sobre el comportamiento de Gemini/Telegram/Sheets se da por hecha.

## 5. Documentación al día
- `CLAUDE.md`: tabla de versiones y nodos (contar con `python3 -c "import json;print(len(json.load(open('X.json'))['nodes']))"`), errores abiertos.
- `docs/pendientes.md`: quitar lo resuelto, agregar lo descubierto.
- `docs/lecciones-aprendidas.md`: agregar si hubo un diagnóstico nuevo (síntoma | causa | solución).
- Enlaces de `CLAUDE.md` a `docs/` y `.claude/rules/` siguen existiendo.
- Si cambió el tablero: fila *Tablero* del `CLAUDE.md` con la versión nueva y `apps-script/tablero/README.md` (tabla de pestañas, instalación y "Cómo se probó" con los X/Y reales).

## 6. Higiene y seguridad
- `check_workflow.py` sin ❌ de seguridad; además `git diff origin/main...HEAD | grep -nE "AIza|gsk_|ya29\.|Bearer [A-Za-z0-9]|[0-9]{8,10}:AA"` vacío.
- Nunca `N8N_CONCURRENCY_PRODUCTION_LIMIT` ni Gemini 3.8 Flash.
- Commit hecho y subido a la rama de trabajo (`git status` limpio, `git log origin/<rama>..HEAD` vacío).

## Resultado
Escriba un bloque corto **antes** de la respuesta final a William:

```
Auditoría de la entrega
✅ Cumple: …
⚠️ Observaciones: …
❌ Bloquea: …   → corregido / pendiente
```
Con algún ❌ sin corregir, no diga que está listo: corríjalo o explíquele a William qué falta y por qué.
