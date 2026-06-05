// Supabase Edge Function — generate-flashcards
// Genera N pares pregunta/respuesta para repaso usando GitHub Models.
// Requiere: GITHUB_MODELS_TOKEN en los secrets del proyecto.
//
// Spec: specs/008-v2/API-Contracts.md §4.2

const GITHUB_MODELS_URL = 'https://models.inference.ai.azure.com/chat/completions'
const MODEL = 'gpt-4o-mini'
const MAX_RETRIES = 1
const MAX_TEXT_CHARS = 10_000
const MIN_COUNT = 5
const MAX_COUNT = 20

const SYSTEM_PROMPT = `Sos un profesor universitario argentino que arma flashcards (tarjetas de estudio) para que estudiantes repasen un tema.

Tu salida es SIEMPRE un JSON válido con esta forma exacta:

{
  "flashcards": [
    {
      "question": "string (pregunta corta y concreta, una sola idea)",
      "answer": "string (respuesta de 1-3 oraciones, suficiente para entender pero corta para memorizar)"
    }
  ]
}

Reglas:
- Cantidad EXACTA de flashcards solicitada por el usuario (entre 5 y 20).
- "question": una pregunta clara y directa. Evitá "¿Qué es X?" repetido — variá entre definiciones, ejemplos, aplicaciones, diferencias, causas/efectos.
- "answer": respuesta concreta, 1-3 oraciones cortas. Que se pueda leer rápido y memorizar.
- Español argentino, voseo natural.
- Cubrí distintos aspectos del tema: definiciones, propiedades, ejemplos, casos de uso, fórmulas si aplica.
- Si el usuario te pasa texto de referencia, las flashcards deben basarse en ese texto.
- No incluyas markdown, código, ni texto fuera del JSON. Solo el JSON.`

// ── Validación ───────────────────────────────────────────────────────────────

function isValidFlashcard(c: unknown): boolean {
  if (!c || typeof c !== 'object') return false
  const obj = c as Record<string, unknown>
  return (
    typeof obj.question === 'string' &&
    obj.question.trim().length > 0 &&
    typeof obj.answer === 'string' &&
    obj.answer.trim().length > 0
  )
}

function isValidFlashcardSet(data: unknown, expectedCount: number): boolean {
  if (!data || typeof data !== 'object') return false
  const obj = data as Record<string, unknown>
  if (!Array.isArray(obj.flashcards)) return false
  // Aceptamos hasta -2/+2 del count pedido para tolerar a la IA
  const len = obj.flashcards.length
  if (len < Math.max(MIN_COUNT, expectedCount - 2)) return false
  if (len > expectedCount + 2) return false
  return obj.flashcards.every(isValidFlashcard)
}

// ── Llamada al modelo ────────────────────────────────────────────────────────

async function callModel(systemPrompt: string, userPrompt: string, token: string): Promise<unknown> {
  const response = await fetch(GITHUB_MODELS_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.6,
      max_tokens: 3000,
    }),
  })

  if (response.status === 429) throw new Error('rate_limit')
  if (!response.ok) {
    const errBody = await response.text()
    console.error(`[generate-flashcards] GitHub Models respondió ${response.status}:`, errBody)
    throw new Error(`model_error:${response.status}`)
  }

  const json = await response.json()
  const content = json?.choices?.[0]?.message?.content
  if (!content) throw new Error('empty_response')

  return JSON.parse(content)
}

// ── CORS ─────────────────────────────────────────────────────────────────────

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
}

// ── Handler ──────────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS })
  }

  const headers = { 'Content-Type': 'application/json', ...CORS_HEADERS }

  // 1. Auth básica
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return new Response(
      JSON.stringify({ error: 'unauthorized', message: 'Token requerido.' }),
      { status: 401, headers }
    )
  }

  // 2. Parsear body
  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return new Response(
      JSON.stringify({ error: 'invalid_input', message: 'Body inválido.' }),
      { status: 400, headers }
    )
  }

  const { subjectName, topic, text, count } = body

  if (typeof subjectName !== 'string' || subjectName.trim().length === 0) {
    return new Response(
      JSON.stringify({ error: 'invalid_input', message: 'subjectName es requerido.' }),
      { status: 400, headers }
    )
  }

  if (typeof topic !== 'string' || topic.trim().length < 3) {
    return new Response(
      JSON.stringify({
        error: 'invalid_input',
        message: 'Necesitamos un tema de al menos 3 caracteres.',
      }),
      { status: 400, headers }
    )
  }

  // count opcional, default 10. Clamp a [5, 20].
  let n = typeof count === 'number' && Number.isFinite(count) ? Math.floor(count) : 10
  if (n < MIN_COUNT) n = MIN_COUNT
  if (n > MAX_COUNT) n = MAX_COUNT

  // 3. Token del modelo
  const modelToken = Deno.env.get('GITHUB_MODELS_TOKEN')
  if (!modelToken) {
    console.error('[generate-flashcards] GITHUB_MODELS_TOKEN no configurado')
    return new Response(
      JSON.stringify({ error: 'internal', message: 'Configuración de servidor incompleta.' }),
      { status: 500, headers }
    )
  }

  // 4. Construir prompt
  let userPrompt = `Materia: ${subjectName.trim()}\nTema: ${topic.trim()}\nCantidad de flashcards: ${n}\n`
  if (typeof text === 'string' && text.trim().length > 0) {
    const truncated = text.trim().slice(0, MAX_TEXT_CHARS)
    userPrompt += `\nTexto de referencia (basate en esto):\n"""\n${truncated}\n"""\n`
  }
  userPrompt += `\nGenerá exactamente ${n} flashcards. Devolveme solo el JSON.`

  // 5. Llamar al modelo con 1 reintento
  let attempts = 0
  let lastError: Error | null = null

  while (attempts <= MAX_RETRIES) {
    try {
      const data = await callModel(SYSTEM_PROMPT, userPrompt, modelToken)
      if (!isValidFlashcardSet(data, n)) throw new Error('invalid_shape')

      const obj = data as { flashcards: Array<{ question: string; answer: string }> }
      const clean = {
        flashcards: obj.flashcards.map(c => ({
          question: c.question.trim(),
          answer: c.answer.trim(),
        })),
      }
      return new Response(JSON.stringify(clean), { status: 200, headers })
    } catch (err) {
      lastError = err as Error
      console.warn(
        `[generate-flashcards] intento ${attempts + 1}/${MAX_RETRIES + 1} falló:`,
        lastError.message
      )
      if (lastError.message === 'rate_limit') break
      attempts++
    }
  }

  // 6. Errores finales
  if (lastError?.message === 'rate_limit') {
    return new Response(
      JSON.stringify({
        error: 'rate_limit',
        message: 'Alcanzamos el límite gratuito. Probá en unos minutos.',
      }),
      { status: 429, headers }
    )
  }

  console.error('[generate-flashcards] fallo final tras reintentos:', lastError)
  return new Response(
    JSON.stringify({
      error: 'ai_invalid_response',
      message: 'No pudimos generar las flashcards. Probá con otro tema o más tarde.',
    }),
    { status: 502, headers }
  )
})
