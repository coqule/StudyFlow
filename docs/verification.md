# Verificación — Cómo demostrar que el trabajo funciona

> Regla de oro: **el agente no dice "funciona", lo demuestra**.
> Toda feature termina con evidencia ejecutable, no con afirmaciones.

---

## Niveles de verificación

### Nivel 1 — Tests unitarios (obligatorio)

Toda función pública en el backend tiene al menos un test en Jest que:

1. Cubre el camino feliz (happy path).
2. Cubre al menos un camino de error si la función puede fallar.

```bash
# Desde backend/
npm test
```

### Nivel 2 — Tests de integración de API (obligatorio para features con endpoints)

Las features que añaden o modifican endpoints se verifican con **Supertest**
ejecutando el servidor real contra una base de datos de test:

```typescript
import request from "supertest";
import app from "../app";

describe("POST /api/cursos", () => {
  it("devuelve 201 con datos válidos", async () => {
    const res = await request(app)
      .post("/api/cursos")
      .set("Authorization", `Bearer ${testToken}`)
      .send({ nombre: "Cálculo II", color: "#ff0000", dificultad: 4 });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("id");
  });
});
```

### Nivel 3 — Tests de componentes frontend (obligatorio para features con UI)

Las features que añaden componentes React se verifican con
**React Testing Library**:

```typescript
import { render, screen, fireEvent } from "@testing-library/react";
import CursoForm from "./CursoForm";

it("muestra error si dificultad está fuera de rango", () => {
  render(<CursoForm onSubmit={jest.fn()} />);
  fireEvent.change(screen.getByLabelText("Dificultad"), { target: { value: "6" } });
  fireEvent.click(screen.getByText("Guardar"));
  expect(screen.getByText(/dificultad/i)).toBeInTheDocument();
});
```

### Nivel 4 — Trazabilidad de requirements (obligatorio para features con `"sdd": true`)

Cada `R<n>` de `specs/<name>/requirements.md` debe poder mapearse a al
menos un test concreto. El reviewer rechaza si falta cobertura.

El implementer documenta el mapa en `progress/impl_<name>.md`:

```markdown
## Trazabilidad
- R1 → `test_POST_cursos_crea_y_devuelve_201`
- R2 → `test_POST_cursos_dificultad_invalida_devuelve_400`
- R3 → `test_DELETE_cursos_ajeno_devuelve_403`
```

---

## Anti-patrones (no hacer)

- ❌ "He añadido el endpoint, debería funcionar." → falta test ejecutable.
- ❌ Test que solo verifica que la función no lanza excepción → tiene que
  comprobar el resultado concreto (status code, body, efectos en DB).
- ❌ Mockear Supabase en tests de integración con datos hardcodeados →
  usa variables de entorno para apuntar a una DB de test real o un cliente
  de Supabase configurado para el entorno de test.
- ❌ Mockear el módulo de IA en tests de integración sin documentarlo →
  está bien mockear Gemini en tests, pero debes documentarlo en el test.
- ❌ Marcar la feature como `done` sin pasar `npm run verify`.
- ❌ Tests que pasan **solo** porque el entorno es el de desarrollo → usa
  `.env.test` con variables separadas.

---

## Verificación antes de cerrar sesión

```bash
# Desde la raíz de StudyFlow/
npm run verify
```

Si el script falla, **no** marques nada como `done`. Anota el bloqueo
en `progress/current.md` y pon el estado en `blocked` en `feature_list.json`.

### Verificación manual de la feature de IA

Para `ia_generar_horario` e `ia_ajustar_horario`, adicionalmente verifica:

1. La respuesta de Gemini es validada en backend antes de persistir.
2. Si Gemini falla (timeout, respuesta inválida), el sistema degrada
   gracefully: responde con error controlado, no rompe la app.
3. El módulo de IA puede sustituirse cambiando únicamente `backend/services/ia/`
   sin tocar rutas, controladores ni el modelo de datos (RNF-05).
