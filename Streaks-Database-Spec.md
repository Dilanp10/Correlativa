# Streaks-Database-Spec.md — Correlativa
## Paso 3 (SDD) — Esquema de Base de Datos: Rachas

> Estado: **borrador, pendiente de aprobación.**
> Depende de: `Streaks-Architecture.md` (aprobado, con D3 confirmado).

---

## 1. Cambios

Una sola migración: **3 columnas nuevas en la tabla `users`** existente. Sin tablas nuevas, sin políticas RLS nuevas.

| Columna | Tipo | Nulo | Default | Descripción |
|---|---|---|---|---|
| `last_active_date` | `date` | sí | — | Última fecha (zona local del usuario) en la que disparó una acción válida. `NULL` = nunca. |
| `current_streak` | `int` | no | `0` | Días consecutivos contados al cierre del último `last_active_date`. |
| `freeze_used_month` | `text` | sí | — | `'YYYY-MM'` del mes en que se gastó el congelador de gracia. `NULL` = sin usar este mes. |

### 1.1 Razón de los tipos
- `date` (no `timestamptz`): solo importa el día, no la hora. Más barato y más claro semánticamente. La zona horaria la maneja el cliente al calcular "hoy" antes de escribir.
- `int` con default `0`: la racha nunca puede ser negativa, y permite que usuarios viejos (sin actividad registrada) queden en `0` sin tocar nada.
- `text` para el mes: formato compacto, fácil de comparar (`'2026-05'`). Considerada también `smallint`/`date` truncado a mes, descartadas por verbosidad/menos legibles.

---

## 2. Migración SQL

```sql
ALTER TABLE users
  ADD COLUMN last_active_date   date,
  ADD COLUMN current_streak     int  NOT NULL DEFAULT 0,
  ADD COLUMN freeze_used_month  text;
```

**Idempotente:** podés correrla una sola vez. No hay datos a backfillear: los usuarios existentes arrancan con `last_active_date = NULL`, `current_streak = 0`, `freeze_used_month = NULL`, que es exactamente el estado "sin racha aún". Cuando hagan su próxima acción, se inicializa correctamente.

---

## 3. RLS

**Sin cambios.** La política `users_update_own` ya existente permite que cada usuario actualice su propia fila, incluidas estas columnas nuevas:

```sql
-- (ya existe, no se toca)
CREATE POLICY "users_update_own"
  ON users FOR UPDATE
  USING (id = auth.uid());
```

Como `users_select_own` ya está, también podemos leer los 3 campos sin problemas.

---

## 4. Índices

**No hace falta agregar.** Las consultas son siempre por `id = auth.uid()` (el PK), que ya tiene índice implícito. No hay queries por `last_active_date` ni rangos.

---

## 5. Lo que NO cambia
- Esquema de cualquier otra tabla.
- Políticas RLS (ni en `users` ni en otras).
- Triggers existentes (`handle_new_user`, `users_updated_at`). El trigger de `updated_at` va a actualizar `updated_at` cada vez que cambie alguna de las 3 columnas nuevas — eso es deseable.

---

## 6. Consideraciones futuras (fuera de scope)
Si en una tanda posterior se quiere **calendario/heatmap de actividad**, ahí sí va una tabla nueva (`user_activity_days(user_id, day date, PRIMARY KEY(user_id, day))`) con su RLS. No se hace ahora porque el PRD pidió "solo racha actual".

---

## 7. Plan operativo
La migración corre en una sola query en Supabase SQL Editor. La preparo y te la paso en el momento de implementación (Paso 7), no antes — así no te quedan SQL sueltos antes de que apruebes todo el flujo.
