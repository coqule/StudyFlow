# Convenciones de código — StudyFlow

> Estas convenciones garantizan homogeneidad en un proyecto multi-agente.
> Si tu código sigue estas reglas, cualquier agente (o humano) puede leerlo
> y predecir su comportamiento sin sorpresas.

---

## 1. TypeScript

- **Strict mode activo** en todos los `tsconfig.json`. No se permiten `any`
  explícitos sin justificación documentada en un comentario.
- Todos los tipos de dominio compartidos entre capas viven en archivos `.types.ts`
  (ej. `Curso.types.ts`, no inline en el componente).
- Interfaces para objetos de dominio (`interface Curso { ... }`).
- Types para uniones y alias (`type EstadoTarea = "pendiente" | "en_progreso" | "completada"`).
- **No** uses `namespace`. Usa módulos ES.

---

## 2. Naming

| Elemento           | Convención     | Ejemplo                          |
|--------------------|---------------|----------------------------------|
| Archivos React     | PascalCase    | `CursoForm.tsx`, `HorarioVista.tsx` |
| Archivos JS/TS     | camelCase     | `cursosController.js`, `iaService.js` |
| Archivos de test   | `*.test.ts/js`| `cursos.test.ts`, `CursoForm.test.tsx` |
| Componentes React  | PascalCase    | `function CursoCard()`           |
| Hooks              | `use` prefix  | `useCursos`, `useHorario`        |
| Funciones          | camelCase     | `generarHorario`, `validarRespuestaIA` |
| Constantes         | UPPER_SNAKE   | `MAX_BLOQUES_DIA`, `GEMINI_TIMEOUT_MS` |
| Variables de entorno | UPPER_SNAKE | `SUPABASE_URL`, `GEMINI_API_KEY` |
| Tablas en DB       | snake_case    | `bloques_horario`, `cursos`      |
| Endpoints REST     | kebab-case    | `/api/bloques-horario`, `/api/cursos` |

---

## 3. Estructura de archivos backend

Cada recurso del dominio tiene esta estructura:

```
backend/
└── src/
    ├── routes/
    │   └── cursos.js           # Solo define router + llama controller
    ├── controllers/
    │   └── cursosController.js # Orquesta: valida → llama service → responde
    ├── services/
    │   ├── cursosService.js    # Lógica de negocio + queries Supabase
    │   └── ia/                 # Módulo IA (aislado, ver architecture.md)
    └── middleware/
        ├── auth.js             # Verifica JWT
        └── validate.js         # Valida schemas de request body
```

**Regla de responsabilidad única:**
- Routes → solo registra endpoints y delega al controller.
- Controllers → valida input, llama service, formatea respuesta HTTP.
- Services → lógica de negocio, acceso a DB o IA. **Sin objetos `req`/`res`**.

---

## 4. Estructura de archivos frontend

```
frontend/
└── src/
    ├── components/
    │   └── CursoCard/
    │       ├── CursoCard.tsx
    │       └── CursoCard.test.tsx    # Test junto al componente
    ├── pages/
    │   └── CursosPage.tsx
    ├── hooks/
    │   └── useCursos.ts
    ├── services/
    │   └── cursosApi.ts             # Solo fetch/axios al backend
    └── types/
        └── Curso.types.ts
```

Los tests viven **junto a su componente** (no en una carpeta `tests/` aparte).
Los tests de integración de API viven en `backend/tests/`.

---

## 5. Imports

- Usa imports absolutos configurados con `paths` en `tsconfig.json` para
  evitar `../../..` en el frontend.
- En el backend, usa imports relativos (`./routes/cursos`) o paths de Node.
- Orden de imports: 1) módulos de Node/npm, 2) imports internos del proyecto.
- No importes el SDK de Gemini fuera de `backend/services/ia/`.

---

## 6. Error handling

### Backend

Usa un middleware de error centralizado. Los controladores lanzan errores
con clase y status code:

```javascript
// En cualquier controller o service:
const error = new Error("Curso no encontrado");
error.status = 404;
throw error;

// En middleware/errorHandler.js:
app.use((err, req, res, next) => {
  res.status(err.status || 500).json({
    error: err.message || "Error interno del servidor"
  });
});
```

**No** respondas con `res.status(500).json({ error: err.stack })` en producción.

### Frontend

- Los errores de red/API se manejan en `services/` y se propagan como estados
  al componente.
- Nunca muestres mensajes de error técnicos al usuario (stack traces, IDs internos).
- Usa un estado `{ data, loading, error }` en los custom hooks.

---

## 7. Variables de entorno

- Archivo `.env.example` comiteado con todas las variables documentadas (sin valores reales).
- Archivo `.env` en `.gitignore` — **nunca comitear**.
- Frontend usa `VITE_` como prefijo para variables de entorno públicas (si usa Vite).
- Backend usa variables sin prefijo especial.
- Accede a variables de entorno **solo al inicio del módulo o en la configuración**,
  no dentro de funciones de negocio.

---

## 8. Tests

- Los tests **no dependen de estado compartido** entre sí: cada test crea
  y limpia sus propios datos.
- Para tests de API que necesitan datos en DB, usa un usuario de test y
  elimina los datos en `afterEach` o `afterAll`.
- Los tests de componentes React usan `@testing-library/react` con
  `userEvent` para interacciones, no `fireEvent` directo.
- Los mocks del módulo IA (`backend/services/ia/`) deben documentarse con un
  comentario `// MOCK: Gemini desactivado en este test`.
- Nombres de test descriptivos:
  ```
  ✅ "POST /api/cursos devuelve 201 con dificultad válida"
  ❌ "test1" o "funciona"
  ```

---

## 9. Commits

- Mensaje en **imperativo, español**:
  `feat: agregar endpoint POST /api/cursos`
  `fix: validar dificultad fuera de rango`
  `test: cubrir error 403 en DELETE /api/cursos`
  `docs: actualizar contratos de API`
- **Un commit por feature** al cerrar el spec (no commits de "wip" en main).
