---
name: auditoria-proyecto
description: Auditoría completa (técnica, funcional y estratégica) del proyecto de finanzas de William (bot n8n y tablero), comparando lo desarrollado contra el plan, con matriz plan vs. implementación, avance ponderado, revisión estricta de finanzas y pagos recurrentes, puntos débiles, roadmap por fases y resumen ejecutivo. Úsala solo cuando William pida una auditoría del proyecto o de una parte (/auditoria-proyecto [bot|programado|tablero|todo]).
disable-model-invocation: true
argument-hint: "[bot | programado | tablero | todo]"
---

# Auditoría completa del proyecto

Alcance pedido: **$ARGUMENTS** (si está vacío, auditar todo lo disponible).

El encargo, las 23 secciones y el formato de salida son los del prompt de William en
[references/prompt-original.md](references/prompt-original.md). **Léalo completo antes de empezar y siga sus 23 secciones en orden.** Este archivo solo agrega cómo hacerlo con este repositorio y con evidencia.

## Reglas que mandan sobre todo lo demás
1. **Sin evidencia, no hay ✅.** Cada fila de la matriz cita su evidencia: nodo (`Archivo.json › Nodo`), línea del Code, salida de un script o documento (`docs/x.md`). Si no la hay: “NO SE PUEDE VERIFICAR CON LA INFORMACIÓN DISPONIBLE”.
2. **Que exista un nodo no significa que la función sirva.** Siga la ruta completa: disparador → decisión → Code → escritura en hoja → respuesta en Telegram. Un Schedule Trigger no prueba recordatorios; un Switch con salida sin conectar es 🔴.
3. **Lo que decide la IA (Gemini) no se puede probar sin ejecutarla.** Si una función depende de que el modelo clasifique bien (“Me pagaron $500.000” → ingreso), márquela ❓ o ⚠️ y diga qué parte sí está garantizada por código (validaciones de `Plan`/`Ejecutar`, atajos sin IA).
4. **Nunca muestre credenciales completas**; los IDs de credencial no son secretos, pero los tokens sí (enmascarar).
5. Prioridad: problemas reales primero, nada de felicitaciones de relleno. Español, dirigiéndose a él como “Ingeniero William”.

## Fuentes en este repo (el "plan" y la implementación)
| Qué | Dónde |
|---|---|
| Plan, reglas de negocio, versiones | `CLAUDE.md`, `docs/finanzas-arquitectura.md` |
| Errores abiertos y pendientes ya conocidos | `docs/pendientes.md`, `docs/lecciones-aprendidas.md` |
| Infraestructura, IDs | `docs/infraestructura.md`, `docs/ids-y-credenciales.md` |
| Flujos (implementación) | `flujos/<agente>/*.json` (hoy: `finanzas-bot-v16`, `finanzas-programado-v6`, `finanzas-errores-v1`) |
| Tablero (app web sobre la hoja de Finanzas) | `apps-script/tablero/` (`Codigo.gs`: `calcular` y las escrituras; `Index.html`; `README.md`) |

Antes de auditar, liste qué flujos del CLAUDE.md **no** están en el repo (p. ej. una versión nueva que William aún no exportó) y pídale a William los exports. Si sigue sin ellos, audite lo disponible y marque esos módulos como ❓ con esa razón; **no** estime su avance como si existieran.

## Procedimiento
1. **Inventario automático** de cada flujo (evidencia para las secciones 2, 15 y 16):
   ```bash
   S=.claude/skills/n8n-workflow-check/scripts
   python3 $S/mapa_flujo.py "Flujo.json" --rutas --code
   python3 $S/check_workflow.py *.json --modo produccion
   ```
2. **Leer el código de verdad**: los nodos Code clave (`Contexto`, `Plan`, `Ejecutar`, `Consultar`, `Atajo`, `Interpretar`, `Tablas`, `Solicitudes` en Finanzas). Ahí están las reglas de negocio, las validaciones y el prompt (`Contexto.instrucciones`). Mida el prompt real simulándolo (sección 11).
3. **Probar con casos** (secciones 5–8 y 13): use `node $S/simular_code.js` (ver skill `n8n-workflow-check`) sobre los Code que no dependen de la IA — `Atajo`, `Normalizar`, `Preparar candado`, `Ejecutar` con un `Plan` simulado — con las frases del prompt (“Gasté $50.000 en gasolina”, “Pago Netflix todos los meses por $26.900”…) y con fechas límite (fin de mes, 29-feb, cambio de año). Deje los casos en `auditorias/casos/` para repetirlos.
4. **Recurrentes (sección 6)**: responda los 14 puntos uno por uno con evidencia, cruzando la pestaña `Recurrentes`, el flujo Programado (`Agenda`, `Mensajes`) y las acciones del bot (`/suscripciones`, `/cobrar`). Un punto sin ruta conectada de principio a fin es 🔴.
5. **Duplicados y confirmaciones (13–14)**: verifique `Buscar en log` (clave `tg_<update_id>`), el candado de *Por confirmar* (Reservar → Esperar 3 s → Verificar) y que “Sí, correcto” como texto libre no vuelva a registrar.
6. **Avance (sección 4)**: haga explícita la tabla de requisitos con su peso (3/2/1) y su % para que la cuenta se pueda revisar; muestre la fórmula `Σ(peso×%)/Σ(peso)`.
7. **Tablero**: verifique que `calcular()` dé las mismas cifras que *Contexto*/*Reporte*. Verifique también que `registrarPago`/`deshacerCambio` escriban con el formato de `cobrar_cuota` y `/deshacer` (IDs `MOV-`/`OP-`, `Cuotas préstamo: ID=valor` en *Comentarios*), y que cada escritura tenga candado, validación en el servidor y clave anti doble toque. Una diferencia de lógica entre el bot y el tablero es 🔴: las cifras que William ve no cuadrarían.
8. **Cruce con lo conocido**: cada hallazgo que ya esté en `docs/pendientes.md` se marca “(ya conocido)”; los nuevos, “(nuevo)”. Las causas ya diagnosticadas en `docs/lecciones-aprendidas.md` no se vuelven a proponer como hallazgo.

## Entrega
- Guarde el informe completo en `auditorias/AAAA-MM-DD-auditoria-<alcance>.md` y haga commit.
- En el chat: solo el **resumen ejecutivo** (sección 23), los 5 problemas, las 5 acciones y la ruta del informe.
- Al final, diga con honestidad qué no se pudo ejecutar (nada corre dentro de n8n; la IA no se invoca; flujos ausentes).
- No modifique flujos durante la auditoría. Si William quiere corregir algo, se presenta el plan y se espera su "dale".
