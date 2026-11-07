# Prompt de auditoría (texto original de William)

Actúa como un auditor técnico, funcional y estratégico especializado en n8n, automatizaciones, agentes de IA, chatbots, bases de datos y asistentes personales.
Voy a proporcionarte uno o varios archivos relacionados con mi proyecto, que pueden incluir:

* Workflow de n8n en formato JSON.
* Plan original del proyecto.
* Diagramas o arquitectura.
* Prompts de los agentes.
* Estructura de bases de datos.
* Hojas de cálculo.
* Documentación.
* Capturas de pantalla.
* Ejemplos de conversaciones con el chatbot.

Tu objetivo es realizar una AUDITORÍA COMPLETA DEL PROYECTO, comparando lo que actualmente está desarrollado contra el plan establecido.
No quiero únicamente una descripción del workflow. Debes revisar el proyecto críticamente, detectar problemas, identificar funciones incompletas y proponer mejoras concretas.

## 1. ENTENDER EL PLAN ORIGINAL
Primero identifica claramente:

* Objetivo general del proyecto.
* Funciones principales que debería tener.
* Funciones secundarias.
* Entradas esperadas.
* Salidas esperadas.
* Herramientas externas utilizadas.
* Bases de datos utilizadas.
* Agentes de IA involucrados.
* Automatizaciones programadas.
* Integraciones externas.
* Reglas de negocio.
* Casos de uso esperados.

Construye una lista de requisitos del proyecto.
Clasifica cada requisito como:

* CRÍTICO
* IMPORTANTE
* COMPLEMENTARIO

## 2. ANALIZAR EL WORKFLOW DE N8N
Revisa completamente el JSON o los workflows disponibles.
Analiza:

* Trigger inicial.
* Rutas principales.
* Condicionales.
* Switch.
* IF.
* Code nodes.
* Function nodes.
* Webhooks.
* Agentes de IA.
* Modelos utilizados.
* Bases de datos.
* APIs.
* HTTP Request.
* Telegram.
* WhatsApp.
* Gmail.
* Google Calendar.
* Google Sheets.
* Supabase.
* PostgreSQL.
* Redis.
* Airtable.
* Notion.
* OpenRouter.
* OpenAI.
* Herramientas MCP.
* Subworkflows.
* Wait nodes.
* Cron/Schedule.
* Manejo de archivos.
* Manejo de imágenes.
* Manejo de audios.
* Manejo de errores.

Determina qué función cumple cada bloque del workflow.
Si existen nodos desconectados, rutas aparentemente incompletas o lógica redundante, debes indicarlo.

## 3. COMPARAR PLAN VS IMPLEMENTACIÓN
Crea una matriz con estas columnas:
| Función planeada | Estado | Evidencia encontrada | Nivel de implementación | Problemas | Acción recomendada |

Estados permitidos:

* ✅ Implementado
* 🟡 Parcialmente implementado
* 🔴 No implementado
* ⚠️ Implementado con riesgo
* ❓ No se puede verificar

Asigna además un porcentaje aproximado de implementación a cada función.
Ejemplo:
Registro de pagos → 90%
Recordatorios → 70%
Registro de notas → 100%
Control de hábitos → 30%
Pagos recurrentes → 0%

## 4. CALCULAR EL NIVEL DE AVANCE DEL PROYECTO
Calcula un porcentaje general de avance.
No lo determines únicamente contando funciones.
Utiliza una ponderación basada en importancia:

* Función crítica = peso 3
* Función importante = peso 2
* Función complementaria = peso 1

Indica:
AVANCE GENERAL DEL PROYECTO: XX%
Después divide el avance por módulos.
Ejemplo:

* Núcleo del asistente: XX%
* Finanzas: XX%
* Recordatorios: XX%
* Pendientes: XX%
* Notas: XX%
* Automatizaciones: XX%
* Inteligencia artificial: XX%
* Base de datos: XX%
* Manejo de errores: XX%
* Seguridad: XX%
* Experiencia de usuario: XX%

## 5. AUDITAR ESPECIALMENTE EL SISTEMA FINANCIERO
Quiero que seas especialmente estricto con el módulo financiero.
Verifica si el chatbot realmente puede registrar correctamente:

INGRESOS
Ejemplos:
“Me pagaron $500.000 del trabajo.”
“Recibí $80.000.”
“Entraron $1.200.000 del negocio.”
Verifica si identifica:

* monto
* tipo de transacción
* categoría
* descripción
* fecha
* cuenta
* método de pago
* persona relacionada

GASTOS
Ejemplos:
“Gasté $50.000 en gasolina.”
“Pagué $120.000 de mercado.”
“Compré comida por $35.000.”
Comprueba si puede:

* clasificar categorías
* detectar montos
* detectar fechas
* asignar cuentas
* guardar correctamente el movimiento

## 6. REVISAR PAGOS RECURRENTES
Este punto es MUY IMPORTANTE.
Debes verificar explícitamente si el chatbot puede registrar pagos recurrentes.
Ejemplos:
“Pago Netflix todos los meses por $26.900.”
“Todos los días 5 pago el arriendo.”
“Pago internet el 15 de cada mes.”
“Cada mes debo pagar la universidad.”
“Cada 3 meses pago el seguro.”
“Pago el gimnasio cada mes.”
Analiza si actualmente el sistema:

1. Detecta que el pago es recurrente.
2. Identifica la frecuencia.
3. Identifica la fecha de inicio.
4. Identifica el próximo pago.
5. Identifica el monto.
6. Identifica la categoría.
7. Guarda la recurrencia en la base de datos.
8. Genera automáticamente futuros pagos.
9. Genera recordatorios.
10. Permite modificar la recurrencia.
11. Permite pausarla.
12. Permite eliminarla.
13. Evita registrar pagos duplicados.
14. Diferencia entre:

* gasto recurrente
* recordatorio recurrente
* suscripción
* deuda
* pago pendiente

Si alguna de estas funciones no existe, debes indicarlo claramente.
No asumas que existe porque haya un Schedule Trigger. Debes comprobar que toda la lógica esté conectada correctamente.

## 7. REVISAR RECORDATORIOS Y FECHAS
Analiza si el asistente entiende correctamente expresiones como:

* mañana
* pasado mañana
* el viernes
* dentro de 2 horas
* en 30 minutos
* cada lunes
* todos los días
* cada mes
* el día 15
* dos días antes
* una hora antes

Determina si existe riesgo de errores por:

* zona horaria
* formato de fecha
* fecha incompleta
* fechas pasadas
* cambios de mes
* años bisiestos
* horarios ambiguos

## 8. REVISAR PENDIENTES
Comprueba si el sistema puede:

* crear pendientes
* modificar pendientes
* eliminar pendientes
* marcar pendientes como terminados
* poner prioridades
* agregar fechas límite
* agregar recordatorios
* listar pendientes
* filtrar pendientes
* detectar pendientes vencidos

Ejemplos:
“Tengo pendiente pagar el recibo.”
“Ya pagué el recibo.”
“Cambia la fecha del recibo para el viernes.”
“Recuérdame dos días antes.”

## 9. REVISAR NOTAS
Comprueba si el chatbot puede:

* crear notas
* guardar notas desde texto
* guardar notas desde audio
* resumir una nota
* asignar título automáticamente
* agregar fecha
* agregar categoría
* buscar notas
* modificar notas
* eliminar notas

Ejemplo:
“Se me ocurrió una idea de negocio…”

## 10. REVISAR ARCHIVOS, IMÁGENES Y AUDIOS
Comprueba si el sistema maneja correctamente:

* imágenes
* comprobantes
* facturas
* capturas
* PDFs
* audios
* notas de voz

Analiza el flujo completo:
archivo recibido → análisis → extracción de información → clasificación → almacenamiento → confirmación al usuario.
Busca posibles problemas de sincronización.
Por ejemplo:
Si el usuario envía primero una foto y luego 30 segundos después una descripción, determina si el sistema puede relacionar ambos mensajes.

## 11. REVISAR EL AGENTE DE INTELIGENCIA ARTIFICIAL
Analiza el prompt del agente.
Busca problemas como:

* instrucciones contradictorias
* prompts demasiado largos
* información repetida
* falta de prioridades
* instrucciones ambiguas
* falta de validaciones
* decisiones que deberían hacerse con código pero se dejan al LLM
* exceso de dependencia de IA
* alucinaciones potenciales

Determina si el agente tiene suficiente contexto para saber cuándo debe:

* consultar información
* registrar información
* actualizar información
* eliminar información
* pedir aclaraciones
* ejecutar una herramienta

## 12. REVISAR LA MEMORIA DEL CHATBOT
Comprueba cómo recuerda información.
Analiza:

* memoria corta
* memoria persistente
* historial de conversaciones
* identificación del usuario
* separación de conversaciones
* contexto financiero
* contexto de tareas

Detecta riesgos como:

* mezclar usuarios
* registrar información duplicada
* recordar información incorrecta
* perder contexto después de cierto número de mensajes

## 13. BUSCAR DUPLICADOS
Analiza si existe riesgo de duplicar:

* pagos
* gastos
* ingresos
* notas
* recordatorios
* pendientes
* eventos
* archivos

Ejemplo:
El usuario dice:
“Gasté $50.000 en gasolina.”
El sistema registra el gasto.
Luego el usuario dice:
“Sí, correcto.”
Comprueba que la confirmación no vuelva a generar el registro.

## 14. REVISAR CONFIRMACIONES
Determina qué acciones deberían pedir confirmación antes de ejecutarse.
Especialmente:

* eliminar datos
* modificar datos
* registrar montos elevados
* modificar pagos recurrentes
* cancelar recordatorios
* eliminar pendientes
* sobrescribir información

## 15. REVISAR MANEJO DE ERRORES
Busca qué ocurre si:

* una API falla
* OpenRouter falla
* Telegram falla
* la base de datos no responde
* un nodo devuelve null
* el modelo devuelve JSON inválido
* el usuario envía un mensaje incompleto
* el monto no puede interpretarse
* una fecha es ambigua

Comprueba si existe:

* Retry
* Error Trigger
* fallback
* logs
* alertas
* manejo de excepciones

## 16. REVISAR SEGURIDAD
Analiza:

* API Keys.
* Tokens.
* Webhooks públicos.
* URLs sensibles.
* Datos financieros.
* Credenciales dentro del JSON.
* Información personal.
* permisos excesivos.

Indica cualquier riesgo de seguridad encontrado.
Nunca muestres las credenciales completas en el informe aunque estén disponibles.

## 17. REVISAR ESCALABILIDAD
Evalúa qué sucedería si el asistente empieza a manejar:

* 10 mensajes diarios
* 100 mensajes diarios
* 1.000 mensajes diarios
* varios usuarios

Busca posibles cuellos de botella.

## 18. DETECTAR PUNTOS DÉBILES
Crea una sección:
PUNTOS DÉBILES DEL SISTEMA
Para cada problema indica:
PROBLEMA:
IMPACTO:
PROBABILIDAD:
GRAVEDAD:
CAUSA:
SOLUCIÓN RECOMENDADA:
Clasifica la gravedad como:
🔴 Crítico
🟠 Alto
🟡 Medio
🟢 Bajo

## 19. IDENTIFICAR FUNCIONES FALTANTES
Crea una sección:
FUNCIONES QUE FALTAN POR IMPLEMENTAR
Separa en:

* críticas
* importantes
* opcionales

No te limites al plan original.
Si detectas que una función adicional mejoraría significativamente el asistente, inclúyela como recomendación.

## 20. PROPONER MEJORAS
Genera recomendaciones para mejorar:

* arquitectura
* velocidad
* confiabilidad
* experiencia de usuario
* prompts
* base de datos
* seguridad
* manejo de errores
* automatizaciones
* finanzas
* recordatorios
* mantenimiento

Cada recomendación debe explicar:
QUÉ CAMBIAR
POR QUÉ
CÓMO IMPLEMENTARLO EN N8N
NIVEL DE DIFICULTAD:
Fácil / Medio / Difícil
PRIORIDAD:
Alta / Media / Baja

## 21. PROPONER NUEVAS FUNCIONES
Después de auditar el proyecto, sugiere funciones que podrían volver el asistente más completo.
Por ejemplo:

* control de suscripciones
* detección de gastos recurrentes
* presupuestos mensuales
* alertas de sobrecostos
* resumen financiero semanal
* resumen financiero mensual
* tracker de hábitos
* estadísticas de hábitos
* gestión de metas
* detección automática de comprobantes
* OCR
* seguimiento de deudas
* seguimiento de préstamos
* ahorro por objetivos
* calendario de pagos
* recordatorios inteligentes
* búsqueda semántica de notas
* análisis de gastos con IA

No agregues funciones únicamente porque suenan interesantes. Explica qué problema resolverían.

## 22. GENERAR UN PLAN DE ACCIÓN
Finalmente genera un roadmap de implementación.
Organízalo en:
FASE 1 — PROBLEMAS CRÍTICOS
Qué corregir inmediatamente.
FASE 2 — FUNCIONES INCOMPLETAS
Qué terminar.
FASE 3 — MEJORAS DE ARQUITECTURA
Qué reorganizar.
FASE 4 — NUEVAS FUNCIONES
Qué añadir después.
Dentro de cada fase indica:

* tarea
* prioridad
* dependencia
* dificultad
* módulo afectado

## 23. RESUMEN EJECUTIVO FINAL
Termina la auditoría con este formato:

ESTADO GENERAL
Avance estimado: XX%
Arquitectura: X/10
Confiabilidad: X/10
Manejo de errores: X/10
Seguridad: X/10
Escalabilidad: X/10
Experiencia de usuario: X/10
Módulo financiero: X/10
Recordatorios: X/10
Gestión de pendientes: X/10

5 PROBLEMAS MÁS IMPORTANTES
1.
2.
3.
4.
5.

5 PRÓXIMAS ACCIONES RECOMENDADAS
1.
2.
3.
4.
5.

CONCLUSIÓN
Explica claramente:

* qué tan avanzado está realmente el proyecto
* qué funciona
* qué aparenta funcionar pero está incompleto
* qué falta
* qué debería solucionarse primero

IMPORTANTE:
No inventes funcionalidades.
Si una función no puede comprobarse a partir de los workflows o documentos proporcionados, escribe:
“NO SE PUEDE VERIFICAR CON LA INFORMACIÓN DISPONIBLE”.
No confundas que exista un nodo con que la función esté correctamente implementada.
Analiza siempre el flujo completo de principio a fin.
Prioriza detectar problemas reales antes que felicitar el proyecto.
