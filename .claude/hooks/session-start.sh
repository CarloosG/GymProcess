#!/bin/bash
# Prepara las skills del proyecto al iniciar sesión: instala Luxon para el simulador de nodos Code
# (.claude/skills/n8n-workflow-check). Idempotente: si ya está instalado, no hace nada.
set -euo pipefail

SKILL="${CLAUDE_PROJECT_DIR:-$(pwd)}/.claude/skills/n8n-workflow-check"
[ -f "$SKILL/package.json" ] || exit 0
[ -d "$SKILL/node_modules/luxon" ] && exit 0
command -v npm >/dev/null 2>&1 || { echo "npm no está instalado: el simulador de nodos Code no funcionará." >&2; exit 0; }

npm install --prefix "$SKILL" --no-audit --no-fund --silent
