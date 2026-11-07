# GymProcess — contexto para Claude

Agente de gimnasio en **n8n** con interfaz **Telegram**, LLM **OpenAI (gpt-4.1-mini)** y **PostgreSQL 16**.
Registra entrenamientos en lenguaje natural, consulta historial, analiza progreso y tiene módulo social
(amigos, privacidad por métrica, retos, rankings justos). Idioma del usuario y de la documentación: español.

Arquitectura completa: `docs/00-arquitectura.md`. Cada fase tiene su guía en `docs/fase-XX.md`.

## Reglas de diseño (no romper)
- El LLM nunca genera SQL ni decide el `user_id`: el router lo inyecta en cada tool (sub-workflow).
- Lógica crítica en SQL: `fn_can_view` (privacidad), `f_e1rm` (Epley, 1-12 reps), `UNIQUE` para dedupe.
- Pesos siempre en kg. Fechas de sesión en la zona horaria del usuario (`users.timezone`).
- Flujo de escritura: extraer JSON → validar (Code) → preguntar si falta algo → guardar → confirmar.
- Usuario de BD de n8n: `gym_app` (sin permisos DDL). Cambios de esquema = nuevo archivo `db/sql/00N_*.sql`.
- Workflows exportados en `n8n/workflows/NN_nombre.json`; credenciales referenciadas por nombre: `Gym DB`, `Gym Bot`, `OpenAI`.

## Estado de fases
- [x] Fase 1 — Docker + esquema + workflows 00 y 01 (pendiente: validación del usuario en su n8n)
- [ ] Fase 2 — Agente router (workflow 10)
- [ ] Fase 3 — Registro (20) · [ ] 4 Historial (21) · [ ] 5 Progreso (22) · [ ] 6 Perfil (30)
- [ ] 7 Amigos/privacidad (31, 32) · [ ] 8 Retos/rankings (33, 34) · [ ] 9 Reportes (40-42) · [ ] 10 Producción

## Probar SQL localmente
Postgres 16 suele estar instalado en el contenedor de desarrollo: `initdb` en un dir temporal, cargar
`db/sql/*.sql` en orden y ejecutar consultas de prueba antes de entregarlas.
