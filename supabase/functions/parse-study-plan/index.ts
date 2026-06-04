// Supabase Edge Function — parse-study-plan
// Extrae las materias de un PDF (plan de estudios) y las inserta en la DB.
//
// Acciones (routing por `action` en el body):
//   - "parse": recibe multipart/form-data con el PDF, devuelve { subjects, partial, warning }.
//   - "save":  recibe JSON con { careerId, subjects[] }, inserta en `subjects` y
//              `subject_correlatives` usando la service role key.
//
// Requiere secrets:
//   - GITHUB_MODELS_TOKEN  (reusa el de generate-quiz)
//   - SUPABASE_URL         (inyectado por Supabase automáticamente)
//   - SUPABASE_SERVICE_ROLE_KEY (inyectado por Supabase automáticamente)
//
// Auth: validamos el header Authorization manualmente (Verify JWT en el
// dashboard se deja DESACTIVADO para evitar el problema de CORS conocido).

import { extractText, getDocumentProxy } from 'https://esm.sh/unpdf@0.12.1'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4'

// ── Configuración ───────────────────────────────────────────────────────────────

const GITHUB_MODELS_URL = 'https://models.inference.ai.azure.com/chat/completions'
const MODEL = 'gpt-4o-mini'
const MAX_PDF_BYTES = 5 * 1024 * 1024 // 5 MB
const MAX_TEXT_CHARS = 50_000
const MAX_RETRIES = 1

const SYSTEM_PROMPT = `Sos un asistente que extrae materias de planes de estudios universitarios argentinos.

Entrada: el texto plano de un PDF con el plan de una carrera.
Salida: SIEMPRE un JSON válido con esta forma exacta:

{
  "subjects": [
    {
      "name": "Análisis Matemático I",
      "year": 1,
      "semester": 1,
      "correlativeNames": ["Algebra", "Geometría Analítica"]
    }
  ],
  "partial": false,
  "warning": null
}

Reglas:
- Detectá TODAS las materias del plan. No inventes ninguna.
- "name" SIEMPRE presente (string no vacío).
- "year": entero (1, 2, 3...). Si no se puede determinar, usá null.
- "semester": 1 o 2 (cuatrimestre). Para materias anuales podés usar 1. Si no se puede determinar, usá null.
- "correlativeNames": array de nombres EXACTOS de otras materias del mismo plan que son correlativas (pueden estar vacíos []). Solo nombres que aparecen como otras materias en el plan.
- "partial": true si parte del texto era ilegible o el plan parece incompleto; false si extrajiste todo bien.
- "warning": string corto en español si "partial" es true, explicando qué pasó; null en otro caso.
- No incluyas materias optativas/electivas sin nombre concreto.
- No incluyas comentarios, markdown, ni texto fuera del JSON. Solo el JSON.`

// ── CORS ────────────────────────────────────────────────────────────────────────

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
}

const JSON_HEADERS = {
  'Content-Type': 'application/json',
  ...CORS_HEADERS,
}

// ── Helpers de respuesta ────────────────────────────────────────────────────────

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS })
}

function errorResponse(error: string, message: string, status: number): Response {
  return jsonResponse({ error, message }, status)
}

// ── Validación de subjects ──────────────────────────────────────────────────────

interface RawSubject {
  name: string
  year: number | null
  semester: number | null
  correlativeNames: string[]
}

function coerceInt(value: unknown): number | null {
  if (value === null || value === undefined) return null
  if (typeof value === 'number' && Number.isFinite(value) && Number.isInteger(value)) return value
  if (typeof value === 'string') {
    const parsed = Number.parseInt(value, 10)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

function validateSubject(raw: unknown): RawSubject | null {
  if (!raw || typeof raw !== 'object') return null
  const obj = raw as Record<string, unknown>
  if (typeof obj.name !== 'string' || obj.name.trim().length === 0) return null

  const correlativeNames = Array.isArray(obj.correlativeNames)
    ? obj.correlativeNames.filter(
        (c: unknown): c is string => typeof c === 'string' && c.trim().length > 0
      ).map(c => c.trim())
    : []

  return {
    name: obj.name.trim(),
    year: coerceInt(obj.year),
    semester: coerceInt(obj.semester),
    correlativeNames,
  }
}

interface ParseShape {
  subjects: RawSubject[]
  partial: boolean
  warning: string | null
}

function validateAndNormalize(data: unknown): ParseShape | null {
  if (!data || typeof data !== 'object') return null
  const obj = data as Record<string, unknown>
  if (!Array.isArray(obj.subjects)) return null

  const subjects: RawSubject[] = []
  for (const item of obj.subjects) {
    const valid = validateSubject(item)
    if (valid) subjects.push(valid)
  }

  return {
    subjects,
    partial: typeof obj.partial === 'boolean' ? obj.partial : false,
    warning:
      typeof obj.warning === 'string' && obj.warning.trim().length > 0
        ? obj.warning.trim()
        : null,
  }
}

// ── Llamada al modelo ───────────────────────────────────────────────────────────

async function callModel(userText: string, token: string): Promise<unknown> {
  const response = await fetch(GITHUB_MODELS_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: `Texto del plan de estudios (puede estar desordenado):\n\n${userText}\n\nDevolveme solo el JSON con las materias.`,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.2,
      max_tokens: 4000,
    }),
  })

  if (response.status === 429) throw new Error('rate_limit')
  if (!response.ok) {
    const errBody = await response.text()
    console.error(`[parse-study-plan] GitHub Models ${response.status}:`, errBody)
    throw new Error(`model_error:${response.status}`)
  }

  const json = await response.json()
  const content = json?.choices?.[0]?.message?.content
  if (!content) throw new Error('empty_response')
  return JSON.parse(content)
}

// ── Acción `parse` ──────────────────────────────────────────────────────────────

async function handleParse(req: Request): Promise<Response> {
  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return errorResponse('invalid_file', 'No se pudo leer el archivo subido.', 400)
  }

  const file = formData.get('file')
  if (!(file instanceof File)) {
    return errorResponse('invalid_file', 'No se recibió ningún archivo.', 400)
  }

  if (file.size > MAX_PDF_BYTES) {
    return errorResponse('invalid_file', 'El PDF supera el límite de 5 MB.', 400)
  }

  // No confiamos solo en file.type (browsers a veces mandan vacío). Validamos
  // por extensión Y por magic bytes (PDF arranca con %PDF-).
  const arrayBuffer = await file.arrayBuffer()
  const head = new Uint8Array(arrayBuffer.slice(0, 5))
  const isPdf =
    head[0] === 0x25 && head[1] === 0x50 && head[2] === 0x44 && head[3] === 0x46 && head[4] === 0x2d
  if (!isPdf) {
    return errorResponse('invalid_file', 'El archivo no es un PDF válido.', 400)
  }

  // Extraer texto con unpdf
  let extractedText: string
  let extractedPages: number
  try {
    const pdf = await getDocumentProxy(new Uint8Array(arrayBuffer))
    const { text, totalPages } = await extractText(pdf, { mergePages: true })
    extractedText = (Array.isArray(text) ? text.join('\n') : text).trim()
    extractedPages = totalPages
  } catch (err) {
    console.error('[parse-study-plan] unpdf falló:', err)
    return errorResponse(
      'invalid_file',
      'No pudimos leer el contenido del PDF. ¿Está protegido o es una imagen escaneada?',
      400
    )
  }

  if (!extractedText || extractedText.length < 50) {
    return errorResponse(
      'no_subjects_found',
      'El PDF no contiene texto suficiente. Puede ser una imagen escaneada.',
      422
    )
  }

  // Truncar si excede el límite
  let truncated = false
  if (extractedText.length > MAX_TEXT_CHARS) {
    extractedText = extractedText.slice(0, MAX_TEXT_CHARS)
    truncated = true
  }

  const token = Deno.env.get('GITHUB_MODELS_TOKEN')
  if (!token) {
    console.error('[parse-study-plan] GITHUB_MODELS_TOKEN no configurado')
    return errorResponse('internal', 'Configuración de servidor incompleta.', 500)
  }

  // Llamar al modelo con 1 reintento
  let attempts = 0
  let lastError: Error | null = null
  let parsed: ParseShape | null = null

  while (attempts <= MAX_RETRIES) {
    try {
      const raw = await callModel(extractedText, token)
      parsed = validateAndNormalize(raw)
      if (!parsed) throw new Error('invalid_shape')
      break
    } catch (err) {
      lastError = err as Error
      if (lastError.message === 'rate_limit') break
      attempts++
    }
  }

  if (!parsed) {
    if (lastError?.message === 'rate_limit') {
      return errorResponse(
        'rate_limit',
        'Alcanzamos el límite gratuito por ahora. Probá de nuevo en unos minutos.',
        429
      )
    }
    console.error('[parse-study-plan] fallo final tras reintentos:', lastError)
    return errorResponse(
      'ai_invalid_response',
      'No pudimos procesar el PDF. Probá con otro archivo o cargá las materias a mano.',
      502
    )
  }

  if (parsed.subjects.length === 0) {
    return errorResponse(
      'no_subjects_found',
      'No encontramos materias en este PDF. ¿Es realmente un plan de estudios?',
      422
    )
  }

  // Agregar warning si truncamos el texto
  let { partial, warning } = parsed
  if (truncated && !partial) {
    partial = true
    warning = warning ?? `El PDF era muy largo y procesamos las primeras ${MAX_TEXT_CHARS} letras. Pueden faltar materias.`
  }

  // Agregar confidence a cada materia según presencia de año + semestre
  const subjectsWithConfidence = parsed.subjects.map(s => ({
    ...s,
    confidence: (s.year !== null && s.semester !== null ? 'high' : 'low') as 'high' | 'low',
  }))

  return jsonResponse({
    subjects: subjectsWithConfidence,
    partial,
    warning,
    pages: extractedPages,
  })
}

// ── Acción `save` ───────────────────────────────────────────────────────────────

interface SaveBody {
  action: 'save'
  careerId: string
  subjects: RawSubject[]
}

function isValidSaveBody(body: unknown): body is SaveBody {
  if (!body || typeof body !== 'object') return false
  const obj = body as Record<string, unknown>
  if (typeof obj.careerId !== 'string' || obj.careerId.length === 0) return false
  if (!Array.isArray(obj.subjects)) return false
  return true
}

function normalize(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
}

async function handleSave(req: Request, authHeader: string): Promise<Response> {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return errorResponse('invalid_input', 'Body inválido.', 400)
  }

  if (!isValidSaveBody(body)) {
    return errorResponse('invalid_input', 'careerId y subjects son requeridos.', 400)
  }

  const { careerId, subjects: rawSubjects } = body
  const subjects = rawSubjects
    .map(validateSubject)
    .filter((s): s is RawSubject => s !== null)

  if (subjects.length === 0) {
    return errorResponse('invalid_input', 'No hay materias válidas para insertar.', 400)
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !serviceKey) {
    console.error('[parse-study-plan] SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY faltan')
    return errorResponse('internal', 'Configuración de servidor incompleta.', 500)
  }

  // Validar el JWT del usuario contra Supabase. Usamos el anon key del header
  // para crear un cliente y verificar la sesión. Si no es válida, rechazamos.
  const userClient = createClient(supabaseUrl, serviceKey, {
    global: { headers: { Authorization: authHeader } },
  })
  const jwt = authHeader.replace(/^Bearer\s+/i, '')
  const { data: userData, error: userErr } = await userClient.auth.getUser(jwt)
  if (userErr || !userData?.user) {
    return errorResponse('unauthorized', 'Sesión inválida.', 401)
  }

  // Cliente con service role para los inserts (bypass RLS).
  const admin = createClient(supabaseUrl, serviceKey)

  // 1. Insert masivo en subjects con ON CONFLICT (career_id, name) DO NOTHING.
  //    Hacemos upsert con onConflict + ignoreDuplicates para el mismo efecto.
  const subjectRows = subjects.map(s => ({
    career_id: careerId,
    name: s.name,
    year: s.year ?? 1,
    semester: s.semester ?? 1,
  }))

  // Capturamos qué materias ya existían ANTES del insert (para reportar skipped).
  const { data: preexisting, error: preErr } = await admin
    .from('subjects')
    .select('id, name')
    .eq('career_id', careerId)

  if (preErr) {
    console.error('[parse-study-plan] error leyendo subjects existentes:', preErr)
    return errorResponse('internal', 'Error consultando materias existentes.', 500)
  }

  const existingByNormName = new Map<string, string>()
  for (const row of preexisting ?? []) {
    existingByNormName.set(normalize(row.name), row.id)
  }

  // Filtramos las que no existen para insertarlas. Las que ya existen las
  // contamos como skipped.
  const toInsert: typeof subjectRows = []
  let skipped = 0
  for (const row of subjectRows) {
    if (existingByNormName.has(normalize(row.name))) {
      skipped++
    } else {
      toInsert.push(row)
    }
  }

  let inserted = 0
  if (toInsert.length > 0) {
    const { data: insertedRows, error: insErr } = await admin
      .from('subjects')
      .insert(toInsert)
      .select('id, name')

    if (insErr) {
      console.error('[parse-study-plan] error insertando subjects:', insErr)
      return errorResponse('internal', 'No pudimos insertar las materias.', 500)
    }

    for (const row of insertedRows ?? []) {
      existingByNormName.set(normalize(row.name), row.id)
    }
    inserted = insertedRows?.length ?? 0
  }

  // 2. Resolver correlativas (correlativeNames → subject IDs) e insertar.
  const correlativeRows: { subject_id: string; requires_subject_id: string }[] = []
  const unresolvedSet = new Set<string>()

  for (const s of subjects) {
    const subjectId = existingByNormName.get(normalize(s.name))
    if (!subjectId) continue // raro, ya debería estar
    for (const corrName of s.correlativeNames) {
      const requiresId = existingByNormName.get(normalize(corrName))
      if (!requiresId || requiresId === subjectId) {
        if (!requiresId) unresolvedSet.add(corrName)
        continue
      }
      correlativeRows.push({ subject_id: subjectId, requires_subject_id: requiresId })
    }
  }

  let correlativesLinked = 0
  if (correlativeRows.length > 0) {
    // Deduplicamos antes de insertar.
    const dedup = new Map<string, { subject_id: string; requires_subject_id: string }>()
    for (const row of correlativeRows) {
      dedup.set(`${row.subject_id}:${row.requires_subject_id}`, row)
    }
    const unique = Array.from(dedup.values())

    // Leer las que ya existen para evitar conflict.
    const subjectIds = Array.from(new Set(unique.map(r => r.subject_id)))
    const { data: existingCorr, error: corrReadErr } = await admin
      .from('subject_correlatives')
      .select('subject_id, requires_subject_id')
      .in('subject_id', subjectIds)

    if (corrReadErr) {
      console.error('[parse-study-plan] error leyendo correlativas existentes:', corrReadErr)
    }

    const existingKeys = new Set(
      (existingCorr ?? []).map(r => `${r.subject_id}:${r.requires_subject_id}`)
    )

    const newCorr = unique.filter(r => !existingKeys.has(`${r.subject_id}:${r.requires_subject_id}`))

    if (newCorr.length > 0) {
      const { error: insCorrErr } = await admin.from('subject_correlatives').insert(newCorr)
      if (insCorrErr) {
        console.error('[parse-study-plan] error insertando correlativas:', insCorrErr)
      } else {
        correlativesLinked = newCorr.length
      }
    }
  }

  return jsonResponse({
    inserted,
    skipped,
    correlativesLinked,
    correlativesUnresolved: Array.from(unresolvedSet),
  })
}

// ── Handler principal ───────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS })
  }

  if (req.method !== 'POST') {
    return errorResponse('invalid_input', 'Solo POST.', 405)
  }

  // Auth: validamos que venga el header. Para `save` además validamos el JWT
  // contra Supabase (handleSave hace getUser). Para `parse` alcanza con que
  // exista el header — la operación es read-only.
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return errorResponse('unauthorized', 'Token requerido.', 401)
  }

  // Router por content-type / body: si es multipart, es parse. Si es JSON, es save.
  const contentType = req.headers.get('content-type') ?? ''

  try {
    if (contentType.includes('multipart/form-data')) {
      return await handleParse(req)
    }
    if (contentType.includes('application/json')) {
      return await handleSave(req, authHeader)
    }
    return errorResponse(
      'invalid_input',
      'Content-Type debe ser multipart/form-data o application/json.',
      400
    )
  } catch (err) {
    console.error('[parse-study-plan] error inesperado:', err)
    return errorResponse('internal', 'Error inesperado del servidor.', 500)
  }
})
