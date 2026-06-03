# Database-Spec.md — Correlativa
## Especificación de Base de Datos · v1.0

---

## 1. Diagrama de Entidades

```
universities
    │
    │ 1:N
    ▼
careers ──────────────────────────────────┐
    │                                     │
    │ 1:N                                 │
    ▼                                     │
subjects ◄──── subject_correlatives       │
    │               (self-join)           │
    │ 1:N                                 │
    ▼                                     │
user_subjects                             │
    │                                     │
    │ N:1                                 │
    ▼                                     │
users ────────────────────────────────────┘
  (active_career_id → careers)
```

---

## 2. Tablas

### 2.1 `universities`

Catálogo de universidades argentinas. Datos pre-cargados por el equipo.

```sql
CREATE TABLE universities (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,                    -- "Universidad Nacional de Córdoba"
  short_name  text NOT NULL,                    -- "UNC"
  country     text NOT NULL DEFAULT 'Argentina',
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now()
);
```

**Datos pre-cargados:**

| name | short_name |
|---|---|
| Universidad de Buenos Aires | UBA |
| Universidad Tecnológica Nacional | UTN |
| Universidad Nacional de Córdoba | UNC |
| Universidad Nacional de Catamarca | UNCA |
| Universidad Nacional de La Plata | UNLP |
| Universidad Nacional del Litoral | UNL |
| Universidad Nacional de Mar del Plata | UNMDP |
| Universidad Nacional de San Martín | UNSAM |

---

### 2.2 `careers`

Carreras universitarias. Pueden ser pre-cargadas (`is_custom = false`) o creadas por el usuario (`is_custom = true`).

```sql
CREATE TABLE careers (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  university_id   uuid NOT NULL REFERENCES universities(id) ON DELETE CASCADE,
  name            text NOT NULL,              -- "Ingeniería en Informática"
  short_name      text,                       -- "Ing. en Informática"
  total_years     smallint,                   -- duración formal (ej: 5)
  is_custom       boolean NOT NULL DEFAULT false,
  created_by      uuid REFERENCES auth.users(id) ON DELETE SET NULL,  -- solo si is_custom = true
  is_active       boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now()
);
```

**Notas:**
- Las carreras pre-cargadas tienen `is_custom = false` y `created_by = NULL`
- Las carreras creadas por usuarios tienen `is_custom = true` y `created_by = <user_id>`
- Las carreras custom son privadas al usuario que las creó (RLS)
- Una carrera custom pertenece a una universidad existente del catálogo

---

### 2.3 `subjects`

Materias de una carrera. Pueden ser pre-cargadas o creadas por el usuario (para carreras custom).

```sql
CREATE TABLE subjects (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  career_id   uuid NOT NULL REFERENCES careers(id) ON DELETE CASCADE,
  name        text NOT NULL,                  -- "Álgebra y Geometría Analítica"
  short_name  text,                           -- "Álgebra"
  code        text,                           -- código oficial (ej: "MAT-101"), opcional
  year        smallint NOT NULL,              -- 1, 2, 3, 4, 5
  semester    smallint NOT NULL,              -- 1 o 2 (cuatrimestre dentro del año)
  is_elective boolean NOT NULL DEFAULT false, -- optativa
  credits     smallint,                       -- créditos / carga horaria, opcional
  created_at  timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT valid_year     CHECK (year BETWEEN 1 AND 7),
  CONSTRAINT valid_semester CHECK (semester IN (1, 2))
);
```

**Sobre `year` y `semester`:**
- `year = 1, semester = 1` → 1er año, 1er cuatrimestre
- `year = 1, semester = 2` → 1er año, 2do cuatrimestre
- Estos valores determinan la posición en el árbol (columna del layout)

---

### 2.4 `subject_correlatives`

Relación entre materias. Si existe una fila `(subject_id, requires_subject_id)`, significa que para cursar `subject_id` el estudiante debe tener `requires_subject_id` con estado `aprobada` o `promocionada`.

```sql
CREATE TABLE subject_correlatives (
  subject_id          uuid NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  requires_subject_id uuid NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  created_at          timestamptz NOT NULL DEFAULT now(),

  PRIMARY KEY (subject_id, requires_subject_id),

  CONSTRAINT no_self_reference CHECK (subject_id != requires_subject_id)
);
```

**Ejemplo:** Si Análisis II tiene como correlativa a Análisis I:
```
subject_id          = <id de Análisis II>
requires_subject_id = <id de Análisis I>
```

**Nota:** No se valida que no haya ciclos en la DB (ej: A requiere B, B requiere A). Esta validación se hace en la capa de aplicación o en seeds controlados. En v1 los datos pre-cargados están validados manualmente.

---

### 2.5 `users`

Perfil extendido del usuario. Complementa la tabla `auth.users` de Supabase (que solo tiene email y metadata básica).

```sql
CREATE TABLE users (
  id                uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name      text NOT NULL,
  active_career_id  uuid REFERENCES careers(id) ON DELETE SET NULL,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);
```

**Notas:**
- El `id` es el mismo que `auth.users.id` (relación 1:1)
- `active_career_id` puede ser NULL (usuario recién registrado, aún en onboarding)
- Se crea automáticamente vía trigger cuando se registra un usuario en Supabase Auth

---

### 2.6 `user_subjects`

Estado del usuario en cada materia. Es la tabla más crítica del MVP.

```sql
CREATE TYPE subject_status AS ENUM (
  'no_cursada',
  'cursando',
  'regular',
  'promocionada',
  'aprobada',
  'final_pendiente',
  'libre'
);

CREATE TABLE user_subjects (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject_id  uuid NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  status      subject_status NOT NULL DEFAULT 'no_cursada',
  grade       numeric(4,2),                   -- nota final (1.00 a 10.00), opcional
  notes       text,                           -- notas personales del alumno, opcional
  updated_at  timestamptz NOT NULL DEFAULT now(),
  created_at  timestamptz NOT NULL DEFAULT now(),

  UNIQUE (user_id, subject_id),

  CONSTRAINT valid_grade CHECK (grade IS NULL OR (grade >= 1 AND grade <= 10))
);
```

**Notas:**
- Un usuario solo tiene una fila por materia (UNIQUE constraint)
- Las materias sin fila en esta tabla se tratan como `no_cursada`
- Se hace upsert en lugar de insert/update separados
- `grade` solo aplica cuando `status IN ('aprobada', 'promocionada', 'regular')`

---

## 3. Índices

```sql
-- Acceso frecuente: materias de una carrera
CREATE INDEX idx_subjects_career_id ON subjects(career_id);

-- Acceso frecuente: correlativas de una materia
CREATE INDEX idx_correlatives_subject_id ON subject_correlatives(subject_id);
CREATE INDEX idx_correlatives_requires_id ON subject_correlatives(requires_subject_id);

-- Acceso frecuente: estado del usuario en sus materias
CREATE INDEX idx_user_subjects_user_id ON user_subjects(user_id);
CREATE INDEX idx_user_subjects_user_subject ON user_subjects(user_id, subject_id);

-- Búsqueda de carreras por universidad
CREATE INDEX idx_careers_university_id ON careers(university_id);

-- Carreras custom por usuario
CREATE INDEX idx_careers_created_by ON careers(created_by) WHERE is_custom = true;
```

---

## 4. Triggers

### 4.1 Trigger: crear perfil de usuario al registrarse

```sql
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, display_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
```

### 4.2 Trigger: actualizar `updated_at` automáticamente

```sql
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER user_subjects_updated_at
  BEFORE UPDATE ON user_subjects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

---

## 5. Row Level Security (RLS)

### `universities` — lectura pública, sin escritura desde cliente

```sql
ALTER TABLE universities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "universities_select_public"
  ON universities FOR SELECT
  USING (true);

-- Sin políticas de INSERT/UPDATE/DELETE: solo service role puede escribir
```

### `careers` — lectura pública para pre-cargadas, privada para custom

```sql
ALTER TABLE careers ENABLE ROW LEVEL SECURITY;

-- Cualquiera puede ver carreras pre-cargadas
CREATE POLICY "careers_select_precargadas"
  ON careers FOR SELECT
  USING (is_custom = false AND is_active = true);

-- Usuario ve sus propias carreras custom
CREATE POLICY "careers_select_custom_own"
  ON careers FOR SELECT
  USING (is_custom = true AND created_by = auth.uid());

-- Usuario puede crear su propia carrera custom
CREATE POLICY "careers_insert_custom"
  ON careers FOR INSERT
  WITH CHECK (is_custom = true AND created_by = auth.uid());

-- Usuario puede editar solo su carrera custom
CREATE POLICY "careers_update_custom"
  ON careers FOR UPDATE
  USING (is_custom = true AND created_by = auth.uid());
```

### `subjects` — lectura pública para pre-cargadas, privada para custom

```sql
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;

-- Materias de carreras pre-cargadas: lectura pública
CREATE POLICY "subjects_select_precargadas"
  ON subjects FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM careers
      WHERE careers.id = subjects.career_id
        AND careers.is_custom = false
    )
  );

-- Materias de carrera custom propia: acceso completo
CREATE POLICY "subjects_select_custom"
  ON subjects FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM careers
      WHERE careers.id = subjects.career_id
        AND careers.is_custom = true
        AND careers.created_by = auth.uid()
    )
  );

CREATE POLICY "subjects_insert_custom"
  ON subjects FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM careers
      WHERE careers.id = subjects.career_id
        AND careers.is_custom = true
        AND careers.created_by = auth.uid()
    )
  );

CREATE POLICY "subjects_update_custom"
  ON subjects FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM careers
      WHERE careers.id = subjects.career_id
        AND careers.is_custom = true
        AND careers.created_by = auth.uid()
    )
  );
```

### `subject_correlatives` — lectura pública, sin escritura desde cliente (excepto custom)

```sql
ALTER TABLE subject_correlatives ENABLE ROW LEVEL SECURITY;

CREATE POLICY "correlatives_select_public"
  ON subject_correlatives FOR SELECT
  USING (true);

-- Escritura solo para correlativas de carreras custom propias
CREATE POLICY "correlatives_insert_custom"
  ON subject_correlatives FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM subjects
      JOIN careers ON careers.id = subjects.career_id
      WHERE subjects.id = subject_correlatives.subject_id
        AND careers.is_custom = true
        AND careers.created_by = auth.uid()
    )
  );
```

### `users` — cada usuario ve y edita solo su propio perfil

```sql
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_select_own"
  ON users FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "users_update_own"
  ON users FOR UPDATE
  USING (id = auth.uid());
```

### `user_subjects` — cada usuario opera solo sus propias filas

```sql
ALTER TABLE user_subjects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_subjects_select_own"
  ON user_subjects FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "user_subjects_insert_own"
  ON user_subjects FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "user_subjects_update_own"
  ON user_subjects FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "user_subjects_delete_own"
  ON user_subjects FOR DELETE
  USING (user_id = auth.uid());
```

---

## 6. Migración Inicial Completa

```sql
-- ============================================================
-- CORRELATIVA — Migración inicial v1.0
-- ============================================================

-- Extensiones
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- TABLAS
-- ============================================================

CREATE TABLE universities (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  short_name  text NOT NULL,
  country     text NOT NULL DEFAULT 'Argentina',
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE careers (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  university_id   uuid NOT NULL REFERENCES universities(id) ON DELETE CASCADE,
  name            text NOT NULL,
  short_name      text,
  total_years     smallint,
  is_custom       boolean NOT NULL DEFAULT false,
  created_by      uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  is_active       boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE subjects (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  career_id   uuid NOT NULL REFERENCES careers(id) ON DELETE CASCADE,
  name        text NOT NULL,
  short_name  text,
  code        text,
  year        smallint NOT NULL,
  semester    smallint NOT NULL,
  is_elective boolean NOT NULL DEFAULT false,
  credits     smallint,
  created_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT valid_year     CHECK (year BETWEEN 1 AND 7),
  CONSTRAINT valid_semester CHECK (semester IN (1, 2))
);

CREATE TABLE subject_correlatives (
  subject_id          uuid NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  requires_subject_id uuid NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  created_at          timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (subject_id, requires_subject_id),
  CONSTRAINT no_self_reference CHECK (subject_id != requires_subject_id)
);

CREATE TYPE subject_status AS ENUM (
  'no_cursada',
  'cursando',
  'regular',
  'promocionada',
  'aprobada',
  'final_pendiente',
  'libre'
);

CREATE TABLE users (
  id                uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name      text NOT NULL,
  active_career_id  uuid REFERENCES careers(id) ON DELETE SET NULL,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE user_subjects (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject_id  uuid NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  status      subject_status NOT NULL DEFAULT 'no_cursada',
  grade       numeric(4,2),
  notes       text,
  updated_at  timestamptz NOT NULL DEFAULT now(),
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, subject_id),
  CONSTRAINT valid_grade CHECK (grade IS NULL OR (grade >= 1 AND grade <= 10))
);

-- ============================================================
-- ÍNDICES
-- ============================================================

CREATE INDEX idx_subjects_career_id ON subjects(career_id);
CREATE INDEX idx_correlatives_subject_id ON subject_correlatives(subject_id);
CREATE INDEX idx_correlatives_requires_id ON subject_correlatives(requires_subject_id);
CREATE INDEX idx_user_subjects_user_id ON user_subjects(user_id);
CREATE INDEX idx_user_subjects_user_subject ON user_subjects(user_id, subject_id);
CREATE INDEX idx_careers_university_id ON careers(university_id);
CREATE INDEX idx_careers_created_by ON careers(created_by) WHERE is_custom = true;

-- ============================================================
-- TRIGGERS
-- ============================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, display_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER user_subjects_updated_at
  BEFORE UPDATE ON user_subjects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE universities        ENABLE ROW LEVEL SECURITY;
ALTER TABLE careers             ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects            ENABLE ROW LEVEL SECURITY;
ALTER TABLE subject_correlatives ENABLE ROW LEVEL SECURITY;
ALTER TABLE users               ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_subjects       ENABLE ROW LEVEL SECURITY;

-- universities
CREATE POLICY "universities_select_public" ON universities FOR SELECT USING (true);

-- careers
CREATE POLICY "careers_select_precargadas" ON careers FOR SELECT
  USING (is_custom = false AND is_active = true);
CREATE POLICY "careers_select_custom_own" ON careers FOR SELECT
  USING (is_custom = true AND created_by = auth.uid());
CREATE POLICY "careers_insert_custom" ON careers FOR INSERT
  WITH CHECK (is_custom = true AND created_by = auth.uid());
CREATE POLICY "careers_update_custom" ON careers FOR UPDATE
  USING (is_custom = true AND created_by = auth.uid());

-- subjects
CREATE POLICY "subjects_select_precargadas" ON subjects FOR SELECT
  USING (EXISTS (SELECT 1 FROM careers WHERE careers.id = subjects.career_id AND careers.is_custom = false));
CREATE POLICY "subjects_select_custom" ON subjects FOR SELECT
  USING (EXISTS (SELECT 1 FROM careers WHERE careers.id = subjects.career_id AND careers.is_custom = true AND careers.created_by = auth.uid()));
CREATE POLICY "subjects_insert_custom" ON subjects FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM careers WHERE careers.id = subjects.career_id AND careers.is_custom = true AND careers.created_by = auth.uid()));
CREATE POLICY "subjects_update_custom" ON subjects FOR UPDATE
  USING (EXISTS (SELECT 1 FROM careers WHERE careers.id = subjects.career_id AND careers.is_custom = true AND careers.created_by = auth.uid()));

-- subject_correlatives
CREATE POLICY "correlatives_select_public" ON subject_correlatives FOR SELECT USING (true);
CREATE POLICY "correlatives_insert_custom" ON subject_correlatives FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM subjects JOIN careers ON careers.id = subjects.career_id
    WHERE subjects.id = subject_correlatives.subject_id
      AND careers.is_custom = true AND careers.created_by = auth.uid()
  ));

-- users
CREATE POLICY "users_select_own" ON users FOR SELECT USING (id = auth.uid());
CREATE POLICY "users_update_own" ON users FOR UPDATE USING (id = auth.uid());

-- user_subjects
CREATE POLICY "user_subjects_select_own" ON user_subjects FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "user_subjects_insert_own" ON user_subjects FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "user_subjects_update_own" ON user_subjects FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "user_subjects_delete_own" ON user_subjects FOR DELETE USING (user_id = auth.uid());

-- ============================================================
-- SEED — Universidades
-- ============================================================

INSERT INTO universities (name, short_name) VALUES
  ('Universidad de Buenos Aires', 'UBA'),
  ('Universidad Tecnológica Nacional', 'UTN'),
  ('Universidad Nacional de Córdoba', 'UNC'),
  ('Universidad Nacional de Catamarca', 'UNCA'),
  ('Universidad Nacional de La Plata', 'UNLP'),
  ('Universidad Nacional del Litoral', 'UNL'),
  ('Universidad Nacional de Mar del Plata', 'UNMDP'),
  ('Universidad Nacional de San Martín', 'UNSAM');

-- ============================================================
-- SEED — Carrera de ejemplo: Ing. en Informática (UNCA)
-- Los IDs reales se generarán al insertar; esto es pseudocódigo
-- ilustrativo. El seed real se ejecuta con un script separado.
-- ============================================================
-- Ver: /seeds/unca-informatica.sql
```

---

## 7. Seed de Carrera Pre-cargada — Ingeniería en Informática (UNCA)

El seed completo está en [`seeds/unca-informatica.sql`](seeds/unca-informatica.sql).

**Fuente:** Ord. CS Nº 004/2011, Plan de Estudios 2011, Tabla 4.3.1 "Distribución y Régimen de Correlatividades".

### Resumen del seed

| Año | 1°C | 2°C | Total |
|---|---|---|---|
| 1° | AM I, Álgebra, Química, Física I, Sist. Representación | Fundamentos de Informática, Geometría Analítica | 7 |
| 2° | Análisis Mat. II, Física II, Mat. Discreta, Taller Inglés I, Programación I | Prob. y Est., Cálculo Av., Programación II, Estructura de Datos, Arq. Computadores | 10 |
| 3° | Taller Inglés II, Leng. Formales, Base de Datos, Sist. Operativos, Teoría Info., Análisis Numérico | Modelos y Sim., Ing. SW I, Programación III, Redes de Computadoras | 10 |
| 4° | Ing. SW II, Economía, Org. Empresarial, Electiva I, Sist. Tiempo Real | Arq. Software, Ética y Leg., Electiva II, Ing. SW III, Seg. Laboral | 10 |
| 5° | Reingeniería, Auditoría, Calidad y Cert., Electiva III, Sist. Inteligentes | Práctica Profesional Supervisada, Proyecto Integrador | 7 |
| **Total** | | | **44** |

### Decisiones de modelado del seed

1. **Materias anuales** (`C = 'A'` en el plan): AM I, Álgebra, Física I, Sistemas de Representación cursan ambos cuatrimestres. Se modelan con `semester = 1` (posición en el árbol = inicio de cursado). El usuario las marca como aprobadas al finalizar el año.

2. **Correlativas Regular vs. Aprobada**: El plan oficial distingue correlativas para cursar con "Regular" (cursada aprobada, final pendiente) vs. "Aprobada". En MVP se unifica: todas las correlativas requieren `aprobada` o `promocionada`. Esto es más estricto que el plan oficial pero es la simplificación documentada en el PRD.

3. **Electivas I, II, III**: Se incluyen como materias genéricas sin correlativas. En el plan oficial tienen correlativas por área (Redes, Web, Sistemas Gerenciales, Geoinformática), pero el alumno elige entre opciones. En v2 se puede modelar la elección.

4. **Taller de Inglés**: Son extracurriculares en el plan oficial pero aparecen con número y correlativas en la tabla. Se incluyen en el árbol porque Taller II requiere haber aprobado Taller I.

5. **Proyecto Integrador**: El plan no lista correlativas explícitas en la tabla de correlatividades. Se incluye sin correlativas (el alumno lo inicia cuando corresponde).

---

## 8. Decisiones de Diseño de DB

| Decisión | Alternativa | Por qué |
|---|---|---|
| UUID como PK en todas las tablas | SERIAL / BIGINT | Seguro para exponer en URLs, compatible con Supabase por defecto |
| ENUM para `subject_status` | tabla de lookup | Valores acotados y estables; ENUM es más rápido y limpio |
| `user_subjects` con UNIQUE(user_id, subject_id) | PK compuesto | Permite upsert limpio y FK desde otras tablas si hace falta |
| `users` separada de `auth.users` | Columnas en metadata de auth | Permite queries JOIN sin pasar por la capa de auth; más flexible |
| Trigger para crear `users` al registrarse | Insertar desde el cliente | Atómico, no depende de que el cliente ejecute el segundo paso |
| Correlativas como tabla de unión simple | Columna JSONB en subjects | Permite queries relacionales, índices, integridad referencial |

---

*Documento pendiente de aprobación. Una vez aprobado, se avanza al Paso 4: UX-Spec.md.*
