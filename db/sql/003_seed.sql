-- =====================================================================
-- GymProcess · Datos semilla (catálogo global)
-- Idempotente: se puede ejecutar varias veces.
-- =====================================================================

INSERT INTO privacy_metrics (code, description) VALUES
  ('profile',         'Nombre, nivel y datos básicos del perfil'),
  ('bodyweight',      'Peso corporal'),
  ('prs',             'Récords personales (peso máximo, reps)'),
  ('e1rm',            '1RM estimado por ejercicio'),
  ('volume',          'Volumen total de entrenamiento'),
  ('frequency',       'Entrenamientos por semana y consistencia'),
  ('progress',        'Progreso porcentual'),
  ('session_details', 'Detalle completo de cada sesión (series y notas)')
ON CONFLICT (code) DO NOTHING;

INSERT INTO muscle_groups (code, name) VALUES
  ('pecho','Pecho'), ('espalda','Espalda'), ('hombro','Hombro'),
  ('biceps','Bíceps'), ('triceps','Tríceps'), ('antebrazo','Antebrazo'),
  ('cuadriceps','Cuádriceps'), ('isquios','Isquiotibiales'), ('gluteo','Glúteo'),
  ('pantorrilla','Pantorrilla'), ('core','Core / Abdomen'), ('cuerpo_completo','Cuerpo completo')
ON CONFLICT (code) DO NOTHING;

-- Alias de grupos musculares (incluye "pierna" -> cuádriceps como grupo principal)
INSERT INTO muscle_group_aliases (alias_norm, muscle_group_id)
SELECT f_norm(a), m.id FROM (VALUES
  ('pecho','pecho'),('pectoral','pecho'),('pectorales','pecho'),('chest','pecho'),
  ('espalda','espalda'),('dorsal','espalda'),('dorsales','espalda'),('back','espalda'),
  ('hombro','hombro'),('hombros','hombro'),('deltoides','hombro'),
  ('biceps','biceps'),('bíceps','biceps'),
  ('triceps','triceps'),('tríceps','triceps'),
  ('antebrazo','antebrazo'),('antebrazos','antebrazo'),
  ('pierna','cuadriceps'),('piernas','cuadriceps'),('cuadriceps','cuadriceps'),('cuádriceps','cuadriceps'),
  ('femoral','isquios'),('femorales','isquios'),('isquios','isquios'),('isquiotibiales','isquios'),
  ('gluteo','gluteo'),('glúteo','gluteo'),('gluteos','gluteo'),('glúteos','gluteo'),
  ('pantorrilla','pantorrilla'),('pantorrillas','pantorrilla'),('gemelos','pantorrilla'),
  ('abdomen','core'),('abdominales','core'),('core','core'),
  ('full body','cuerpo_completo'),('cuerpo completo','cuerpo_completo')
) v(a, code) JOIN muscle_groups m ON m.code = v.code
ON CONFLICT (alias_norm) DO NOTHING;

-- Ejercicios base
INSERT INTO exercises (slug, name, primary_muscle_group_id, equipment, is_compound, is_bodyweight)
SELECT v.slug, v.name, m.id, v.equip, v.comp, v.bw FROM (VALUES
  ('press_banca','Press banca','pecho','barra',true,false),
  ('press_inclinado','Press inclinado','pecho','barra',true,false),
  ('press_inclinado_mancuerna','Press inclinado con mancuernas','pecho','mancuerna',true,false),
  ('press_banca_mancuerna','Press banca con mancuernas','pecho','mancuerna',true,false),
  ('aperturas','Aperturas','pecho','mancuerna',false,false),
  ('cruce_poleas','Cruce de poleas','pecho','polea',false,false),
  ('fondos','Fondos','triceps','peso_corporal',true,true),
  ('dominadas','Dominadas','espalda','peso_corporal',true,true),
  ('remo_barra','Remo con barra','espalda','barra',true,false),
  ('remo_mancuerna','Remo con mancuerna','espalda','mancuerna',true,false),
  ('jalon_pecho','Jalón al pecho','espalda','polea',true,false),
  ('remo_polea','Remo en polea baja','espalda','polea',true,false),
  ('peso_muerto','Peso muerto','espalda','barra',true,false),
  ('press_militar','Press militar','hombro','barra',true,false),
  ('press_hombro_mancuerna','Press de hombro con mancuernas','hombro','mancuerna',true,false),
  ('elevaciones_laterales','Elevaciones laterales','hombro','mancuerna',false,false),
  ('face_pull','Face pull','hombro','polea',false,false),
  ('curl_barra','Curl con barra','biceps','barra',false,false),
  ('curl_mancuerna','Curl con mancuernas','biceps','mancuerna',false,false),
  ('curl_martillo','Curl martillo','biceps','mancuerna',false,false),
  ('extension_triceps_polea','Extensión de tríceps en polea','triceps','polea',false,false),
  ('press_frances','Press francés','triceps','barra',false,false),
  ('sentadilla','Sentadilla','cuadriceps','barra',true,false),
  ('prensa','Prensa de piernas','cuadriceps','maquina',true,false),
  ('extension_cuadriceps','Extensión de cuádriceps','cuadriceps','maquina',false,false),
  ('zancadas','Zancadas','cuadriceps','mancuerna',true,false),
  ('peso_muerto_rumano','Peso muerto rumano','isquios','barra',true,false),
  ('curl_femoral','Curl femoral','isquios','maquina',false,false),
  ('hip_thrust','Hip thrust','gluteo','barra',true,false),
  ('elevacion_talones','Elevación de talones','pantorrilla','maquina',false,false),
  ('plancha','Plancha','core','peso_corporal',false,true),
  ('crunch_polea','Crunch en polea','core','polea',false,false)
) v(slug,name,mg,equip,comp,bw) JOIN muscle_groups m ON m.code = v.mg
ON CONFLICT (slug) DO NOTHING;

-- Grupos secundarios relevantes
INSERT INTO exercise_muscle_groups (exercise_id, muscle_group_id)
SELECT e.id, m.id FROM (VALUES
  ('press_banca','triceps'),('press_banca','hombro'),('press_inclinado','hombro'),
  ('fondos','pecho'),('dominadas','biceps'),('remo_barra','biceps'),
  ('peso_muerto','isquios'),('peso_muerto','gluteo'),('sentadilla','gluteo'),
  ('press_militar','triceps'),('hip_thrust','isquios'),('zancadas','gluteo')
) v(slug, mg) JOIN exercises e ON e.slug = v.slug JOIN muscle_groups m ON m.code = v.mg
ON CONFLICT DO NOTHING;

-- Alias: el nombre oficial + el slug con espacios + sinónimos comunes
INSERT INTO exercise_aliases (alias_norm, exercise_id)
SELECT f_norm(name), id FROM exercises
UNION
SELECT f_norm(replace(slug,'_',' ')), id FROM exercises
ON CONFLICT (alias_norm) DO NOTHING;

INSERT INTO exercise_aliases (alias_norm, exercise_id)
SELECT f_norm(a), e.id FROM (VALUES
  ('press de banca','press_banca'),('banca','press_banca'),('press plano','press_banca'),('bench press','press_banca'),('bench','press_banca'),
  ('press inclinado con barra','press_inclinado'),('inclinado','press_inclinado'),('incline bench','press_inclinado'),
  ('aperturas con mancuernas','aperturas'),('flyes','aperturas'),('aperturas planas','aperturas'),
  ('crossover','cruce_poleas'),('cruces','cruce_poleas'),
  ('dips','fondos'),('fondos en paralelas','fondos'),
  ('pull ups','dominadas'),('pullups','dominadas'),('dominada','dominadas'),
  ('remo','remo_barra'),('remo con barra','remo_barra'),('barbell row','remo_barra'),
  ('jalon','jalon_pecho'),('jalón','jalon_pecho'),('lat pulldown','jalon_pecho'),('polea al pecho','jalon_pecho'),
  ('remo sentado','remo_polea'),('remo gironda','remo_polea'),
  ('deadlift','peso_muerto'),('muerto','peso_muerto'),
  ('press militar con barra','press_militar'),('ohp','press_militar'),('press de hombro','press_militar'),
  ('laterales','elevaciones_laterales'),('elevaciones laterales con mancuernas','elevaciones_laterales'),
  ('curl de biceps','curl_barra'),('curl bíceps','curl_barra'),
  ('martillo','curl_martillo'),
  ('extension de triceps','extension_triceps_polea'),('jalon de triceps','extension_triceps_polea'),('pushdown','extension_triceps_polea'),
  ('rompecraneos','press_frances'),('skull crusher','press_frances'),
  ('squat','sentadilla'),('sentadillas','sentadilla'),('sentadilla con barra','sentadilla'),
  ('leg press','prensa'),('prensa','prensa'),
  ('extensiones','extension_cuadriceps'),('leg extension','extension_cuadriceps'),
  ('lunges','zancadas'),('desplantes','zancadas'),
  ('rdl','peso_muerto_rumano'),('rumano','peso_muerto_rumano'),
  ('femoral acostado','curl_femoral'),('leg curl','curl_femoral'),
  ('gemelos','elevacion_talones'),('pantorrilla','elevacion_talones'),('calf raise','elevacion_talones')
) v(a, slug) JOIN exercises e ON e.slug = v.slug
ON CONFLICT (alias_norm) DO NOTHING;
