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

## ADR-006 — Navegación: un solo eje, y qué partes del diseño de Stitch no se implementan

- **Fecha:** 2026-07-23
- **Estado:** Aceptada
- **Alcance:** `frontend/src/components/ui/AppLayout.tsx`,
  `frontend/src/pages/PanelRegistroPage.tsx`. No afecta al backend.

**Contexto.** La pantalla «Registro Unificado» del proyecto Stitch incluye
varios elementos de interfaz que no se corresponden con el estado del
producto:

- **Dos navegaciones paralelas y disjuntas:** una barra lateral (Calendario,
  Cursos, Historial) y una nav superior (Resumen general, Horario, Recursos).
  Seis destinos sin superposición ni jerarquía visible, para una aplicación
  que hoy tiene una sola pantalla.
- **Un botón `dark_mode`**, aunque «Cognitive Flow» declara `colorMode: LIGHT`
  y no define ningún token oscuro (ADR-005).
- **Un botón de menú en móvil**, que abriría un cajón inexistente.
- Cuatro de los seis destinos de navegación no tienen página.

Estas piezas son cromo generado por la herramienta de diseño, no decisiones de
producto tomadas por el equipo.

**Decisión.**

1. **Un solo eje de navegación: la barra lateral.** Se descarta la nav
   superior del diseño. La cabecera queda para controles de sesión (nombre de
   usuario y cerrar sesión).
2. **Los destinos sin página se renderizan como `<button disabled>`** con un
   « (próximamente)» accesible. Se ven —comunican hacia dónde va el
   producto— pero no reciben foco ni responden al clic.
3. **No se implementa `dark_mode`** hasta que exista una paleta oscura
   decidida, que requerirá su propia entrada en este registro.
4. **No se implementa el botón de menú móvil.** Por debajo de `md` la barra
   se oculta, igual que en el diseño.

**Fundamento.** Dos navegaciones sin jerarquía no duplican el acceso: obligan
al usuario a revisar ambas porque ninguna es predecible. Y un control que no
lleva a ningún lado es peor que su ausencia, porque falla en silencio: no
lanza error, no deja rastro, y el usuario concluye que la aplicación está
rota antes que sospechar que la función no existe.

**Consecuencias.**
- `AppLayout` es independiente de cualquier página: recibe `seccionActiva` y
  `children`. Las pantallas futuras se cuelgan del mismo marco.
- Habilitar un destino cuando exista su página es cambiar `disponible: true`
  en el arreglo `NAVEGACION`; al instalar un router, esos `<button disabled>`
  pasan a ser enlaces.
- La aplicación se ve deliberadamente más sobria que el mockup. Quien compare
  ambos debe leer esta entrada antes de reportarlo como faltante.
- Los ítems deshabilitados quedan en 2.48:1 de contraste, por debajo del
  umbral AA. Es intencional: WCAG exime a los controles inactivos, y el
  contraste bajo es precisamente lo que comunica su estado.

**Alternativas descartadas.**
- **Implementar las dos navegaciones con enlaces muertos:** fiel al mockup,
  pero traslada al usuario el costo de descubrir qué funciona.
- **Instalar un router y crear páginas placeholder** para los cuatro destinos:
  la barra quedaría idéntica al diseño, a cambio de una dependencia nueva y
  cuatro pantallas vacías que mantener sin contenido que justificarlas.
- **Omitir los ítems sin página:** la opción más honesta con el estado actual,
  descartada porque oculta la dirección del producto a quien lo usa.

---

## ADR-005 — Sistema de diseño «Cognitive Flow»: el frontmatter manda y el primario es `#0058be`

- **Fecha:** 2026-07-23
- **Estado:** Aceptada
- **Alcance:** todo el rediseño de UI (`frontend/src/`), rama
  `feature/rediseno_ui`. No afecta al backend ni a ningún contrato HTTP.
- **Origen del diseño:** proyecto Stitch «Modern AI Calendar»
  (id `16709757428734443902`), sistema de diseño «Cognitive Flow».

**Contexto.** El `designMd` exportado por Stitch **se contradice a sí mismo**.
Convive un frontmatter YAML generado desde Material 3 con una prosa escrita en
paleta Slate de Tailwind, y los valores no coinciden:

| Concepto | Dice la prosa | Dice el frontmatter |
|---|---|---|
| Texto de titulares | `#0F172A` | `on-surface: #191c1e` |
| Texto de cuerpo | `#64748B` | `on-surface-variant: #424754` |
| Fondo base | `#FFFFFF` | `background: #f7f9fb` |
| Bordes | `#E2E8F0` | `outline-variant: #c2c6d6` |

Ninguno de los valores de la columna central existe en la lista de tokens.
Además, el color primario aparece con **dos valores distintos** en el mismo
export: `designTheme.overridePrimaryColor` es `#3b82f6`, mientras que
`namedColors.primary` y el frontmatter del `designMd` dicen `#0058be`.

Implementar copiando hex de la prosa produce, de forma garantizada, una paleta
divergente: varios azules y varios grises conviviendo sin criterio.

**Decisión.**

1. **El frontmatter YAML del `designMd` es la única fuente de verdad** para
   valores concretos (colores, tipografía, radios, espaciado). Está generado
   por máquina y es internamente consistente.
2. **La prosa se usa solo como intención de diseño** — jerarquía, ritmo
   vertical, comportamiento de los componentes, barra de acento a la izquierda
   en los eventos. Sus valores hexadecimales **se ignoran**.
3. **El color primario es `#0058be`.**

**Fundamento del primario.** Medición WCAG 2.1 de ambos candidatos:

| Candidato | Blanco sobre el color | Color sobre `#f7f9fb` | AA (4.5:1) |
|---|---|---|---|
| `#3b82f6` | 3.68:1 | 3.48:1 | **falla ambos** |
| `#0058be` | 6.69:1 | 6.34:1 | pasa ambos |

`#3b82f6` deja por debajo del umbral el texto del botón primario y todos los
enlaces. StudyFlow es una aplicación de uso prolongado y frecuentemente
nocturno; el coste de un contraste insuficiente no aparece en ningún test ni
log, pero se acumula en fatiga del usuario.

Los tonos brillantes siguen disponibles para superficies grandes y elementos
decorativos vía `primary-container: #2170e4`, que es la separación que Material
3 ya prevé entre `primary` (carga texto e interacción) y `primary-container`
(no carga texto pequeño).

**Consecuencias.**
- Los tokens se declaran una sola vez, derivados del frontmatter. Ningún
  componente escribe un hex literal.
- Cualquier valor de la prosa que se quiera adoptar exige una entrada nueva en
  este registro; no se introduce por la vía de los hechos.
- Si Stitch reexporta el diseño, la contradicción volverá: este ADR es también
  la instrucción de cómo resolverla la próxima vez.

**Alternativas descartadas.**
- **Adoptar `#3b82f6`** por fidelidad a la «energía proactiva» que pide la
  prosa: descartada por accesibilidad. La vibración se recupera con
  `primary-container` sin comprometer la legibilidad.
- **Tomar la prosa como fuente de verdad**: descartada porque sus valores no
  forman un sistema cerrado — carece de contenedores, estados invertidos y
  colores fijos que el frontmatter sí define.

---

## ADR-004 — Resiliencia ante inestabilidad de Gemini: timeout explícito + retry con backoff (recomendación para el manejo de errores de IA)

- **Fecha:** 2026-07-23
- **Estado:** Recomendada — pendiente de implementación en la feature de
  manejo de errores de IA (endpoint(s) `/api/horarios/*`, semana S2)
- **Alcance:** `backend/src/services/ia/gemini.js` (única superficie de
  cambio prevista, RNF-05); afecta el comportamiento observable de
  `POST /api/horarios/generar` y `POST /api/horarios/ajustar`.

**Contexto.** Durante la prueba local E2E del endpoint `/api/horarios/ajustar`
(2026-07-23, Gemini real) se observó un episodio sostenido de inestabilidad
del modelo `gemini-3.5-flash` (ADR-003): la API devolvió repetidamente
`503 UNAVAILABLE` ("high demand"). Datos empíricos del episodio:

- Fallos **intermitentes**: en la misma ventana, algunas llamadas idénticas
  pasaban y otras fallaban; un retry simple habría salvado varios intentos.
- Fallos **lentos**: la mayoría de rechazos fueron inmediatos (1–4 s), pero
  hubo llamadas que colgaron **42 s, 72 s y hasta 108 s antes de fallar** —
  el usuario espera minutos para recibir un error.
- La degradación graceful ya implementada respondió correctamente en todos
  los casos (503 `IA_UNAVAILABLE`, sin persistir nada, resto de la API viva),
  pero no acota el tiempo de espera ni recupera fallos transitorios.
- Antecedente relacionado: la latencia p90 ya excede el objetivo RNF-01
  (< 8 s) — una corrida real de `/generar` midió ~15 s.

**Recomendación.**
1. **Timeout explícito en `llamarGemini`** (~10 s, configurable por env var):
   abortar la llamada y lanzar, para que el 503 al usuario llegue rápido y el
   peor caso quede acotado. Es la mejora de mejor relación costo/beneficio.
2. **Retry con backoff dentro del módulo IA**: 1–2 reintentos SOLO ante
   errores transitorios (503/UNAVAILABLE), con espera corta (p. ej. 1–2 s).
   Combinado con el timeout, el peor caso total queda en el orden de
   ~20–25 s en lugar de minutos.

Ambas piezas viven dentro de `gemini.js`: ningún controller, ruta ni test de
endpoints necesita cambiar (invariante de sustitución del módulo IA,
`docs/architecture.md §3`).

**Consecuencias.**
- El retry suma latencia al camino feliz solo cuando hay fallos transitorios;
  el timeout garantiza que nunca se supere el tope elegido.
- Los tests del módulo IA deberán cubrir: timeout vence → throw; 503 seguido
  de éxito → recupera; 503 persistente → throw tras agotar reintentos.
- El contrato HTTP no cambia (`503 IA_UNAVAILABLE` sigue siendo la respuesta
  final ante fallo definitivo).

**Alternativas descartadas (por ahora).**
- **Modelo de fallback** (p. ej. `flash-lite` cuando el primario da 503):
  mantiene servicio en picos largos, pero degrada calidad y obliga a revisar
  ADR-003. Reconsiderar si los episodios se vuelven frecuentes.
- **Generación asíncrona** (202 + polling): resuelve la espera pero complica
  contrato y frontend; sobredimensionada para el MVP.

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
