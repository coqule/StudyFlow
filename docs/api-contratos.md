# Contratos de API — StudyFlow

Base URL: `http://localhost:3001/api`
Autenticación: header `Authorization: Bearer <supabase_jwt>` en todos los endpoints excepto `/auth`.

---

## POST /api/horarios/generar

Genera el horario completo de la semana en una sola llamada batch a Gemini.

**Request:** solo necesita el JWT (el backend obtiene `usuario_id` del token)
```json
{}
```

**Response 200:**
```json
{
  "bloques": [
    {
      "id": "uuid",
      "tarea_id": "uuid",
      "fecha": "2025-07-07",
      "hora_inicio": "18:00",
      "hora_fin": "21:00",
      "generado_por_ia": true,
      "justificacion": "Examen de Cálculo II con fecha límite más próxima y dificultad 5"
    }
  ]
}
```

**Response 503** (IA no disponible):
```json
{
  "error": "IA no disponible",
  "code": "IA_UNAVAILABLE"
}
```

**Response 422** (respuesta de IA inválida tras validación):
```json
{
  "error": "Respuesta de IA inválida",
  "code": "IA_INVALID_RESPONSE"
}
```

---

## POST /api/horarios/ajustar

Reorganización conversacional incremental. Solo modifica los bloques afectados por la instrucción — el resto del calendario no cambia.

**Request:**
```json
{
  "instruccion": "el examen de Cálculo II se adelantó para mañana, necesito más tiempo"
}
```

**Response 200:**
```json
{
  "bloques_eliminados": ["uuid1", "uuid2"],
  "bloques_creados": [
    {
      "id": "uuid",
      "tarea_id": "uuid",
      "fecha": "2025-07-08",
      "hora_inicio": "18:00",
      "hora_fin": "21:00",
      "generado_por_ia": true,
      "justificacion": "Reorganizado por adelanto del examen de Cálculo II"
    }
  ]
}
```

---

## GET /api/horarios

Devuelve todos los bloques actuales del usuario para la semana en curso.

**Response 200:**
```json
{
  "bloques": [
    {
      "id": "uuid",
      "tarea_id": "uuid",
      "tarea_titulo": "Examen Cálculo II",
      "curso_nombre": "Cálculo II",
      "curso_color": "#3B82F6",
      "fecha": "2025-07-07",
      "hora_inicio": "18:00",
      "hora_fin": "21:00",
      "generado_por_ia": true,
      "justificacion": "..."
    }
  ]
}
```

---

## POST /api/cursos

**Request:**
```json
{
  "nombre": "Cálculo II",
  "color": "#3B82F6",
  "dificultad": 5,
  "profesor": "Dr. García",
  "creditos": 4
}
```

**Response 201:**
```json
{ "id": "uuid", "nombre": "Cálculo II", ... }
```

---

## POST /api/tareas

**Request:**
```json
{
  "curso_id": "uuid",
  "titulo": "Examen parcial",
  "tipo": "examen",
  "fecha_limite": "2025-07-10",
  "duracion_estimada_h": 3,
  "prioridad": 5
}
```

**Response 201:**
```json
{ "id": "uuid", "titulo": "Examen parcial", "estado": "pendiente", ... }
```

---

## POST /api/disponibilidad

**Request:**
```json
{
  "dia_semana": "lunes",
  "hora_inicio": "18:00",
  "hora_fin": "21:00"
}
```

**Response 201:** bloque creado.
**Response 409:** si el bloque se solapa con uno existente del mismo día.

```json
{
  "error": "El bloque se solapa con uno existente",
  "code": "OVERLAP_CONFLICT"
}
```

---

## POST /api/auth/register

Único endpoint junto a `/api/auth/login` que no requiere `Authorization` header.

**Request:**
```json
{
  "correo": "estudiante@ucr.ac.cr",
  "password": "contrasena123",
  "nombre": "Ana Pérez"
}
```

**Response 201:**
```json
{
  "usuario": {
    "id": "uuid",
    "correo": "estudiante@ucr.ac.cr",
    "nombre": "Ana Pérez"
  }
}
```

**Response 400** (correo con formato inválido o password < 8 caracteres):
```json
{
  "error": "El correo no tiene un formato válido",
  "code": "VALIDATION_ERROR"
}
```

**Response 409** (correo ya registrado):
```json
{
  "error": "Ya existe una cuenta con ese correo",
  "code": "EMAIL_TAKEN"
}
```

---

## POST /api/auth/login

**Request:**
```json
{
  "correo": "estudiante@ucr.ac.cr",
  "password": "contrasena123"
}
```

**Response 200:**
```json
{
  "access_token": "<supabase_jwt>",
  "usuario": {
    "id": "uuid",
    "correo": "estudiante@ucr.ac.cr",
    "nombre": "Ana Pérez"
  }
}
```

**Response 401** (credenciales inválidas):
```json
{
  "error": "Correo o contraseña incorrectos",
  "code": "INVALID_CREDENTIALS"
}
```

---

## Rutas protegidas — sin JWT o JWT inválido

Cualquier endpoint que no sea `/api/auth/register` o `/api/auth/login`,
si el header `Authorization: Bearer <token>` falta o el token no es válido:

**Response 401:**
```json
{
  "error": "No autenticado",
  "code": "UNAUTHENTICATED"
}
```
