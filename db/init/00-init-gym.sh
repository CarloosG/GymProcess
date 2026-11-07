#!/bin/sh
# Se ejecuta automáticamente la primera vez que arranca el contenedor de Postgres.
# Crea la base "gym", el usuario restringido y carga esquema + funciones + semilla.
set -e

psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d postgres <<SQL
CREATE ROLE ${GYM_APP_USER} LOGIN PASSWORD '${GYM_APP_PASSWORD}';
CREATE DATABASE ${GYM_DB};
SQL

for f in /gym-sql/*.sql; do
  echo "==> Ejecutando $f"
  psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$GYM_DB" -f "$f"
done

# Mínimo privilegio: gym_app puede leer/escribir datos, NO alterar el esquema.
psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$GYM_DB" <<SQL
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
GRANT CONNECT ON DATABASE ${GYM_DB} TO ${GYM_APP_USER};
GRANT USAGE ON SCHEMA public TO ${GYM_APP_USER};
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO ${GYM_APP_USER};
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO ${GYM_APP_USER};
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO ${GYM_APP_USER};
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO ${GYM_APP_USER};
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO ${GYM_APP_USER};
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO ${GYM_APP_USER};
SQL
echo "==> Base de datos gym lista"
