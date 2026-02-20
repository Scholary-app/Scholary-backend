# 🗄️ Diccionario de Datos - Scholary Database (Supabase)

Este documento describe la estructura completa de la base de datos de Scholary para implementación en Supabase (PostgreSQL).

---

## 📋 Índice de Tablas

1. [users](#1-users) - Usuarios (Profesores)
2. [classes](#2-classes) - Clases/Asignaturas
3. [students](#3-students) - Alumnos
4. [class_students](#4-class_students) - Relación Clase-Alumno
5. [schedules](#5-schedules) - Horarios de Clase
6. [attendance_sessions](#6-attendance_sessions) - Sesiones de Pase de Lista
7. [attendance_records](#7-attendance_records) - Registros de Asistencia Individual

---

## 1. users

**Descripción**: Almacena la información de los profesores que utilizan la aplicación.

| Campo | Tipo | Restricciones | Descripción |
|-------|------|---------------|-------------|
| id | UUID | PK, DEFAULT uuid_generate_v4() | Identificador único del usuario |
| email | VARCHAR(255) | NOT NULL, UNIQUE | Correo electrónico |
| password_hash | VARCHAR(255) | NOT NULL | Hash de la contraseña (bcrypt) |
| full_name | VARCHAR(255) | NOT NULL | Nombre completo del profesor |
| avatar_url | TEXT | NULL | URL de la foto de perfil |
| phone | VARCHAR(20) | NULL | Número de teléfono |
| institution | VARCHAR(255) | NULL | Institución educativa |
| late_tolerance_minutes | INTEGER | DEFAULT 10, CHECK (late_tolerance_minutes >= 0 AND late_tolerance_minutes <= 60) | Minutos de tolerancia antes de marcar retardo |
| apply_three_strikes_rule | BOOLEAN | DEFAULT TRUE | Si aplica regla "3 retardos = 1 falta" |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Fecha de creación de la cuenta |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | Última actualización |
| last_login | TIMESTAMPTZ | NULL | Último inicio de sesión |

### Índices
```sql
CREATE INDEX idx_users_email ON users(email);
```

### RLS (Row Level Security)
```sql
-- Los usuarios solo pueden ver y editar su propia información
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own data" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own data" ON users
  FOR UPDATE USING (auth.uid() = id);
```

---

## 2. classes

**Descripción**: Representa las clases o asignaturas que imparte un profesor.

| Campo | Tipo | Restricciones | Descripción |
|-------|------|---------------|-------------|
| id | UUID | PK, DEFAULT uuid_generate_v4() | Identificador único de la clase |
| user_id | UUID | FK → users(id), NOT NULL | Profesor propietario |
| name | VARCHAR(255) | NOT NULL | Nombre de la clase (ej: "Proyecto de Programación B") |
| subject | VARCHAR(255) | NULL | Materia (ej: "Programación") |
| group | VARCHAR(50) | NULL | Grupo (ej: "GRUPO B", "A1") |
| description | TEXT | NULL | Descripción de la clase |
| color | VARCHAR(7) | DEFAULT '#7C3AED' | Color hex para identificación visual |
| active | BOOLEAN | DEFAULT TRUE | Si la clase está activa |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Fecha de creación |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | Última actualización |

### Índices
```sql
CREATE INDEX idx_classes_user_id ON classes(user_id);
CREATE INDEX idx_classes_active ON classes(active);
```

### RLS
```sql
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own classes" ON classes
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own classes" ON classes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own classes" ON classes
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own classes" ON classes
  FOR DELETE USING (auth.uid() = user_id);
```

---

## 3. students

**Descripción**: Información de los alumnos en el sistema.

| Campo | Tipo | Restricciones | Descripción |
|-------|------|---------------|-------------|
| id | UUID | PK, DEFAULT uuid_generate_v4() | Identificador único del alumno |
| user_id | UUID | FK → users(id), NOT NULL | Profesor que registró al alumno |
| student_id | VARCHAR(50) | NOT NULL | ID/Matrícula del alumno |
| full_name | VARCHAR(255) | NOT NULL | Nombre completo |
| email | VARCHAR(255) | NULL | Correo electrónico del alumno |
| phone | VARCHAR(20) | NULL | Teléfono de contacto |
| gender | VARCHAR(10) | NULL, CHECK (gender IN ('male', 'female', 'other')) | Género del alumno |
| qr_code | VARCHAR(255) | UNIQUE | Código QR único para asistencia |
| avatar_url | TEXT | NULL | URL de foto del alumno |
| notes | TEXT | NULL | Notas adicionales |
| active | BOOLEAN | DEFAULT TRUE | Si el alumno está activo |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Fecha de registro |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | Última actualización |

### Índices
```sql
CREATE INDEX idx_students_user_id ON students(user_id);
CREATE INDEX idx_students_student_id ON students(student_id);
CREATE UNIQUE INDEX idx_students_qr_code ON students(qr_code) WHERE qr_code IS NOT NULL;
```

### RLS
```sql
ALTER TABLE students ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own students" ON students
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create students" ON students
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own students" ON students
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own students" ON students
  FOR DELETE USING (auth.uid() = user_id);
```

---

## 4. class_students

**Descripción**: Tabla de relación muchos a muchos entre clases y alumnos (un alumno puede estar en varias clases).

| Campo | Tipo | Restricciones | Descripción |
|-------|------|---------------|-------------|
| id | UUID | PK, DEFAULT uuid_generate_v4() | Identificador único |
| class_id | UUID | FK → classes(id), NOT NULL | ID de la clase |
| student_id | UUID | FK → students(id), NOT NULL | ID del alumno |
| enrolled_at | TIMESTAMPTZ | DEFAULT NOW() | Fecha de inscripción |
| status | VARCHAR(20) | DEFAULT 'active', CHECK (status IN ('active', 'inactive', 'dropped')) | Estado de inscripción |

### Constraints Únicos
```sql
ALTER TABLE class_students ADD CONSTRAINT unique_class_student 
  UNIQUE (class_id, student_id);
```

### Índices
```sql
CREATE INDEX idx_class_students_class_id ON class_students(class_id);
CREATE INDEX idx_class_students_student_id ON class_students(student_id);
```

### RLS
```sql
ALTER TABLE class_students ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view class students" ON class_students
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM classes WHERE classes.id = class_students.class_id 
      AND classes.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can add students to own classes" ON class_students
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM classes WHERE classes.id = class_students.class_id 
      AND classes.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update class students" ON class_students
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM classes WHERE classes.id = class_students.class_id 
      AND classes.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete class students" ON class_students
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM classes WHERE classes.id = class_students.class_id 
      AND classes.user_id = auth.uid()
    )
  );
```

---

## 5. schedules

**Descripción**: Horarios de cada clase (días y horas en que se imparte).

| Campo | Tipo | Restricciones | Descripción |
|-------|------|---------------|-------------|
| id | UUID | PK, DEFAULT uuid_generate_v4() | Identificador único |
| class_id | UUID | FK → classes(id), NOT NULL | Clase asociada |
| day_of_week | VARCHAR(10) | NOT NULL, CHECK (day_of_week IN ('Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo')) | Día de la semana |
| start_time | TIME | NOT NULL | Hora de inicio |
| end_time | TIME | NOT NULL | Hora de fin |
| classroom | VARCHAR(100) | NULL | Salón o ubicación |
| active | BOOLEAN | DEFAULT TRUE | Si el horario está activo |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Fecha de creación |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | Última actualización |

### Constraints
```sql
ALTER TABLE schedules ADD CONSTRAINT check_time_range 
  CHECK (end_time > start_time);
```

### Índices
```sql
CREATE INDEX idx_schedules_class_id ON schedules(class_id);
CREATE INDEX idx_schedules_day_of_week ON schedules(day_of_week);
```

### RLS
```sql
ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view class schedules" ON schedules
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM classes WHERE classes.id = schedules.class_id 
      AND classes.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create schedules" ON schedules
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM classes WHERE classes.id = schedules.class_id 
      AND classes.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update schedules" ON schedules
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM classes WHERE classes.id = schedules.class_id 
      AND classes.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete schedules" ON schedules
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM classes WHERE classes.id = schedules.class_id 
      AND classes.user_id = auth.uid()
    )
  );
```

---

## 6. attendance_sessions

**Descripción**: Sesiones de pase de lista realizadas para una clase en una fecha específica.

| Campo | Tipo | Restricciones | Descripción |
|-------|------|---------------|-------------|
| id | UUID | PK, DEFAULT uuid_generate_v4() | Identificador único de la sesión |
| class_id | UUID | FK → classes(id), NOT NULL | Clase asociada |
| session_date | DATE | NOT NULL | Fecha del pase de lista |
| session_time | TIME | NULL | Hora de inicio de la sesión |
| method | VARCHAR(20) | NOT NULL, CHECK (method IN ('manual', 'qr')) | Método utilizado |
| status | VARCHAR(20) | DEFAULT 'completed', CHECK (status IN ('in_progress', 'completed', 'cancelled')) | Estado de la sesión |
| total_students | INTEGER | DEFAULT 0 | Total de alumnos en la clase |
| present_count | INTEGER | DEFAULT 0 | Cantidad de presentes |
| absent_count | INTEGER | DEFAULT 0 | Cantidad de ausentes |
| late_count | INTEGER | DEFAULT 0 | Cantidad de retardos |
| justified_count | INTEGER | DEFAULT 0 | Cantidad de justificados |
| notes | TEXT | NULL | Notas de la sesión |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Fecha de creación |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | Última actualización |
| created_by | UUID | FK → users(id), NOT NULL | Usuario que creó la sesión |

### Constraints
```sql
ALTER TABLE attendance_sessions ADD CONSTRAINT unique_class_session_date 
  UNIQUE (class_id, session_date);
```

### Índices
```sql
CREATE INDEX idx_attendance_sessions_class_id ON attendance_sessions(class_id);
CREATE INDEX idx_attendance_sessions_date ON attendance_sessions(session_date);
CREATE INDEX idx_attendance_sessions_created_by ON attendance_sessions(created_by);
```

### RLS
```sql
ALTER TABLE attendance_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own sessions" ON attendance_sessions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM classes WHERE classes.id = attendance_sessions.class_id 
      AND classes.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create sessions" ON attendance_sessions
  FOR INSERT WITH CHECK (
    auth.uid() = created_by AND
    EXISTS (
      SELECT 1 FROM classes WHERE classes.id = attendance_sessions.class_id 
      AND classes.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own sessions" ON attendance_sessions
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM classes WHERE classes.id = attendance_sessions.class_id 
      AND classes.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own sessions" ON attendance_sessions
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM classes WHERE classes.id = attendance_sessions.class_id 
      AND classes.user_id = auth.uid()
    )
  );
```

---

## 7. attendance_records

**Descripción**: Registros individuales de asistencia de cada alumno en cada sesión.

| Campo | Tipo | Restricciones | Descripción |
|-------|------|---------------|-------------|
| id | UUID | PK, DEFAULT uuid_generate_v4() | Identificador único |
| attendance_session_id | UUID | FK → attendance_sessions(id), NOT NULL | Sesión asociada |
| student_id | UUID | FK → students(id), NOT NULL | Alumno registrado |
| status | VARCHAR(20) | NOT NULL, CHECK (status IN ('present', 'absent', 'late', 'justified')) | Estado de asistencia |
| check_in_time | TIMESTAMPTZ | NULL | Hora de registro (para QR) |
| notes | TEXT | NULL | Notas específicas del alumno |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Fecha de creación |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | Última actualización |

### Constraints
```sql
ALTER TABLE attendance_records ADD CONSTRAINT unique_session_student 
  UNIQUE (attendance_session_id, student_id);
```

### Índices
```sql
CREATE INDEX idx_attendance_records_session_id ON attendance_records(attendance_session_id);
CREATE INDEX idx_attendance_records_student_id ON attendance_records(student_id);
CREATE INDEX idx_attendance_records_status ON attendance_records(status);
```

### RLS
```sql
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view attendance records" ON attendance_records
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM attendance_sessions 
      JOIN classes ON classes.id = attendance_sessions.class_id
      WHERE attendance_sessions.id = attendance_records.attendance_session_id 
      AND classes.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create attendance records" ON attendance_records
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM attendance_sessions 
      JOIN classes ON classes.id = attendance_sessions.class_id
      WHERE attendance_sessions.id = attendance_records.attendance_session_id 
      AND classes.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update attendance records" ON attendance_records
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM attendance_sessions 
      JOIN classes ON classes.id = attendance_sessions.class_id
      WHERE attendance_sessions.id = attendance_records.attendance_session_id 
      AND classes.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete attendance records" ON attendance_records
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM attendance_sessions 
      JOIN classes ON classes.id = attendance_sessions.class_id
      WHERE attendance_sessions.id = attendance_records.attendance_session_id 
      AND classes.user_id = auth.uid()
    )
  );
```

---

## 🔗 Diagrama de Relaciones

```
users (1) ──────┬──────> (N) classes
                │
                └──────> (N) students
                         
classes (1) ────┬──────> (N) schedules
                │
                ├──────> (N) class_students (M:N) <────── (N) students
                │
                └──────> (N) attendance_sessions
                
attendance_sessions (1) ──────> (N) attendance_records
                
attendance_records (N) ──────> (1) students
```

---

## 📝 Script SQL Completo de Creación

```sql
-- Habilitar extensión UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Tabla users
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  avatar_url TEXT,
  phone VARCHAR(20),
  institution VARCHAR(255),
  late_tolerance_minutes INTEGER DEFAULT 10 CHECK (late_tolerance_minutes >= 0 AND late_tolerance_minutes <= 60),
  apply_three_strikes_rule BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_login TIMESTAMPTZ
);

CREATE INDEX idx_users_email ON users(email);

-- 2. Tabla classes
CREATE TABLE classes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  subject VARCHAR(255),
  "group" VARCHAR(50),
  description TEXT,
  color VARCHAR(7) DEFAULT '#7C3AED',
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_classes_user_id ON classes(user_id);
CREATE INDEX idx_classes_active ON classes(active);

-- 3. Tabla students
CREATE TABLE students (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  student_id VARCHAR(50) NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(20),
  gender VARCHAR(10) CHECK (gender IN ('male', 'female', 'other')),
  qr_code VARCHAR(255) UNIQUE,
  avatar_url TEXT,
  notes TEXT,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_students_user_id ON students(user_id);
CREATE INDEX idx_students_student_id ON students(student_id);
CREATE UNIQUE INDEX idx_students_qr_code ON students(qr_code) WHERE qr_code IS NOT NULL;

-- 4. Tabla class_students (relación M:N)
CREATE TABLE class_students (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  enrolled_at TIMESTAMPTZ DEFAULT NOW(),
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'dropped')),
  CONSTRAINT unique_class_student UNIQUE (class_id, student_id)
);

CREATE INDEX idx_class_students_class_id ON class_students(class_id);
CREATE INDEX idx_class_students_student_id ON class_students(student_id);

-- 5. Tabla schedules
CREATE TABLE schedules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  day_of_week VARCHAR(10) NOT NULL CHECK (day_of_week IN ('Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo')),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  classroom VARCHAR(100),
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT check_time_range CHECK (end_time > start_time)
);

CREATE INDEX idx_schedules_class_id ON schedules(class_id);
CREATE INDEX idx_schedules_day_of_week ON schedules(day_of_week);

-- 6. Tabla attendance_sessions
CREATE TABLE attendance_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  session_date DATE NOT NULL,
  session_time TIME,
  method VARCHAR(20) NOT NULL CHECK (method IN ('manual', 'qr')),
  status VARCHAR(20) DEFAULT 'completed' CHECK (status IN ('in_progress', 'completed', 'cancelled')),
  total_students INTEGER DEFAULT 0,
  present_count INTEGER DEFAULT 0,
  absent_count INTEGER DEFAULT 0,
  late_count INTEGER DEFAULT 0,
  justified_count INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID NOT NULL REFERENCES users(id),
  CONSTRAINT unique_class_session_date UNIQUE (class_id, session_date)
);

CREATE INDEX idx_attendance_sessions_class_id ON attendance_sessions(class_id);
CREATE INDEX idx_attendance_sessions_date ON attendance_sessions(session_date);
CREATE INDEX idx_attendance_sessions_created_by ON attendance_sessions(created_by);

-- 7. Tabla attendance_records
CREATE TABLE attendance_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  attendance_session_id UUID NOT NULL REFERENCES attendance_sessions(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL CHECK (status IN ('present', 'absent', 'late', 'justified')),
  check_in_time TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_session_student UNIQUE (attendance_session_id, student_id)
);

CREATE INDEX idx_attendance_records_session_id ON attendance_records(attendance_session_id);
CREATE INDEX idx_attendance_records_student_id ON attendance_records(student_id);
CREATE INDEX idx_attendance_records_status ON attendance_records(status);

-- Trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_classes_updated_at BEFORE UPDATE ON classes
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_students_updated_at BEFORE UPDATE ON students
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_schedules_updated_at BEFORE UPDATE ON schedules
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_attendance_sessions_updated_at BEFORE UPDATE ON attendance_sessions
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_attendance_records_updated_at BEFORE UPDATE ON attendance_records
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger para actualizar contadores en attendance_sessions
CREATE OR REPLACE FUNCTION update_attendance_counts()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE attendance_sessions
    SET 
        present_count = (SELECT COUNT(*) FROM attendance_records WHERE attendance_session_id = NEW.attendance_session_id AND status = 'present'),
        absent_count = (SELECT COUNT(*) FROM attendance_records WHERE attendance_session_id = NEW.attendance_session_id AND status = 'absent'),
        late_count = (SELECT COUNT(*) FROM attendance_records WHERE attendance_session_id = NEW.attendance_session_id AND status = 'late'),
        justified_count = (SELECT COUNT(*) FROM attendance_records WHERE attendance_session_id = NEW.attendance_session_id AND status = 'justified')
    WHERE id = NEW.attendance_session_id;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_attendance_counts_trigger
AFTER INSERT OR UPDATE OR DELETE ON attendance_records
FOR EACH ROW EXECUTE FUNCTION update_attendance_counts();
```

---

## ⚙️ Lógica de Negocio: Gestión de Asistencias

### 📋 Configuración de Tolerancia

Cada usuario (profesor) puede configurar en su perfil:

- **`late_tolerance_minutes`**: Minutos de tolerancia antes de marcar como retardo (0-60 minutos)
  - Default: 10 minutos
  - Ejemplo: Si la clase inicia a las 8:00 AM y la tolerancia es de 10 minutos, cualquier registro después de las 8:10 AM se marca como "retardo"
  
- **`apply_three_strikes_rule`**: Activar/desactivar regla de oro "3 retardos = 1 falta"
  - Default: TRUE
  - Si está activo, cada 3 retardos acumulados se convierten automáticamente en 1 falta

### 🎯 Regla de Oro: 3 Retardos = 1 Falta

Esta regla se aplica automáticamente cuando un estudiante acumula 3 retardos en una clase:

```sql
-- Función para aplicar regla de 3 retardos = 1 falta
CREATE OR REPLACE FUNCTION apply_three_strikes_rule()
RETURNS TRIGGER AS $$
DECLARE
    user_applies_rule BOOLEAN;
    late_count INTEGER;
    class_user_id UUID;
BEGIN
    -- Solo aplicar si el nuevo registro es un retardo
    IF NEW.status = 'late' THEN
        -- Obtener configuración del usuario dueño de la clase
        SELECT u.apply_three_strikes_rule, c.user_id INTO user_applies_rule, class_user_id
        FROM attendance_sessions a_s
        JOIN classes c ON c.id = a_s.class_id
        JOIN users u ON u.id = c.user_id
        WHERE a_s.id = NEW.attendance_session_id;
        
        -- Si el usuario tiene activada la regla
        IF user_applies_rule THEN
            -- Contar retardos del estudiante en esta clase
            SELECT COUNT(*) INTO late_count
            FROM attendance_records ar
            JOIN attendance_sessions a_s ON a_s.id = ar.attendance_session_id
            WHERE ar.student_id = NEW.student_id
            AND a_s.class_id = (
                SELECT class_id FROM attendance_sessions WHERE id = NEW.attendance_session_id
            )
            AND ar.status = 'late';
            
            -- Si completó 3 retardos, agregar una falta automática
            IF late_count >= 3 AND late_count % 3 = 0 THEN
                -- Actualizar el registro actual a 'absent' con nota automática
                NEW.status := 'absent';
                NEW.notes := COALESCE(NEW.notes || ' | ', '') || 'Falta por acumulación de 3 retardos (Regla de Oro)';
            END IF;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER apply_three_strikes_rule_trigger
BEFORE INSERT OR UPDATE ON attendance_records
FOR EACH ROW EXECUTE FUNCTION apply_three_strikes_rule();
```

### 🕐 Cálculo Automático de Retardos

Al tomar asistencia, el sistema determina automáticamente si es retardo basándose en:

1. **Hora de inicio de clase** (desde `schedules.start_time`)
2. **Hora de registro** (`attendance_records.check_in_time`)
3. **Tolerancia configurada** (`users.late_tolerance_minutes`)

```sql
-- Vista para calcular asistencias con retardos automáticos
CREATE OR REPLACE VIEW attendance_with_auto_late AS
SELECT 
    ar.*,
    s.start_time,
    u.late_tolerance_minutes,
    CASE 
        WHEN ar.check_in_time <= (s.start_time + (u.late_tolerance_minutes || ' minutes')::INTERVAL) THEN 'present'
        ELSE 'late'
    END AS calculated_status
FROM attendance_records ar
JOIN attendance_sessions a_s ON a_s.id = ar.attendance_session_id
JOIN schedules s ON s.class_id = a_s.class_id 
    AND s.day_of_week = EXTRACT(DOW FROM a_s.session_date)
JOIN classes c ON c.id = a_s.class_id
JOIN users u ON u.id = c.user_id;
```

### 📊 Estadísticas de Retardos por Estudiante

```sql
-- Vista para ver retardos acumulados y próximas faltas automáticas
CREATE OR REPLACE VIEW student_late_statistics AS
SELECT 
    s.id AS student_id,
    s.full_name,
    c.id AS class_id,
    c.name AS class_name,
    COUNT(CASE WHEN ar.status = 'late' THEN 1 END) AS total_lates,
    COUNT(CASE WHEN ar.status = 'absent' AND ar.notes LIKE '%Regla de Oro%' THEN 1 END) AS auto_absences,
    COUNT(CASE WHEN ar.status = 'late' THEN 1 END) % 3 AS lates_until_next_absence,
    u.apply_three_strikes_rule
FROM students s
JOIN class_students cs ON cs.student_id = s.id
JOIN classes c ON c.id = cs.class_id
JOIN users u ON u.id = c.user_id
LEFT JOIN attendance_records ar ON ar.student_id = s.id
LEFT JOIN attendance_sessions a_s ON a_s.id = ar.attendance_session_id AND a_s.class_id = c.id
GROUP BY s.id, s.full_name, c.id, c.name, u.apply_three_strikes_rule;
```

---

## 🔒 Configuración de Supabase Auth

Para integrar con Supabase Auth, se recomienda:

1. **Usar Supabase Auth para gestión de usuarios**:
   - La tabla `auth.users` de Supabase se sincroniza con la tabla `public.users`
   - Crear trigger para sincronizar datos

```sql
-- Función para sincronizar usuario de auth con public.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, created_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Usuario'),
    NEW.created_at
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger que se ejecuta al crear nuevo usuario en auth
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

2. **Políticas RLS basadas en auth.uid()**:
   - Usar `auth.uid()` para obtener el ID del usuario autenticado
   - Las políticas ya están configuradas arriba

---

## 📊 Vistas Útiles

### Vista de clases con estadísticas
```sql
CREATE VIEW class_statistics AS
SELECT 
  c.id,
  c.name,
  c.subject,
  c."group",
  COUNT(DISTINCT cs.student_id) as total_students,
  COUNT(DISTINCT s.id) as total_schedules,
  COUNT(DISTINCT asess.id) as total_sessions
FROM classes c
LEFT JOIN class_students cs ON c.id = cs.class_id AND cs.status = 'active'
LEFT JOIN schedules s ON c.id = s.class_id AND s.active = true
LEFT JOIN attendance_sessions asess ON c.id = asess.class_id
GROUP BY c.id, c.name, c.subject, c."group";
```

### Vista de asistencia por estudiante
```sql
CREATE VIEW student_attendance_summary AS
SELECT 
  s.id as student_id,
  s.full_name,
  s.student_id,
  c.id as class_id,
  c.name as class_name,
  COUNT(ar.id) as total_records,
  COUNT(CASE WHEN ar.status = 'present' THEN 1 END) as present_count,
  COUNT(CASE WHEN ar.status = 'absent' THEN 1 END) as absent_count,
  COUNT(CASE WHEN ar.status = 'late' THEN 1 END) as late_count,
  COUNT(CASE WHEN ar.status = 'justified' THEN 1 END) as justified_count,
  ROUND(
    (COUNT(CASE WHEN ar.status = 'present' THEN 1 END)::NUMERIC / 
    NULLIF(COUNT(ar.id), 0)) * 100, 
    2
  ) as attendance_percentage
FROM students s
JOIN class_students cs ON s.id = cs.student_id
JOIN classes c ON cs.class_id = c.id
LEFT JOIN attendance_records ar ON s.id = ar.student_id
LEFT JOIN attendance_sessions asess ON ar.attendance_session_id = asess.id AND asess.class_id = c.id
GROUP BY s.id, s.full_name, s.student_id, c.id, c.name;
```

---

## 🚀 Próximos Pasos

1. Crear proyecto en Supabase
2. Ejecutar el script SQL de creación
3. Configurar autenticación en Supabase Dashboard
4. Configurar políticas RLS adicionales según necesidades
5. Crear funciones serverless (Edge Functions) para lógica compleja
6. Configurar Storage para avatares e imágenes
7. Implementar real-time subscriptions para actualizaciones en vivo

---

## 📚 Recursos

- [Supabase Documentation](https://supabase.com/docs)
- [PostgreSQL Docs](https://www.postgresql.org/docs/)
- [Row Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [Supabase Auth](https://supabase.com/docs/guides/auth)

---

**Última actualización**: 19 de febrero de 2026
