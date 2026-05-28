-- ============================================================
-- SEED — Ingeniería en Informática · UNCA
-- Plan de Estudios Ord. CS Nº 004/2011
-- 44 materias · 5 años · correlativas oficiales
-- ============================================================
-- NOTA: Este seed asume que la tabla universities ya tiene
-- registrada la UNCA (short_name = 'UNCA').
-- ============================================================
-- SIMPLIFICACIÓN MVP: Las materias anuales (código C = 'A' en
-- el plan oficial) se modelan en semester = 1 ya que el árbol
-- las ubica por inicio de cursado. Las correlativas del plan
-- oficial distinguen "Regular" y "Aprobada"; en este MVP todas
-- se modelan como "necesita aprobada" (única regla de desbloqueo).
-- ============================================================

DO $$
DECLARE
  v_unca_id   uuid;
  v_career_id uuid;

  -- IDs de las 44 materias (orden del plan oficial)
  s01 uuid; s02 uuid; s03 uuid; s04 uuid; s05 uuid; s06 uuid; s07 uuid;
  s08 uuid; s09 uuid; s10 uuid; s11 uuid; s12 uuid; s13 uuid; s14 uuid;
  s15 uuid; s16 uuid; s17 uuid; s18 uuid; s19 uuid; s20 uuid; s21 uuid;
  s22 uuid; s23 uuid; s24 uuid; s25 uuid; s26 uuid; s27 uuid; s28 uuid;
  s29 uuid; s30 uuid; s31 uuid; s32 uuid; s33 uuid; s34 uuid; s35 uuid;
  s36 uuid; s37 uuid; s38 uuid; s39 uuid; s40 uuid; s41 uuid; s42 uuid;
  s43 uuid; s44 uuid;

BEGIN

  -- ── Universidad ──────────────────────────────────────────
  SELECT id INTO v_unca_id FROM universities WHERE short_name = 'UNCA';
  IF v_unca_id IS NULL THEN
    RAISE EXCEPTION 'UNCA no encontrada. Ejecutá primero la migración inicial.';
  END IF;

  -- ── Carrera ───────────────────────────────────────────────
  INSERT INTO careers (university_id, name, short_name, total_years, is_custom)
  VALUES (v_unca_id, 'Ingeniería en Informática', 'Ing. Informática', 5, false)
  RETURNING id INTO v_career_id;

  -- ── Materias — PRIMER AÑO ─────────────────────────────────
  -- Materias anuales ('A' en plan oficial) → semester = 1
  -- Materias del 1°C → semester = 1
  -- Materias del 2°C → semester = 2

  INSERT INTO subjects (career_id, name, code, year, semester, credits)
  VALUES (v_career_id, 'Análisis Matemático I',        'S01', 1, 1, 165) RETURNING id INTO s01;

  INSERT INTO subjects (career_id, name, code, year, semester, credits)
  VALUES (v_career_id, 'Álgebra',                      'S02', 1, 1, 120) RETURNING id INTO s02;

  INSERT INTO subjects (career_id, name, code, year, semester, credits)
  VALUES (v_career_id, 'Química',                      'S03', 1, 1,  90) RETURNING id INTO s03;

  INSERT INTO subjects (career_id, name, code, year, semester, credits)
  VALUES (v_career_id, 'Física I',                     'S04', 1, 1, 180) RETURNING id INTO s04;

  INSERT INTO subjects (career_id, name, code, year, semester, credits)
  VALUES (v_career_id, 'Sistemas de Representación',   'S05', 1, 1,  90) RETURNING id INTO s05;

  INSERT INTO subjects (career_id, name, code, year, semester, credits)
  VALUES (v_career_id, 'Fundamentos de Informática',   'S06', 1, 2,  60) RETURNING id INTO s06;

  INSERT INTO subjects (career_id, name, code, year, semester, credits)
  VALUES (v_career_id, 'Geometría Analítica',          'S07', 1, 2,  60) RETURNING id INTO s07;

  -- ── Materias — SEGUNDO AÑO ────────────────────────────────

  INSERT INTO subjects (career_id, name, code, year, semester, credits)
  VALUES (v_career_id, 'Análisis Matemático II',                    'S08', 2, 1,  75) RETURNING id INTO s08;

  INSERT INTO subjects (career_id, name, code, year, semester, credits)
  VALUES (v_career_id, 'Física II',                                 'S09', 2, 1,  90) RETURNING id INTO s09;

  INSERT INTO subjects (career_id, name, code, year, semester, credits)
  VALUES (v_career_id, 'Matemática Discreta y Lógica',              'S10', 2, 1,  75) RETURNING id INTO s10;

  INSERT INTO subjects (career_id, name, code, year, semester, credits)
  VALUES (v_career_id, 'Taller de Inglés I',                        'S11', 2, 1,  60) RETURNING id INTO s11;

  INSERT INTO subjects (career_id, name, code, year, semester, credits)
  VALUES (v_career_id, 'Programación I',                            'S12', 2, 1, 120) RETURNING id INTO s12;

  INSERT INTO subjects (career_id, name, code, year, semester, credits)
  VALUES (v_career_id, 'Probabilidad y Estadística',                'S13', 2, 2,  90) RETURNING id INTO s13;

  INSERT INTO subjects (career_id, name, code, year, semester, credits)
  VALUES (v_career_id, 'Cálculo Avanzado',                          'S14', 2, 2,  60) RETURNING id INTO s14;

  INSERT INTO subjects (career_id, name, code, year, semester, credits)
  VALUES (v_career_id, 'Programación II',                           'S15', 2, 2, 105) RETURNING id INTO s15;

  INSERT INTO subjects (career_id, name, code, year, semester, credits)
  VALUES (v_career_id, 'Estructura de Datos y Algoritmos',          'S16', 2, 2,  75) RETURNING id INTO s16;

  INSERT INTO subjects (career_id, name, code, year, semester, credits)
  VALUES (v_career_id, 'Arquitectura de Computadores',              'S17', 2, 2,  60) RETURNING id INTO s17;

  -- ── Materias — TERCER AÑO ─────────────────────────────────

  INSERT INTO subjects (career_id, name, code, year, semester, credits)
  VALUES (v_career_id, 'Taller de Inglés II',                                   'S18', 3, 1,  60) RETURNING id INTO s18;

  INSERT INTO subjects (career_id, name, code, year, semester, credits)
  VALUES (v_career_id, 'Lenguajes Formales y Autómatas',                         'S19', 3, 1,  60) RETURNING id INTO s19;

  INSERT INTO subjects (career_id, name, code, year, semester, credits)
  VALUES (v_career_id, 'Base de Datos',                                          'S20', 3, 1,  90) RETURNING id INTO s20;

  INSERT INTO subjects (career_id, name, code, year, semester, credits)
  VALUES (v_career_id, 'Sistemas Operativos',                                    'S21', 3, 1,  75) RETURNING id INTO s21;

  INSERT INTO subjects (career_id, name, code, year, semester, credits)
  VALUES (v_career_id, 'Teoría de la Información y la Comunicación',             'S22', 3, 1,  75) RETURNING id INTO s22;

  INSERT INTO subjects (career_id, name, code, year, semester, credits)
  VALUES (v_career_id, 'Análisis Numérico',                                      'S23', 3, 1,  75) RETURNING id INTO s23;

  INSERT INTO subjects (career_id, name, code, year, semester, credits)
  VALUES (v_career_id, 'Modelos y Simulación',                                   'S24', 3, 2, 105) RETURNING id INTO s24;

  INSERT INTO subjects (career_id, name, code, year, semester, credits)
  VALUES (v_career_id, 'Ingeniería de Software I',                               'S25', 3, 2,  90) RETURNING id INTO s25;

  INSERT INTO subjects (career_id, name, code, year, semester, credits)
  VALUES (v_career_id, 'Programación III',                                       'S26', 3, 2, 105) RETURNING id INTO s26;

  INSERT INTO subjects (career_id, name, code, year, semester, credits)
  VALUES (v_career_id, 'Redes de Computadoras',                                  'S27', 3, 2,  90) RETURNING id INTO s27;

  -- ── Materias — CUARTO AÑO ─────────────────────────────────

  INSERT INTO subjects (career_id, name, code, year, semester, credits)
  VALUES (v_career_id, 'Ingeniería de Software II',                  'S28', 4, 1,  90) RETURNING id INTO s28;

  INSERT INTO subjects (career_id, name, code, year, semester, credits)
  VALUES (v_career_id, 'Economía',                                   'S29', 4, 1,  60) RETURNING id INTO s29;

  INSERT INTO subjects (career_id, name, code, year, semester, credits)
  VALUES (v_career_id, 'Organización Empresarial',                   'S30', 4, 1,  75) RETURNING id INTO s30;

  INSERT INTO subjects (career_id, name, code, year, semester, credits, is_elective)
  VALUES (v_career_id, 'Electiva I',                                 'S31', 4, 1,  75, true) RETURNING id INTO s31;

  INSERT INTO subjects (career_id, name, code, year, semester, credits)
  VALUES (v_career_id, 'Sistemas de Tiempo Real',                    'S32', 4, 1,  75) RETURNING id INTO s32;

  INSERT INTO subjects (career_id, name, code, year, semester, credits)
  VALUES (v_career_id, 'Arquitectura de Software',                   'S33', 4, 2,  75) RETURNING id INTO s33;

  INSERT INTO subjects (career_id, name, code, year, semester, credits)
  VALUES (v_career_id, 'Ética y Legislación',                        'S34', 4, 2,  60) RETURNING id INTO s34;

  INSERT INTO subjects (career_id, name, code, year, semester, credits, is_elective)
  VALUES (v_career_id, 'Electiva II',                                'S35', 4, 2,  75, true) RETURNING id INTO s35;

  INSERT INTO subjects (career_id, name, code, year, semester, credits)
  VALUES (v_career_id, 'Ingeniería del Software III',                'S36', 4, 2,  90) RETURNING id INTO s36;

  INSERT INTO subjects (career_id, name, code, year, semester, credits)
  VALUES (v_career_id, 'Seguridad Laboral y Gestión Ambiental',      'S37', 4, 2,  60) RETURNING id INTO s37;

  -- ── Materias — QUINTO AÑO ─────────────────────────────────

  INSERT INTO subjects (career_id, name, code, year, semester, credits)
  VALUES (v_career_id, 'Reingeniería de Procesos y de Sistemas de Información', 'S38', 5, 1, 75) RETURNING id INTO s38;

  INSERT INTO subjects (career_id, name, code, year, semester, credits)
  VALUES (v_career_id, 'Auditoría Informática',                                 'S39', 5, 1, 60) RETURNING id INTO s39;

  INSERT INTO subjects (career_id, name, code, year, semester, credits)
  VALUES (v_career_id, 'Calidad y Certificación del Proceso de Producción del Software', 'S40', 5, 1, 75) RETURNING id INTO s40;

  INSERT INTO subjects (career_id, name, code, year, semester, credits, is_elective)
  VALUES (v_career_id, 'Electiva III',                                           'S41', 5, 1, 75, true) RETURNING id INTO s41;

  INSERT INTO subjects (career_id, name, code, year, semester, credits)
  VALUES (v_career_id, 'Sistemas Inteligentes',                                  'S42', 5, 1, 90) RETURNING id INTO s42;

  INSERT INTO subjects (career_id, name, code, year, semester, credits)
  VALUES (v_career_id, 'Práctica Profesional Supervisada',                       'S43', 5, 2, 200) RETURNING id INTO s43;

  INSERT INTO subjects (career_id, name, code, year, semester, credits)
  VALUES (v_career_id, 'Proyecto Integrador',                                    'S44', 5, 2, 200) RETURNING id INTO s44;

  -- ── Correlativas ─────────────────────────────────────────
  -- Formato: (materia, requiere)
  -- Fuente: Ord. CS Nº 004/2011, Tabla 4.3.1, columna "Para Cursar"
  -- En MVP se unifica la distinción Regular/Aprobada: todas las
  -- correlativas se tratan como "necesita aprobada".

  INSERT INTO subject_correlatives (subject_id, requires_subject_id) VALUES

  -- SEGUNDO AÑO
  -- Análisis Matemático II ← AMI, Álgebra, Geometría Analítica
  (s08, s01), (s08, s02), (s08, s07),

  -- Física II ← AMI, Física I
  (s09, s01), (s09, s04),

  -- Matemática Discreta y Lógica ← Álgebra, Fundamentos de Informática
  (s10, s02), (s10, s06),

  -- Taller de Inglés I: sin correlativas
  -- Programación I ← Álgebra, Fundamentos de Informática
  (s12, s02), (s12, s06),

  -- Probabilidad y Estadística ← AMI, Álgebra
  (s13, s01), (s13, s02),

  -- Cálculo Avanzado ← Análisis Matemático II
  (s14, s08),

  -- Programación II ← Matemática Discreta y Lógica, Programación I
  (s15, s10), (s15, s12),

  -- Estructura de Datos y Algoritmos ← Matemática Discreta y Lógica, Programación I
  (s16, s10), (s16, s12),

  -- Arquitectura de Computadores ← Química, Matemática Discreta y Lógica
  (s17, s03), (s17, s10),

  -- TERCER AÑO
  -- Taller de Inglés II ← Taller de Inglés I
  (s18, s11),

  -- Lenguajes Formales y Autómatas ← Programación II, Estructura de Datos, Arquitectura de Comp.
  (s19, s15), (s19, s16), (s19, s17),

  -- Base de Datos ← Programación II, Estructura de Datos
  (s20, s15), (s20, s16),

  -- Sistemas Operativos ← Programación II, Estructura de Datos, Arquitectura de Comp.
  (s21, s15), (s21, s16), (s21, s17),

  -- Teoría de la Información y la Comunicación ← Física II, Prob. y Est., Cálculo Av., Arq. Comp.
  (s22, s09), (s22, s13), (s22, s14), (s22, s17),

  -- Análisis Numérico ← Análisis Matemático II
  (s23, s08),

  -- Modelos y Simulación ← Probabilidad y Estadística, Programación II
  (s24, s13), (s24, s15),

  -- Ingeniería de Software I ← Programación II, Estructura de Datos
  (s25, s15), (s25, s16),

  -- Programación III ← Base de Datos
  (s26, s20),

  -- Redes de Computadoras ← Sistemas de Representación, Teoría de la Información
  (s27, s05), (s27, s22),

  -- CUARTO AÑO
  -- Ingeniería de Software II ← Modelos y Simulación, Ing. SW I, Programación III
  (s28, s24), (s28, s25), (s28, s26),

  -- Economía ← Probabilidad y Estadística, Análisis Numérico
  (s29, s13), (s29, s23),

  -- Organización Empresarial ← Modelos y Simulación, Ingeniería de Software I
  (s30, s24), (s30, s25),

  -- Electiva I: sin correlativas oficiales (depende del área elegida)

  -- Sistemas de Tiempo Real ← Lenguajes Formales, Sist. Operativos, Modelos y Sim., Ing. SW I
  (s32, s19), (s32, s21), (s32, s24), (s32, s25),

  -- Arquitectura de Software ← Redes de Computadoras, Ingeniería de Software II
  (s33, s27), (s33, s28),

  -- Ética y Legislación ← Economía, Organización Empresarial
  (s34, s29), (s34, s30),

  -- Electiva II: sin correlativas oficiales

  -- Ingeniería del Software III ← Ingeniería de Software II
  (s36, s28),

  -- Seguridad Laboral y Gestión Ambiental ← Teoría de la Información y la Comunicación
  (s37, s22),

  -- QUINTO AÑO
  -- Reingeniería de Procesos y de Sistemas de Información ← Ética y Leg., Ing. SW III
  (s38, s34), (s38, s36),

  -- Auditoría Informática ← Ética y Leg., Ing. SW III, Seg. Laboral
  (s39, s34), (s39, s36), (s39, s37),

  -- Calidad y Certificación ← Ética y Leg., Ing. SW III
  (s40, s34), (s40, s36),

  -- Electiva III: sin correlativas

  -- Sistemas Inteligentes ← Sistemas de Tiempo Real, Arquitectura de Software
  (s42, s32), (s42, s33),

  -- Práctica Profesional Supervisada ← Modelos y Sim., Ing. SW I, Programación III, Redes
  (s43, s24), (s43, s25), (s43, s26), (s43, s27);

  -- Proyecto Integrador: sin correlativas explícitas en el plan oficial

  RAISE NOTICE 'Seed completado: carrera Ingeniería en Informática (UNCA) con 44 materias.';
  RAISE NOTICE 'career_id = %', v_career_id;

END $$;
