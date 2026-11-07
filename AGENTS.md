# GymProcess — bot de gimnasio y competencia entre amigos

Automatización Telegram → n8n (self-hosted) → Google Sheets → Apps Script, para el Ingeniero William Delgado (Bucaramanga, Colombia).
Este archivo es la entrada para cualquier agente (Claude Code lo carga vía `CLAUDE.md`; Codex lo lee directo).

## Cómo trabajar con William (leer siempre)
- Español, claro y sin relleno; llámelo **"Ingeniero William"**.
- **Autonomía total (D16):** el arquitecto decide, hace commit y push sin esperar "dale" e informa en 1–2 líneas. Siguen siendo de William: OAuth de Google, token de BotFather, importar/activar flujos, costos. Al empezar una fase con decisiones abiertas: `/grill-me`.
- **Metodología solo-Claude:** la sesión principal es el **arquitecto** (diseña, escribe `tareas/T0N/brief.md`, lee veredictos, toca Google). Cada tarea la hace un subagente nuevo (`ejecutor-ligero` haiku · `ejecutor` sonnet) y la revisa otra instancia (`auditor` sonnet, solo lectura). Máximo 2 ciclos de RECHAZADO; luego se presenta el bloqueo. Máximo 2 ejecutores en paralelo y nunca el mismo JSON. Opus solo con razón concreta y aprobación de William.
- Fuente de verdad: **`PROYECTO.md`** (leer primero al retomar) y **`tareas/CONTRATO.md`** (cambios solo por enmiendas numeradas).
- Mensajes de 1–2 líneas mientras se trabaja; el detalle va a los archivos, no al chat.
- Entregue **JSON importable** con `active: false`, conservando IDs de nodos, `webhookId`, credenciales y `settings.errorWorkflow`.
- Pruebe con casos **válidos, inválidos y duplicados** (`n8n-workflow-check`) y corra `auditar-entrega` antes de decir "listo". Diga qué NO se ejecutó.
- Formato de entrega: qué cambió · cómo instalarlo (orden exacto) · qué revisar al importar · pruebas sugeridas · qué no se ejecutó.
- Git (D17): commit sin *Co-Authored-By*; push **solo** a `claude/cloud-environment-setup-34uf4a`; `master` por PR que decide William. Antes de cada commit: `git diff --cached | grep -nE "AIza|gsk_|sk-|ya29\.|Bearer [A-Za-z0-9]|[0-9]{8,10}:AA|BEGIN PRIVATE KEY"` vacío.
- Lecciones de proyectos anteriores (obligatorio leer al empezar): la base "Próximos proyectos" (en el PC de William: `C:\Users\Willi\OneDrive\Doc_Archivos Importantes\Archivos\Proximos Proyecto - n8n\`; las reglas que aplican ya están en `PROYECTO.md`, `tareas/CONTRATO.md` y este archivo) → `03-errores-y-lecciones.md`.

## Reglas de oro
1. Una sola lectura de la hoja por ejecución (`values:batchGet`); escrituras en lote, por ID, por un **solo escritor**.
2. `sello = yyMMddHHmmss + '-' + $execution.id`; anti-duplicados por `update_id`.
3. Telegram con `parse_mode: HTML` y texto escapado (`& < >`).
4. Preguntas con botones vía *Por confirmar* con candado (Reservar → Esperar 3 s → Verificar).
5. La IA propone, el código decide; dinero o personas ambiguas → botones.
6. No renombrar pestañas ni encabezados; columnas solo se agregan. Anular en vez de borrar.
7. Nunca `N8N_CONCURRENCY_PRODUCTION_LIMIT`. Nunca secretos en JSON, código, repo ni chat. No activar facturación.
8. Despublicar la versión vieja **antes** de publicar la nueva (mismo bot).

## Infraestructura
- n8n self-hosted en Google Cloud e2-micro (`n8n-consignaciones`, us-east1-b, 1 GB RAM + 2 GB swap), Docker (`n8n-n8n-1`, `n8n-caddy-1`), dominio `pagoswilliam.duckdns.org`. **Compartido con otros bots:** pocas ejecuciones pesadas, sin bucles largos, no tocar flujos ajenos.
- Zona horaria `America/Bogota`. Versión de n8n: *pendiente* (ajustar `VERSIONES` en `check_workflow.py`).
- IA gratis: Gemini 3.5 Flash-Lite (principal), Groq `openai/gpt-oss-20b` (respaldo texto), Groq `whisper-large-v3-turbo` (voz). Sin facturación.
- Desarrollo en la nube: Node 22 y Python 3; Luxon lo instala `.claude/hooks/session-start.sh`.

## IDs y credenciales (sin secretos)
Ver `docs/ids-y-credenciales.md` (uso | tipo | ID | nombre, sin valores).

## Estructura
- `flujos/<agente>/<agente>-<flujo>-v<N>.json` → solo la versión vigente.
- `apps-script/<app>/` → `Codigo.gs`, `Index.html`, `appsscript.json`, `README.md`.
- `PROYECTO.md` → estado, decisiones, arquitectura, datos, plan e historial. `tareas/CONTRATO.md` → contrato. `tareas/T0N/` → `brief.md`, `ejecutor.md`, `auditoria.md`, `evidencia.md`.
- `src/nucleo/` → lógica determinista + pruebas Node. `scripts/build_<flujo>.js` → inserta el núcleo en los Code. `hoja/esquema.json` → pestañas y columnas.
- `docs/` → `pendientes.md`, `lecciones-aprendidas.md`, `ids-y-credenciales.md`.
- `.claude/agents/` → `ejecutor-ligero`, `ejecutor`, `auditor`.
- `.claude/rules/n8n-flujos.md` → convenciones al editar JSON. `.claude/skills/` → skills (copiadas, sin enlaces).

## Versiones actuales
| Componente | Versión | Nodos | Notas |
|---|---|---|---|
| (ninguno aún) | — | | Ver plan en `PROYECTO.md §4` |

## Verificación (sin n8n)
```bash
S=.claude/skills/n8n-workflow-check/scripts
python3 $S/check_workflow.py flujos/<nuevo>.json --base flujos/<anterior>.json
python3 $S/mapa_flujo.py flujos/<nuevo>.json --rutas --code
node $S/simular_code.js flujos/<nuevo>.json "<Nodo>" casos.json
```
Antes del primer uso: ajustar `VERSIONES` en `check_workflow.py` a las versiones de nodo de esta instancia.
