# Fase 1 · Configuración inicial de n8n y base de datos

**Qué construimos:** n8n y PostgreSQL en Docker, la base `gym` con todo el esquema y el catálogo de ejercicios,
un bot de Telegram y dos workflows de prueba. Al terminar, escribes al bot y te responde leyendo/escribiendo en la BD.

**Requisitos:** Docker Desktop (o Docker + Compose en un VPS), una cuenta de Telegram. ~30 minutos.

---

## Paso 1 · Levantar n8n + Postgres

```bash
git clone https://github.com/CarloosG/GymProcess.git
```

```bash
cd GymProcess && cp .env.example .env
```

Edita `.env`: pon contraseñas reales (puedes generarlas con `openssl rand -hex 24`) y tu `TIMEZONE`
(p. ej. `America/Bogota`, `Europe/Madrid`). **Guarda `N8N_ENCRYPTION_KEY`**: si la pierdes, n8n no podrá descifrar tus credenciales.

> Si tu zona horaria no es `America/Mexico_City`, cambia también el `DEFAULT` de `users.timezone` en
> `db/sql/001_schema.sql` **antes** del primer arranque (o luego con `UPDATE users SET timezone=...`).

```bash
docker compose up -d
```

```bash
docker compose logs postgres | grep "==>"
```

Debes ver `==> Base de datos gym lista`. Abre http://localhost:5678 y crea tu cuenta de administrador de n8n.

**Problemas frecuentes**

| Síntoma | Causa / solución |
|---|---|
| No aparece "Base de datos gym lista" | El script de init solo corre con el volumen vacío. Si arrancaste antes con otro `.env`: `docker compose down -v` (borra datos) y vuelve a subir. |
| `password authentication failed` | Cambiaste contraseñas en `.env` después del primer arranque. Mismo arreglo que arriba. |
| Puerto 5432 ocupado | Ya tienes Postgres local. Cambia a `"127.0.0.1:5433:5432"` en `docker-compose.yml`. |

## Paso 2 · Credencial de Postgres en n8n

n8n → **Credentials → Add credential → Postgres**:

| Campo | Valor |
|---|---|
| Name | `Gym DB` |
| Host | `postgres` (nombre del servicio Docker, no `localhost`) |
| Database | `gym` |
| User / Password | `GYM_APP_USER` / `GYM_APP_PASSWORD` de tu `.env` |
| Port | `5432` · SSL: `disable` |

Pulsa **Test** → *Connection tested successfully*.

## Paso 3 · Probar la BD (workflow 00)

1. **Workflows → Import from file** → `n8n/workflows/00_db_healthcheck.json`.
2. Abre el nodo **Comprobar BD** y selecciona la credencial `Gym DB`.
3. **Execute workflow**. Resultado esperado:

| grupos_musculares | ejercicios | alias | prueba_alias | prueba_e1rm_60x10 | rol |
|---|---|---|---|---|---|
| 12 | 32 | 102 | `Press banca` | 80.0 | gym_app |

Si `rol` no es `gym_app`, la credencial está usando el usuario administrador: corrígelo (mínimo privilegio).

## Paso 4 · Crear el bot de Telegram

1. En Telegram abre **@BotFather** → `/newbot` → nombre (`GymProcess`) y usuario (`tu_gym_bot`).
2. Copia el **token** (`123456:ABC...`). Trátalo como contraseña.
3. Opcional: `/setcommands` → pega:
   ```
   start - Empezar
   ayuda - Qué puedo hacer
   ```
4. n8n → **Credentials → Telegram API** → Name `Gym Bot`, Access Token = el token → Save.

## Paso 5 · URL pública HTTPS (obligatoria para Telegram)

El nodo *Telegram Trigger* registra un webhook y Telegram solo envía a HTTPS público.

- **En tu PC (pruebas):** instala [cloudflared](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/) y ejecuta:
  ```bash
  cloudflared tunnel --url http://localhost:5678
  ```
  Copia la URL `https://xxxx.trycloudflare.com`, ponla en `.env` como `WEBHOOK_URL=https://xxxx.trycloudflare.com/` y reinicia:
  ```bash
  docker compose up -d n8n
  ```
  Esta URL cambia cada vez que reinicias el túnel; en la Fase 10 la dejamos fija con dominio propio.
- **En un VPS con dominio:** `WEBHOOK_URL=https://n8n.tudominio.com/` detrás de Caddy/Traefik (Fase 10).
- **n8n Cloud:** no necesitas nada de esto.

## Paso 6 · Bot conectado a la BD (workflow 01)

1. Importa `n8n/workflows/01_telegram_ping.json`.
2. Asigna credenciales: `Gym Bot` en **Telegram Trigger** y **Responder**; `Gym DB` en **Registrar usuario y mensaje**.
3. Activa el workflow (interruptor **Active** arriba a la derecha).
4. Escribe al bot: `hola`.

Respuesta esperada (primera vez):

```
👋 ¡Bienvenido/a, Carlos! Tu perfil se creó.

Conexión OK:
• Tu ID interno: 1
• Zona horaria: America/Mexico_City
• Ejercicios en catálogo: 32
• Sesiones registradas: 0

Recibí: "hola"
```

La segunda vez dirá `✅ Hola de nuevo`. Qué hace el workflow:

```
Telegram Trigger → Registrar usuario y mensaje (Postgres) → ¿Mensaje nuevo? (IF) → Responder (Telegram)
```

- `fn_upsert_telegram_user()` crea el usuario, su perfil y su configuración de privacidad por defecto (una sola vez).
- `message_log` guarda el `update_id`; si Telegram reintenta el mismo mensaje, el IF lo descarta → sin duplicados.

## Paso 7 · Checklist de aceptación

- [ ] `00 · DB Healthcheck` devuelve 12 / 32 / 102 y `rol = gym_app`.
- [ ] El bot responde "Bienvenido" la primera vez y "Hola de nuevo" después.
- [ ] En n8n → Executions, el workflow 01 sale en verde.
- [ ] Opcional: un amigo escribe al bot y obtiene un ID interno distinto.

Comprobación directa en la BD:

```bash
docker compose exec postgres psql -U gym_admin -d gym -c "select id, telegram_id, username, display_name from users; select update_id, text from message_log order by id desc limit 5;"
```

**Errores típicos del paso 6**

| Síntoma | Solución |
|---|---|
| Al activar: *Bad Request: bad webhook: HTTPS url must be provided* | `WEBHOOK_URL` no es HTTPS o no reiniciaste n8n tras cambiarla. |
| El bot no responde, sin ejecuciones | Workflow no activo, o túnel caído (la URL de cloudflared cambió). |
| Ejecución roja en Postgres: `permission denied` | Script de init no aplicó los GRANT → revisa logs de postgres. |
| `function fn_upsert_telegram_user does not exist` | La credencial apunta a la base `n8n` en lugar de `gym`. |
| Solo puede haber un webhook por bot | Desactiva el workflow 01 antes de activar el agente de la Fase 2 (usarán el mismo bot). |

---

Cuando todo esté en verde → **Fase 2: agente conversacional** (nueva sesión, ver `CLAUDE.md`).
