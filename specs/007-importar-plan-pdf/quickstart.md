# Quickstart: Importar Plan de Estudios desde PDF

Cómo probar la feature una vez implementada.

## Requisitos previos

1. Tener un PDF del plan de estudios de tu carrera (ej: el de UNCA Ing.
   Informática disponible en descargas).
2. Estar logueado con una carrera activa y **sin materias cargadas**.
3. El Edge Function `parse-study-plan` deployado en Supabase.
4. El secret `GITHUB_MODELS_TOKEN` ya configurado (reutiliza el del quiz).

> **Nota**: No requiere SQL ni migraciones. Se escribe en las tablas existentes.

---

## Probar el flujo completo (User Story P1 + P2 + P3)

### Vía onboarding (P3)

1. Creá una cuenta nueva → elegí carrera.
2. Después de elegir la carrera, deberías ver la pantalla "¿Subís tu plan?".
3. Tocá "Subir ahora" → se abre el selector de archivos.
4. Elegí el PDF → esperás ~10 seg.
5. Ves la lista de materias detectadas con año y cuatrimestre.
6. Tocá "Confirmar" → las materias se cargan.
7. Vas al Dashboard → el árbol tiene tus materias. El banner NO aparece.

### Vía banner en Dashboard (P2)

1. Usá un usuario con carrera activa y sin materias (saltea el onboarding).
2. Entrá al Dashboard → deberías ver el banner "Subí tu plan de estudios".
3. Tocá el banner → te lleva a la pantalla de importación.
4. Seguí los pasos del upload.
5. Al volver al Dashboard → el banner desaparece.

---

## Pruebas puntuales

### PDF no procesable
1. Subí un PDF que no sea un plan de estudios (ej: cualquier PDF genérico).
2. Esperá el procesamiento.
3. Deberías ver el error `no_subjects_found` con un mensaje claro.

### Upload de PDF escaneado (sin texto)
1. Subí un PDF de imagen escaneada sin OCR.
2. El extractor de texto devuelve texto vacío → misma respuesta que arriba.

### Doble importación (deduplicación)
1. Importá el mismo PDF dos veces.
2. La segunda vez debería decir `inserted: 0, skipped: N`.

### Banner no reaparece
1. Cargá materias por PDF.
2. Eliminá todas las materias desde el árbol.
3. Volvé al Dashboard → el banner **reaparece** (estado derivado, es correcto).

---

## Pruebas automatizadas

```bash
# Tests de la lógica de validación del JSON de materias
npx vitest run src/features/pdf-import/lib/subjectParser.test.ts
```

Cubre: validación de SubjectDraft, detección de confidence alto/bajo,
deduplicación, subjects con year/semester nulos.

---

## Checklist de salida

- [ ] `npx tsc --noEmit` sin errores.
- [ ] `npx vitest run` todo verde.
- [ ] `npm run build` ok.
- [ ] Upload en mobile funciona (file picker nativo).
- [ ] Banner aparece con 0 materias, desaparece con ≥ 1.
- [ ] Edge Function deployada y accesible (mismo patrón CORS que `generate-quiz`).
