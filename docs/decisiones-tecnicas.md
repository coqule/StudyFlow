# Decisiones técnicas — StudyFlow

> Registro de **decisiones técnicas transversales** (estilo ADR — *Architecture
> Decision Record*). Aquí va toda decisión que:
> - afecta a más de una feature o a un módulo completo, **o**
> - modifica un documento de dominio (`docs/reglas-ia.md`, `docs/modelo-datos.md`,
>   `docs/api-contratos.md`, `docs/architecture.md`), **o**
> - se aparta de lo que fija el anteproyecto (`docs/prd/`).
>
> No registres aquí decisiones locales a una sola feature — esas viven en
> `specs/<feature>/design.md`. Este archivo es para lo que un teammate futuro
> necesita entender sin excavar en un spec concreto.
>
> **Formato:** una entrada por decisión, más reciente arriba. Append-only:
> no reescribas entradas pasadas; si una decisión se revierte, añade una
> entrada nueva que lo explique y marca la anterior como *Reemplazada por…*.
> Cada entrada lleva: fecha, estado, contexto, decisión, consecuencias y
> alcance (features/archivos afectados).

---

## ADR-003 — Modelo de Gemini: `gemini-3.5-flash` (sustituye a `gemini-2.0-flash`)

- **Fecha:** 2026-07-13
- **Estado:** Aceptada
- **Alcance:** features 9 (`ia_llamar_gemini`), 11–13 (endpoints IA); archivo
  `backend/src/services/ia/gemini.js`; doc `docs/reglas-ia.md`. Actualiza el
  identificador de modelo fijado como consecuencia de ADR-001.

**Contexto.** Durante el smoke test real de `llamarGemini` (feature 9, antes de
cerrar) con una `GEMINI_API_KEY` propia, se comprobó empíricamente contra la
API que:
- `gemini-2.0-flash` (el modelo que fijaba el spec) → `429 RESOURCE_EXHAUSTED`
  con `limit: 0` en el free tier del proyecto: sin cuota utilizable.
- `gemini-2.5-flash` → `404 NOT_FOUND` "no longer available to new users":
  Google lo está retirando.
- `gemini-3.5-flash` y `gemini-flash-latest` → responden correctamente con la
  key. `models.list` confirmó acceso a la familia 3.x.

**Decisión.** Fijar `gemini-3.5-flash` como modelo de producción del módulo IA.
Se prefiere la **versión estable concreta** frente al alias `gemini-flash-latest`
porque el alias cambia de modelo en silencio entre despliegues (no reproducible),
lo que choca con un proyecto spec-driven.

**Consecuencias.**
- Cambio de una línea en `gemini.js` (`model: "gemini-3.5-flash"`) y en el test
  que verifica R3. Sin más cambios de código: la forma del SDK, el prompt
  literal, `systemInstruction` (ADR-002) y el JSON mode no se tocan.
- Se actualizaron `docs/reglas-ia.md § "Llamada a Gemini"` y el spec de la
  feature 9 (R3 + design + tasks).
- El smoke test real pasa a ser viable (el modelo tiene cuota).
- **Radio de impacto acotado al módulo IA** (RNF-05): ningún controller/ruta
  afectado.

**Alternativa descartada.** (a) Mantener `gemini-2.0-flash` — modelo una
generación atrasado y sin cuota usable en la key disponible. (b) Usar el alias
`gemini-flash-latest` — cómodo pero no reproducible.

**Nota sobre ADR-001.** El bullet "Modelo actualizado a `gemini-2.0-flash`" de
ADR-001 queda **reemplazado por este ADR-003** en cuanto al identificador de
modelo; el resto de ADR-001 (migración de SDK) sigue vigente.

---

## ADR-002 — Prompt del sistema vía `systemInstruction` (no concatenado en `contents`)

- **Fecha:** 2026-07-12
- **Estado:** Aceptada
- **Alcance:** features 9 (`ia_llamar_gemini`), 11 (`ia_endpoint_generar`),
  12 (`ia_endpoint_ajustar`); archivo `backend/src/services/ia/gemini.js`;
  doc `docs/reglas-ia.md`.

**Contexto.** El código de referencia original de `docs/reglas-ia.md`
concatenaba el prompt del sistema y el contexto en un mismo string
(`contents`), enviándolo todo en el turno de usuario. El SDK `@google/genai`
ofrece un campo dedicado `config.systemInstruction` con rol de sistema.

**Decisión.** `llamarGemini` envía `PROMPT_SISTEMA + promptAdicional` en
`config.systemInstruction`; `contents` lleva únicamente el contexto
serializado (`Contexto:\n${JSON.stringify(contexto)}`).

**Consecuencias.**
- Mayor adherencia del modelo a las reglas fijas (rol de sistema tiene más
  prioridad/persistencia que el contenido de usuario).
- **Defensa contra inyección de prompt en `/ajustar`** (feature 12): la
  instrucción en lenguaje natural del usuario viaja dentro del contexto
  (`instruccion_usuario` en `contents`), sin competir al mismo nivel con las
  reglas. Una instrucción tipo "ignora las reglas anteriores…" ya no queda
  al mismo nivel que el prompt del sistema.
- La verificación de R4/R8 en el spec de la feature 9 se hace sobre
  `config.systemInstruction`; R5 sobre `contents`.
- Se actualizó `docs/reglas-ia.md § "Llamada a Gemini"`. El prompt del
  sistema literal y el formato del contexto NO cambiaron.

**Alternativa descartada.** Mantener la concatenación en `contents` — más
simple de verificar (una sola superficie) pero mezcla reglas y datos y es
frágil ante texto libre del usuario. Detalle en
`specs/ia_llamar_gemini/design.md §8`.

---

## ADR-001 — Migración del SDK de Gemini a `@google/genai`

- **Fecha:** 2026-07-12
- **Estado:** Aceptada
- **Alcance:** todo el módulo IA (features 9–13); archivos
  `backend/src/services/ia/gemini.js`, `backend/package.json`; doc
  `docs/reglas-ia.md`. Se aparta del anteproyecto, que especificaba
  `@google/generative-ai`.

**Contexto.** El anteproyecto y `docs/reglas-ia.md` especificaban el paquete
`@google/generative-ai`. Al preparar el spec de `ia_llamar_gemini` se
verificó (vía Context7) que Google **deprecó** ese paquete — su repositorio
oficial es `deprecated-generative-ai-js` — y que el sucesor activo, con
soporte para los modelos Gemini recientes y Vertex AI, es `@google/genai`.

**Decisión.** Usar `@google/genai` desde la primera feature que llama a
Gemini (feature 9), en lugar de construir sobre un SDK ya deprecado.

**Consecuencias.**
- Cambia la forma de la API: `new GoogleGenAI({ apiKey })` →
  `ai.models.generateContent({ model, contents, config })` →
  `response.text` (propiedad, puede ser `undefined`). Ya no hay paso
  intermedio `getGenerativeModel`; `config` reemplaza a `generationConfig`.
- Requiere **Node 20+** (`backend/package.json` sube `engines.node` a `">=20"`;
  la máquina de desarrollo corre Node 24).
- Modelo actualizado a `gemini-2.0-flash` (antes `gemini-1.5-flash`).
- **Radio de impacto acotado al módulo IA** gracias al invariante de
  sustitución de `docs/architecture.md §3` (RNF-05): no se tocó ningún
  controller, ruta ni modelo de datos.
- Se actualizó `docs/reglas-ia.md § "Llamada a Gemini"`.

**Alternativa descartada.** Seguir con `@google/generative-ai` (fiel al
anteproyecto) — funciona hoy, pero construye sobre un paquete deprecado sin
soporte futuro. Detalle en `specs/ia_llamar_gemini/design.md §1`.
