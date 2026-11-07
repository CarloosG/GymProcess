-- =====================================================================
-- GymProcess · Esquema inicial (PostgreSQL 15+)
-- Diseñado completo desde el día 1 para no migrar después; cada fase
-- solo "enciende" las tablas que necesita.
-- Convenciones:
--   * Toda tabla con datos personales tiene user_id -> aislamiento por usuario.
--   * Pesos SIEMPRE en kg (numeric). Conversión de lb se hace al registrar.
--   * Fechas de entrenamiento como DATE en la zona horaria del usuario.
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS pg_trgm;   -- búsqueda difusa de nombres de ejercicio
CREATE EXTENSION IF NOT EXISTS unaccent;  -- "press banca" == "prés bánca"
CREATE EXTENSION IF NOT EXISTS pgcrypto;  -- tokens de invitación

-- Función inmutable para poder indexar unaccent(lower(x))
CREATE OR REPLACE FUNCTION f_norm(txt text) RETURNS text
LANGUAGE sql IMMUTABLE PARALLEL SAFE AS
$$ SELECT regexp_replace(lower(public.unaccent('public.unaccent'::regdictionary, coalesce(txt,''))), '\s+', ' ', 'g') $$;

-- ---------------------------------------------------------------------
-- 1. USUARIOS Y PERFILES
-- ---------------------------------------------------------------------
CREATE TABLE users (
  id               bigserial PRIMARY KEY,
  telegram_id      bigint UNIQUE,                 -- identidad del canal (Telegram)
  whatsapp_id      text UNIQUE,                   -- reservado para futuro
  username         text UNIQUE,                   -- @handle público para buscar amigos
  display_name     text NOT NULL,
  timezone         text NOT NULL DEFAULT 'America/Mexico_City',  -- AJUSTA a tu zona
  language         text NOT NULL DEFAULT 'es',
  preferred_unit   text NOT NULL DEFAULT 'kg' CHECK (preferred_unit IN ('kg','lb')),
  invite_code      text UNIQUE NOT NULL DEFAULT upper(substr(md5(random()::text),1,8)),
  is_active        boolean NOT NULL DEFAULT true,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT username_format CHECK (username IS NULL OR username ~ '^[a-z0-9_]{3,30}$')
);

CREATE TABLE user_profiles (
  user_id          bigint PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  sex              text CHECK (sex IN ('M','F','X')),
  birth_date       date,
  height_cm        numeric(5,1) CHECK (height_cm BETWEEN 100 AND 250),
  experience_level text CHECK (experience_level IN ('principiante','intermedio','avanzado')),
  goals            text,
  updated_at       timestamptz NOT NULL DEFAULT now()
);

-- Peso corporal histórico (fuerza relativa / categorías de peso)
CREATE TABLE body_weight_logs (
  id               bigserial PRIMARY KEY,
  user_id          bigint NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  measured_on      date NOT NULL,
  weight_kg        numeric(5,1) NOT NULL CHECK (weight_kg BETWEEN 25 AND 350),
  created_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, measured_on)
);

-- ---------------------------------------------------------------------
-- 2. CATÁLOGO: GRUPOS MUSCULARES Y EJERCICIOS
-- ---------------------------------------------------------------------
CREATE TABLE muscle_groups (
  id               smallserial PRIMARY KEY,
  code             text UNIQUE NOT NULL,          -- 'pecho', 'espalda'...
  name             text NOT NULL
);

CREATE TABLE exercises (
  id               serial PRIMARY KEY,
  slug             text UNIQUE NOT NULL,          -- 'press_banca'
  name             text NOT NULL,                 -- 'Press banca'
  primary_muscle_group_id smallint NOT NULL REFERENCES muscle_groups(id),
  equipment        text,                          -- barra, mancuerna, máquina, polea, peso_corporal
  is_compound      boolean NOT NULL DEFAULT false,
  is_bodyweight    boolean NOT NULL DEFAULT false,-- dominadas, fondos: weight_kg = lastre
  created_by       bigint REFERENCES users(id) ON DELETE SET NULL, -- NULL = catálogo global
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE exercise_muscle_groups (            -- grupos secundarios
  exercise_id      int REFERENCES exercises(id) ON DELETE CASCADE,
  muscle_group_id  smallint REFERENCES muscle_groups(id),
  PRIMARY KEY (exercise_id, muscle_group_id)
);

-- Sinónimos para normalizar lo que escribe el usuario
CREATE TABLE exercise_aliases (
  alias_norm       text PRIMARY KEY,              -- f_norm(alias)
  exercise_id      int NOT NULL REFERENCES exercises(id) ON DELETE CASCADE
);
CREATE INDEX exercise_aliases_trgm ON exercise_aliases USING gin (alias_norm gin_trgm_ops);

CREATE TABLE muscle_group_aliases (
  alias_norm       text PRIMARY KEY,
  muscle_group_id  smallint NOT NULL REFERENCES muscle_groups(id) ON DELETE CASCADE
);

-- ---------------------------------------------------------------------
-- 3. ENTRENAMIENTOS: sesión -> ejercicio -> series
-- ---------------------------------------------------------------------
CREATE TABLE workout_sessions (
  id               bigserial PRIMARY KEY,
  user_id          bigint NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_date     date NOT NULL,
  notes            text,
  source           text NOT NULL DEFAULT 'telegram',
  source_message_id text,                         -- id del mensaje -> evita duplicados
  created_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, source, source_message_id)
);
CREATE INDEX workout_sessions_user_date ON workout_sessions (user_id, session_date DESC);

CREATE TABLE session_exercises (
  id               bigserial PRIMARY KEY,
  session_id       bigint NOT NULL REFERENCES workout_sessions(id) ON DELETE CASCADE,
  exercise_id      int NOT NULL REFERENCES exercises(id),
  position         smallint NOT NULL DEFAULT 1,
  notes            text,
  UNIQUE (session_id, exercise_id)               -- un ejercicio por sesión (se agregan series)
);
CREATE INDEX session_exercises_exercise ON session_exercises (exercise_id);

CREATE TABLE sets (
  id               bigserial PRIMARY KEY,
  session_exercise_id bigint NOT NULL REFERENCES session_exercises(id) ON DELETE CASCADE,
  set_number       smallint NOT NULL CHECK (set_number > 0),
  weight_kg        numeric(6,2) NOT NULL CHECK (weight_kg >= 0 AND weight_kg <= 1000),
  reps             smallint NOT NULL CHECK (reps BETWEEN 0 AND 200),
  rpe              numeric(3,1) CHECK (rpe BETWEEN 1 AND 10),
  is_warmup        boolean NOT NULL DEFAULT false,
  created_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (session_exercise_id, set_number)
);

-- Récords personales: historial (cada vez que se supera uno, nueva fila)
CREATE TABLE personal_records (
  id               bigserial PRIMARY KEY,
  user_id          bigint NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  exercise_id      int NOT NULL REFERENCES exercises(id),
  record_type      text NOT NULL CHECK (record_type IN ('max_weight','e1rm','max_reps','max_volume_session')),
  value            numeric(10,2) NOT NULL,
  weight_kg        numeric(6,2),
  reps             smallint,
  set_id           bigint REFERENCES sets(id) ON DELETE SET NULL,
  session_id       bigint REFERENCES workout_sessions(id) ON DELETE CASCADE,
  achieved_on      date NOT NULL,
  created_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX personal_records_lookup ON personal_records (user_id, exercise_id, record_type, value DESC);

-- ---------------------------------------------------------------------
-- 4. SOCIAL: amigos, invitaciones, privacidad
-- ---------------------------------------------------------------------
CREATE TABLE friendships (
  user_low_id      bigint NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_high_id     bigint NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status           text NOT NULL CHECK (status IN ('pending','accepted','blocked')),
  requested_by     bigint NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at       timestamptz NOT NULL DEFAULT now(),
  responded_at     timestamptz,
  PRIMARY KEY (user_low_id, user_high_id),
  CHECK (user_low_id < user_high_id)              -- una sola fila por pareja
);

CREATE TABLE invitations (
  id               bigserial PRIMARY KEY,
  token            text UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(12),'hex'), -- para enlace t.me/bot?start=<token>
  inviter_id       bigint NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  invitee_id       bigint REFERENCES users(id) ON DELETE CASCADE,  -- NULL si es enlace abierto
  channel          text NOT NULL CHECK (channel IN ('username','code','link')),
  status           text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','declined','expired','revoked')),
  expires_at       timestamptz NOT NULL DEFAULT now() + interval '7 days',
  created_at       timestamptz NOT NULL DEFAULT now(),
  responded_at     timestamptz
);

-- Métricas compartibles (catálogo cerrado)
CREATE TABLE privacy_metrics (
  code             text PRIMARY KEY,
  description      text NOT NULL
);

-- Política por defecto de cada usuario y métrica
CREATE TABLE privacy_settings (
  user_id          bigint NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  metric           text NOT NULL REFERENCES privacy_metrics(code),
  audience         text NOT NULL CHECK (audience IN ('nobody','friends','everyone')),
  PRIMARY KEY (user_id, metric)
);

-- Excepciones por amigo concreto (permitir/denegar)
CREATE TABLE privacy_overrides (
  owner_id         bigint NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  viewer_id        bigint NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  metric           text NOT NULL REFERENCES privacy_metrics(code),
  allowed          boolean NOT NULL,
  PRIMARY KEY (owner_id, viewer_id, metric)
);

-- ---------------------------------------------------------------------
-- 5. COMPETENCIA: retos y rankings
-- ---------------------------------------------------------------------
CREATE TABLE challenges (
  id               bigserial PRIMARY KEY,
  name             text NOT NULL,
  created_by       bigint NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  metric           text NOT NULL CHECK (metric IN (
                     'e1rm_improvement_pct','e1rm_improvement_kg','relative_strength',
                     'session_count','total_volume','weekly_volume','consistency_pct','custom')),
  exercise_id      int REFERENCES exercises(id),  -- NULL si la métrica no es por ejercicio
  start_date       date NOT NULL,
  end_date         date NOT NULL,
  rules            jsonb NOT NULL DEFAULT '{}',   -- p.ej. {"min_sessions":8,"bodyweight_required":true}
  status           text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','active','finished','cancelled')),
  winner_user_id   bigint REFERENCES users(id),
  created_at       timestamptz NOT NULL DEFAULT now(),
  CHECK (end_date > start_date)
);

CREATE TABLE challenge_participants (
  challenge_id     bigint NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
  user_id          bigint NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status           text NOT NULL DEFAULT 'invited' CHECK (status IN ('invited','accepted','declined','withdrawn')),
  baseline_value   numeric(12,2),                 -- valor al inicio (para % de mejora)
  current_value    numeric(12,2),
  current_rank     smallint,
  joined_at        timestamptz,
  PRIMARY KEY (challenge_id, user_id)
);

-- Historial de cálculos de cada reto (resultado actualizado en el tiempo)
CREATE TABLE challenge_results_history (
  id               bigserial PRIMARY KEY,
  challenge_id     bigint NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
  user_id          bigint NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  computed_at      timestamptz NOT NULL DEFAULT now(),
  value            numeric(12,2),
  rank             smallint
);

-- Rankings: se calculan al vuelo; se guarda una "foto" cuando se publica
CREATE TABLE ranking_snapshots (
  id               bigserial PRIMARY KEY,
  requested_by     bigint REFERENCES users(id) ON DELETE SET NULL,
  scope            text NOT NULL CHECK (scope IN ('friends','challenge','global')),
  metric           text NOT NULL,
  exercise_id      int REFERENCES exercises(id),
  period_start     date NOT NULL,
  period_end       date NOT NULL,
  criteria         jsonb NOT NULL DEFAULT '{}',   -- explicación del criterio mostrado al usuario
  generated_at     timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE ranking_entries (
  snapshot_id      bigint NOT NULL REFERENCES ranking_snapshots(id) ON DELETE CASCADE,
  user_id          bigint NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  position         smallint NOT NULL,
  value            numeric(12,2),
  details          jsonb,
  PRIMARY KEY (snapshot_id, user_id)
);

-- ---------------------------------------------------------------------
-- 6. OPERACIÓN: log de mensajes (idempotencia + auditoría)
-- ---------------------------------------------------------------------
CREATE TABLE message_log (
  id               bigserial PRIMARY KEY,
  channel          text NOT NULL DEFAULT 'telegram',
  update_id        bigint NOT NULL,               -- Telegram reintenta: mismo update_id
  user_id          bigint REFERENCES users(id) ON DELETE SET NULL,
  direction        text NOT NULL CHECK (direction IN ('in','out')),
  text             text,
  intent           text,
  created_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (channel, update_id, direction)
);
