-- =====================================================================
-- GymProcess · Funciones y vistas
-- La lógica crítica (dedupe, permisos, métricas) vive en SQL para que
-- n8n y el LLM no puedan saltársela.
-- =====================================================================

-- 1RM estimado (Epley). Solo fiable entre 1 y 12 reps.
CREATE OR REPLACE FUNCTION f_e1rm(w numeric, r int) RETURNS numeric
LANGUAGE sql IMMUTABLE PARALLEL SAFE AS
$$ SELECT CASE WHEN r IS NULL OR r < 1 OR r > 12 OR w IS NULL OR w <= 0 THEN NULL
               WHEN r = 1 THEN w
               ELSE round(w * (1 + r / 30.0), 1) END $$;

-- ---------------------------------------------------------------------
-- Alta / actualización de usuario desde Telegram (idempotente)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_upsert_telegram_user(
  p_telegram_id bigint, p_username text, p_first_name text, p_language text DEFAULT 'es')
RETURNS TABLE (user_id bigint, display_name text, is_new boolean, timezone text)
LANGUAGE plpgsql AS $$
DECLARE v_user users%ROWTYPE; v_new boolean := false;
BEGIN
  SELECT * INTO v_user FROM users u WHERE u.telegram_id = p_telegram_id;
  IF NOT FOUND THEN
    INSERT INTO users (telegram_id, username, display_name, language)
    VALUES (p_telegram_id,
            -- el username de Telegram puede no cumplir el formato o estar tomado
            CASE WHEN lower(p_username) ~ '^[a-z0-9_]{3,30}$'
                  AND NOT EXISTS (SELECT 1 FROM users x WHERE x.username = lower(p_username))
                 THEN lower(p_username) END,
            coalesce(nullif(p_first_name,''), 'Atleta'),
            coalesce(nullif(left(p_language,2),''), 'es'))
    RETURNING * INTO v_user;
    INSERT INTO user_profiles (user_id) VALUES (v_user.id);
    INSERT INTO privacy_settings (user_id, metric, audience)
      SELECT v_user.id, code, 'friends' FROM privacy_metrics WHERE code <> 'session_details'
      UNION ALL SELECT v_user.id, 'session_details', 'nobody';
    v_new := true;
  ELSE
    UPDATE users SET updated_at = now() WHERE id = v_user.id;
  END IF;
  RETURN QUERY SELECT v_user.id, v_user.display_name, v_new, v_user.timezone;
END $$;

-- ---------------------------------------------------------------------
-- Resolución de nombres (texto libre -> id). Exacto, luego difuso.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_resolve_exercise(p_text text)
RETURNS TABLE (exercise_id int, name text, match_type text, similarity real)
LANGUAGE sql STABLE AS $$
  (SELECT e.id, e.name, 'exact'::text, 1.0::real
     FROM exercise_aliases a JOIN exercises e ON e.id = a.exercise_id
    WHERE a.alias_norm = f_norm(p_text))
  UNION ALL
  (SELECT id, name, 'fuzzy'::text, sim FROM (
     SELECT DISTINCT ON (e.id) e.id, e.name, similarity(a.alias_norm, f_norm(p_text)) AS sim
       FROM exercise_aliases a JOIN exercises e ON e.id = a.exercise_id
      WHERE a.alias_norm % f_norm(p_text)
        AND NOT EXISTS (SELECT 1 FROM exercise_aliases x WHERE x.alias_norm = f_norm(p_text))
      ORDER BY e.id, sim DESC) best
    ORDER BY sim DESC LIMIT 3)
$$;

CREATE OR REPLACE FUNCTION fn_resolve_muscle_group(p_text text)
RETURNS TABLE (muscle_group_id smallint, code text, name text)
LANGUAGE sql STABLE AS $$
  SELECT m.id, m.code, m.name FROM muscle_group_aliases a
  JOIN muscle_groups m ON m.id = a.muscle_group_id
  WHERE a.alias_norm = f_norm(p_text)
$$;

-- ---------------------------------------------------------------------
-- Vista base de series con métricas derivadas
-- ---------------------------------------------------------------------
CREATE OR REPLACE VIEW v_sets AS
SELECT ws.user_id, ws.id AS session_id, ws.session_date,
       se.id AS session_exercise_id, se.exercise_id, e.name AS exercise_name,
       e.primary_muscle_group_id AS muscle_group_id, mg.code AS muscle_group,
       s.id AS set_id, s.set_number, s.weight_kg, s.reps, s.rpe, s.is_warmup,
       (s.weight_kg * s.reps) AS volume_kg,
       f_e1rm(s.weight_kg, s.reps) AS e1rm
FROM sets s
JOIN session_exercises se ON se.id = s.session_exercise_id
JOIN workout_sessions ws ON ws.id = se.session_id
JOIN exercises e ON e.id = se.exercise_id
JOIN muscle_groups mg ON mg.id = e.primary_muscle_group_id;

-- ---------------------------------------------------------------------
-- Permisos: ¿puede viewer ver la métrica X de owner?
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_are_friends(a bigint, b bigint) RETURNS boolean
LANGUAGE sql STABLE AS $$
  SELECT EXISTS (SELECT 1 FROM friendships
                  WHERE user_low_id = least(a,b) AND user_high_id = greatest(a,b)
                    AND status = 'accepted')
$$;

CREATE OR REPLACE FUNCTION fn_can_view(p_viewer bigint, p_owner bigint, p_metric text)
RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT CASE
    WHEN p_viewer = p_owner THEN true
    WHEN EXISTS (SELECT 1 FROM friendships
                  WHERE user_low_id = least(p_viewer,p_owner) AND user_high_id = greatest(p_viewer,p_owner)
                    AND status = 'blocked') THEN false
    ELSE coalesce(
      (SELECT allowed FROM privacy_overrides
        WHERE owner_id = p_owner AND viewer_id = p_viewer AND metric = p_metric),
      (SELECT CASE audience
                WHEN 'everyone' THEN true
                WHEN 'friends'  THEN fn_are_friends(p_viewer, p_owner)
                ELSE false END
         FROM privacy_settings WHERE user_id = p_owner AND metric = p_metric),
      false)
  END
$$;
