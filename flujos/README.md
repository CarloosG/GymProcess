# Flujos de n8n

| Agente | Flujo | Versión | Archivo |
|---|---|---|---|

- Nombre: `<agente>-<flujo>-v<N>.json`, minúsculas, sin espacios. Solo la versión vigente.
- Exportar: flujo → ⋯ → Download; `pinData` vacío.
- Importar: Create workflow → ⋯ → Import from file → reasignar credenciales y *Error workflow* → **despublicar la vieja** → publicar la nueva → probar (válido, inválido, duplicado).
