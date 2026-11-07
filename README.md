# GymProcess

Agente inteligente de gimnasio en **n8n**: registra tus entrenamientos por Telegram en lenguaje natural,
te muestra tu última sesión, analiza tu progreso y te permite competir con amigos mediante retos y rankings justos.

| Documento | Contenido |
|---|---|
| [docs/00-arquitectura.md](docs/00-arquitectura.md) | Arquitectura, tecnologías, modelo de datos, workflows y plan de fases |
| [docs/fase-01.md](docs/fase-01.md) | Guía paso a paso de la Fase 1 |

```
db/sql/            esquema, funciones y semilla (se cargan en orden)
db/init/           script que crea la base "gym" al primer arranque de Docker
n8n/workflows/     workflows importables en n8n
docker-compose.yml n8n + PostgreSQL
```

Inicio rápido: `cp .env.example .env`, edita los valores y `docker compose up -d`. Detalles en la guía de la Fase 1.
