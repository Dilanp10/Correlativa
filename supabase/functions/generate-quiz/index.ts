// Supabase Edge Function — generate-quiz
// Genera un quiz de 5 preguntas usando GitHub Models (gpt-4o-mini).
// Requiere: GITHUB_MODELS_TOKEN en los secrets del proyecto.
//
// Auth: con "Verify JWT" activado en el dashboard, Supabase valida el JWT
// del usuario ANTES de ejecutar esta función. Por eso no necesitamos el
// cliente de supabase-js acá (evita la dependencia que rompía el bundle).

const GITHUB_MODELS_URL = 'https://models.inference.ai.azure.com/chat/completions'
const MODEL = 'gpt-4o-mini'
const MAX_RETRIES = 1

const SYSTEM_PROMPT = `Sos un profesor universitario argentino que arma quizzes cortos para que estudiantes repasen sus materias.

Tu salida es SIEMPRE un JSON válido con esta forma exacta:

{
  "questions": [
    {
      "type": "mc",
      "question": "string (en español argentino, claro y conciso)",
      "options": ["string", "string", "string", "string"],
      "correctIndex": 0,
      "explanation": "string (1-2 oraciones explicando por qué es la correcta)"
    },
    {
      "type": "tf",
      "question": "string (afirmación que pueda ser verdadera o falsa)",
      "correctValue": true,
      "explanation": "string (1-2 oraciones explicando)"
    }
  ]
}

Reglas:
- EXACTAMENTE 5 preguntas.
- Mezcla los tipos: idealmente 3-4 mc y 1-2 tf.
- En "mc": exactamente 4 opciones, una sola correcta, distractores plausibles.
- En "tf": "correctValue" es booleano true o false (no string).
- Las preguntas en español argentino, nivel universitario.
- "explanation" nunca dice "la opción A/B/C" porque las opciones están en un array sin letras.
- No incluyas markdown, código, ni comillas extra. Solo el JSON.`

// ── Validación del shape de respuesta ────────────────────────────────────────

function isValidQuestion(q: unknown): boolean {
  if (!q || typeof q !== 'object') return false
  const obj = q as Record<string, unknown>
  if (typeof obj.question !== 'string' || obj.question.length === 0) return false
  if (typeof obj.explanation !== 'string') return false

  if (obj.type === 'mc') {
    return (
      Array.isArray(obj.options) &&
      obj.options.length === 4 &&
      obj.options.every((o: unknown) => typeof o === 'string' && o.length > 0) &&
      typeof obj.correctIndex === 'number' &&
      Number.isInteger(obj.correctIndex) &&
      obj.correctIndex >= 0 &&
      obj.correctIndex <= 3
    )
  }
  if (obj.type === 'tf') {
    return typeof obj.correctValue === 'boolean'
  }
  return false
}

function isValidQuiz(data: unknown): boolean {
  if (!data || typeof data !== 'object') return false
  const obj = data as Record<string, unknown>
  return (
    Array.isArray(obj.questions) &&
    obj.questions.length === 5 &&
    obj.questions.every(isValidQuestion)
  )
}

// ── Llamada al modelo ─────────────────────────────────────────────────────────

async function callModel(userPrompt: string, token: string): Promise<unknown> {
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
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
      max_tokens: 1500,
    }),
  })

  if (response.status === 429) throw new Error('rate_limit')
  if (!response.ok) {
    // Capturamos el cuerpo del error de GitHub Models para diagnóstico.
    const errBody = await response.text()
    console.error(`[generate-quiz] GitHub Models respondió ${response.status}:`, errBody)
    throw new Error(`model_error:${response.status}:${errBody.slice(0, 300)}`)
  }

  const json = await response.json()
  const content = json?.choices?.[0]?.message?.content
  if (!content) throw new Error('empty_response')

  return JSON.parse(content)
}

// ── Handler principal ─────────────────────────────────────────────────────────

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
}

Deno.serve(async (req: Request) => {
  // CORS preflight — responder 204 con todos los headers necesarios.
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS })
  }

  const headers = {
    'Content-Type': 'application/json',
    ...CORS_HEADERS,
  }

  // ── 1. Auth ───────────────────────────────────────────────────────────────
  // Con "Verify JWT" activado, Supabase ya rechazó los requests sin token
  // válido antes de llegar acá. Igual chequeamos que venga el header por las dudas.
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers })
  }

  // ── 2. Parsear body ──────────────────────────────────────────────────────────
  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: 'invalid_input', message: 'Body inválido.' }), { status: 400, headers })
  }

  const { subjectName, topic } = body
  if (typeof subjectName !== 'string' || subjectName.trim().length === 0) {
    return new Response(
      JSON.stringify({ error: 'invalid_input', message: 'subjectName es requerido.' }),
      { status: 400, headers }
    )
  }

  // ── 3. Obtener el token del modelo ───────────────────────────────────────────
  const token = Deno.env.get('GITHUB_MODELS_TOKEN')
  if (!token) {
    console.error('[generate-quiz] GITHUB_MODELS_TOKEN no configurado')
    // DIAGNÓSTICO: mensaje explícito para identificar el problema del secret.
    return new Response(
      JSON.stringify({
        error: 'internal',
        message: 'DEBUG: el secret GITHUB_MODELS_TOKEN no está disponible en el Edge Function. Verificá el nombre del secret y re-deployá la función.',
      }),
      { status: 500, headers }
    )
  }

  // ── 4. Construir prompt ──────────────────────────────────────────────────────
  const topicLine = typeof topic === 'string' && topic.trim()
    ? `Tema o foco: ${topic.trim()}\n`
    : ''
  const userPrompt = `Materia: ${subjectName.trim()}\n${topicLine}Generá 5 preguntas para que el estudiante repase. Devolveme solo el JSON.`

  // ── 5. Llamar al modelo con 1 reintento ──────────────────────────────────────
  let attempts = 0
  let lastError: Error | null = null

  while (attempts <= MAX_RETRIES) {
    try {
      const data = await callModel(userPrompt, token)

      if (!isValidQuiz(data)) {
        throw new Error('invalid_shape')
      }

      return new Response(JSON.stringify(data), { status: 200, headers })
    } catch (err) {
      lastError = err as Error
      if (lastError.message === 'rate_limit') break // no tiene sentido reintentar
      attempts++
    }
  }

  // ── 6. Manejar errores finales ───────────────────────────────────────────────
  if (lastError?.message === 'rate_limit') {
    return new Response(
      JSON.stringify({ error: 'rate_limit', message: 'Alcanzaste el límite gratuito de quizzes por hoy. Probá más tarde.' }),
      { status: 429, headers }
    )
  }

  console.error('[generate-quiz] error final después de reintentos:', lastError)
  // DIAGNÓSTICO: incluimos el detalle real del error para identificar la causa.
  return new Response(
    JSON.stringify({
      error: 'ai_invalid_response',
      message: `DEBUG: ${lastError?.message ?? 'error desconocido'}`,
    }),
    { status: 502, headers }
  )
})
