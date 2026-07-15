# Arquitectura — Qué significa hacer buen trabajo en StudyFlow

> Este documento define los principios de arquitectura y las reglas
> non-negociables que todo código nuevo debe respetar. Antes de implementar
> cualquier feature, léelo. Antes de hacer un review, úsalo como referencia.

---

## 1. Visión general

StudyFlow es una aplicación web de **cuatro capas estrictamente separadas**.
Cada capa tiene una única responsabilidad y se comunica **solo** con la capa
adyacente:

```
Usuario
   ↕ HTTP/REST + JWT
Frontend (React + TypeScript)
   ↕ HTTP/REST + JWT
Backend (Node.js + Express)
   ↕                    ↕
Supabase/PostgreSQL    Gemini API
```

Fuente de verdad del dominio:
[`docs/prd/PRD_Constitucion_StudyFlow.md`](prd/PRD_Constitucion_StudyFlow.md)

---

## 2. Reglas de comunicación entre capas (non-negotiables)

| Origen        | Destino       | ¿Permitido? | Notas                                          |
|--------------|--------------|-------------|------------------------------------------------|
| Frontend      | Backend       | ✅          | Solo via HTTP REST con JWT en header           |
| Backend       | Supabase      | ✅          | Con service role key, solo en backend          |
| Backend       | Gemini API    | ✅          | Únicamente desde `backend/services/ia/`        |
| Frontend      | Supabase      | ⚠️ Solo auth | Solo `auth.getUser`, `signIn`, `signOut` — nunca para datos |
| Frontend      | Gemini API    | ❌ Nunca    | La API key nunca llega al cliente              |
| Gemini API    | Backend       | Solo respuesta JSON | El LLM nunca devuelve texto libre    |

Violar cualquiera de estas reglas es un **blocker** en review.

---

## 3. Módulo de IA — aislamiento total (RNF-05)

El módulo `backend/services/ia/` es el único punto de contacto con Gemini.
Ningún otro archivo del proyecto importa el SDK de Gemini directamente.

**Invariante de sustitución:** cambiar el proveedor de IA (de Gemini a OpenAI,
DeepSeek u otro) requiere modificar **únicamente** `backend/services/ia/`.
No se toca ningún controlador, ruta, ni modelo de datos.

```
backend/
└── services/
    └── ia/
        ├── index.js       # interfaz pública del módulo (generate, adjust)
        ├── gemini.js      # implementación Gemini (reemplazable)
        ├── prompts.js     # plantillas de prompt (separadas de la lógica)
        └── validator.js   # valida schema y conflictos de la respuesta IA
```

**El reviewer rechaza cualquier PR que importe el SDK de Gemini fuera de `backend/services/ia/`.**

---

## 4. Validación de respuestas IA (regla dura)

El backend **siempre** valida la respuesta de Gemini antes de persistir:

1. Valida schema (estructura JSON, campos requeridos, tipos).
2. Valida lógica de negocio (sin overlaps de bloques, sin exceder disponibilidad).
3. Si la validación falla → responde con error controlado, no persiste nada.
4. Si Gemini falla o hace timeout → degrada gracefully, no rompe la app (RNF-03).

El módulo `backend/services/ia/validator.js` es el responsable exclusivo de
esta validación.

---

## 5. Autenticación y seguridad

- Supabase Auth gestiona sesiones (email + contraseña → JWT).
- Todas las rutas protegidas del backend verifican el JWT antes de ejecutar.
- **Row Level Security (RLS)** en Supabase garantiza que cada usuario solo
  accede a sus propios datos, incluso si el backend falla en filtrar.
- La `service role key` de Supabase solo existe en variables de entorno del
  backend; nunca se expone al cliente ni se comitea en el repo.
- La clave de la API de Gemini solo existe en variables de entorno del backend.

---

## 6. Modelo de datos (referencia)

Ver [`docs/modelo-datos.md`](modelo-datos.md) para el schema completo.
Las 5 tablas son: `usuarios`, `cursos`, `tareas`, `disponibilidad`, `bloques_horario`.

**Invariante de integridad:** toda lógica de RLS vive en Supabase.
El backend valida datos de negocio; Supabase es la última línea de defensa
de acceso.

---

## 7. Contratos de API (referencia)

Ver [`docs/api-contratos.md`](api-contratos.md) para los payloads exactos.

**Regla de compatibilidad:** los contratos de API son la fuente de verdad
entre frontend y backend. Cualquier cambio en un contrato requiere actualizar
`docs/api-contratos.md` **antes** de tocar código (en la fase de `design.md`
del spec).

---

## 8. Reglas de degradación (RNF-03)

- Si Gemini no responde en el tiempo esperado → devolver error 503 con mensaje
  claro; el usuario puede reintentarlo manualmente.
- Si Gemini devuelve un JSON inválido → rechazar y loguear, no persistir.
- El **modo de ajuste incremental** (`ia_ajustar_horario`) NUNCA regenera
  bloques no afectados por el cambio solicitado.
- La app siempre es navegable aunque el módulo de IA esté caído.

---

## 9. Estructura de carpetas esperada

```
StudyFlow/
├── backend/
│   ├── src/
│   │   ├── routes/          # Express routers (un archivo por recurso)
│   │   ├── controllers/     # Lógica de controladores (thin)
│   │   ├── services/
│   │   │   ├── ia/          # ÚNICO punto de contacto con Gemini
│   │   │   └── ...
│   │   ├── middleware/      # auth, validación, error handling
│   │   └── app.js           # Express app (sin listen)
│   ├── tests/               # Jest + Supertest
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/      # Componentes React reutilizables
│   │   ├── pages/           # Páginas / rutas
│   │   ├── hooks/           # Custom hooks
│   │   ├── services/        # Llamadas HTTP al backend (axios/fetch)
│   │   └── types/           # Tipos TypeScript compartidos
│   ├── tests/               # Jest + React Testing Library
│   └── package.json
├── docs/                    # Toda la documentación
├── specs/                   # Specs SDD por feature
├── progress/                # Tracking de sesiones
└── package.json             # Root: solo script verify
```

**No hay lógica de negocio en `frontend/src/services/`** — solo llamadas HTTP
y tipos de respuesta. La lógica vive en el backend.
