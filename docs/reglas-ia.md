# Reglas de integración con IA — StudyFlow

Este archivo define todo lo que el módulo `/backend/services/ia/` debe implementar.
**No modificar el prompt del sistema ni el formato del contexto sin consenso del equipo.**

---

## Contexto enviado a Gemini

Construido por `construirContexto(usuario_id)`. Nunca enviar filas completas de la BD — solo estas variables:

```json
{
  "fecha_actual": "2025-07-07",
  "disponibilidad": [
    { "dia": "lunes", "inicio": "18:00", "fin": "21:00" },
    { "dia": "miercoles", "inicio": "17:00", "fin": "20:00" }
  ],
  "tareas_pendientes": [
    {
      "id": "t12",
      "curso": "Cálculo II",
      "dificultad": 5,
      "fecha_limite": "2025-07-10",
      "duracion_estimada_h": 3,
      "prioridad_usuario": 5
    },
    {
      "id": "t08",
      "curso": "Programación",
      "dificultad": 3,
      "fecha_limite": "2025-07-14",
      "duracion_estimada_h": 2,
      "prioridad_usuario": 3
    }
  ]
}
```

Para el endpoint `/ajustar`, agregar al contexto:
```json
{
  "horario_vigente": [ ...bloques actuales... ],
  "instruccion_usuario": "el examen de Cálculo II se adelantó para mañana"
}
```

---

## Prompt del sistema (LITERAL — no parafrasear)

```
Eres el motor de planificación de un sistema experto de
organización académica. Tu única tarea es distribuir las
tareas_pendientes dentro de los bloques de disponibilidad,
siguiendo este orden de prioridad: 1) fecha_limite más
cercana primero (camino crítico), 2) mayor dificultad recibe
bloques más largos y en horas de mayor concentración,
3) prioridad_usuario como desempate. Nunca asignes dos
tareas al mismo bloque horario ni excedas la duracion del
bloque de disponibilidad. Responde EXCLUSIVAMENTE con un
objeto JSON con la forma: { "bloques": [ { "tarea_id",
"fecha", "hora_inicio", "hora_fin", "justificacion" } ] }
```

Para el modo ajuste, agregar al final del prompt:
```
El horario vigente está en horario_vigente. La instrucción
del usuario está en instruccion_usuario. Devuelve SOLO los
bloques que cambian: { "bloques_eliminados": ["id1", "id2"],
"bloques_creados": [ { "tarea_id", "fecha", "hora_inicio",
"hora_fin", "justificacion" } ] }
```

---

## Llamada a Gemini (`llamarGemini`)

> **SDK:** se usa `@google/genai` (el paquete oficial vigente). El anterior
> `@google/generative-ai` quedó deprecado por Google y no se usa. Requiere
> Node 20+. El backend usa CommonJS (`require`).
>
> **Modelo:** `gemini-3.5-flash` (versión estable concreta, reproducible). Se
> sustituyó a `gemini-2.0-flash` el 2026-07-13 (ADR-003): aquel quedó sin cuota
> free tier utilizable y su sucesor `2.5-flash` ya no se ofrece a usuarios
> nuevos. Ver `docs/decisiones-tecnicas.md § ADR-003`.

El prompt del sistema va en `config.systemInstruction` (rol de sistema, no
mezclado con los datos); `contents` lleva únicamente el contexto. Esto mejora
la adherencia del modelo a las reglas y, en `/ajustar`, evita que la
instrucción en lenguaje natural del usuario compita con las reglas fijas.

```js
const { GoogleGenAI } = require('@google/genai')

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })

async function llamarGemini(contexto, promptAdicional = '') {
  const response = await ai.models.generateContent({
    model: 'gemini-3.5-flash',
    contents: `Contexto:\n${JSON.stringify(contexto)}`,
    config: {
      systemInstruction: PROMPT_SISTEMA + promptAdicional, // reglas con rol de sistema
      responseMimeType: 'application/json',                // JSON mode OBLIGATORIO
    },
  })

  return response.text // string | undefined — validarRespuesta contempla el undefined
}
```

---

## Validación de respuesta (`validarRespuesta`)

NUNCA guardar en la BD sin pasar por esto:

```js
function validarRespuesta(respuestaRaw, disponibilidad) {
  let parsed
  try {
    parsed = JSON.parse(respuestaRaw)
  } catch {
    throw new Error('Respuesta de IA no es JSON válido')
  }

  // 1. Verificar esquema
  if (!parsed.bloques || !Array.isArray(parsed.bloques)) {
    throw new Error('Esquema inválido: falta array bloques')
  }
  for (const bloque of parsed.bloques) {
    if (!bloque.tarea_id || !bloque.fecha || !bloque.hora_inicio || !bloque.hora_fin) {
      throw new Error(`Bloque incompleto: ${JSON.stringify(bloque)}`)
    }
    if (bloque.hora_fin <= bloque.hora_inicio) {
      throw new Error(`Hora fin anterior a inicio: ${JSON.stringify(bloque)}`)
    }
  }

  // 2. Verificar que ningún bloque se solape con otro
  for (let i = 0; i < parsed.bloques.length; i++) {
    for (let j = i + 1; j < parsed.bloques.length; j++) {
      const a = parsed.bloques[i]
      const b = parsed.bloques[j]
      if (a.fecha === b.fecha && a.hora_inicio < b.hora_fin && b.hora_inicio < a.hora_fin) {
        throw new Error(`Choque de horario entre bloques ${a.tarea_id} y ${b.tarea_id}`)
      }
    }
  }

  // 3. Verificar que los bloques caen dentro de la disponibilidad declarada
  // (comparar cada bloque contra los rangos en disponibilidad[])

  return parsed.bloques
}
```

---

## Algoritmo de priorización (orden de evaluación)

El LLM debe seguir este orden. Si los resultados no lo reflejan, ajustar el prompt — no la validación:

1. Ordenar tareas por `fecha_limite` ascendente (más cercana primero)
2. Para cada tarea, evaluar `dificultad`:
   - 4–5 → bloque largo en hora de mayor concentración
   - 1–3 → bloque estándar disponible
3. `prioridad_usuario` solo como desempate cuando dos tareas compiten por el mismo bloque
4. Antes de confirmar: verificar choque + respetar disponibilidad
5. Si no hay espacio: incluir en `justificacion` que la tarea no pudo asignarse — nunca inventar bloques

---

## Casos de prueba de referencia

### Escenario 1 — Alta carga, poco tiempo
- **Entrada:** 5 tareas (2 exámenes dificultad 5, 2 tareas dificultad 3, 1 proyecto dificultad 4) + solo 6 horas disponibles en 3 bloques
- **Criterio:** los 2 exámenes quedan asignados antes que las demás; ningún bloque sale de la disponibilidad declarada; si no alcanza, `justificacion` indica qué quedó sin asignar

### Escenario 2 — Reorganización incremental
- **Entrada:** horario con 5 bloques + instrucción "el examen de Cálculo II se adelantó para mañana"
- **Criterio:** solo cambian los bloques relacionados con esa tarea; los otros 4 bloques mantienen exactamente su `fecha`, `hora_inicio` y `hora_fin` originales
