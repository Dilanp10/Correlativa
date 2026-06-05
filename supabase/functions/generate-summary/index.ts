// Supabase Edge Function — generate-summary
// Genera un resumen breve de un tema usando GitHub Models (gpt-4o-mini).
// Requiere: GITHUB_MODELS_TOKEN en los secrets del proyecto.
//
// Auth: con "Verify JWT" activado en el dashboard, Supabase valida el JWT
// del usuario antes de ejecutar esta función. Igual chequeamos el header.
//
// Spec: specs/008-v2/API-Contracts.md §4.1

const GITHUB_MODELS_URL = 'https://models.inference.ai.azure.com/chat/completions'
const MODEL = 'gpt-4o-mini'
const MAX_RETRIES = 1
const MAX_TEXT_CHARS = 10_000

const SYSTEM_PROMPT = `Sos un profesor universitario argentino que arma resúmenes claros y concisos para estudiantes que están repasando.

Tu salida es SIEMPRE un JSON válido con esta forma exacta:

{
  "title": "string (título corto del resumen, máximo 60 caracteres, sin punto final)",
  "content": "string (cuerpo del resumen en español argentino, 3-8 párrafos, lenguaje claro y didáctico, podés usar Markdown simple como **negrita** o listas con guiones)",
  "keyPoints": ["string", "string", "..."]
}

Reglas:
- "title": resume en pocas palabras el tema del resumen (ej: "Integrales por Sustitución", "Leyes de Newton").
- "content": el resumen en sí. Explicá los conceptos clave de forma didáctica, como si fueras un profesor explicando para un examen. Español argentino, voseo natural, sin jerga complicada innecesaria.
- "keyPoints": entre 3 y 7 bullets cortos con los conceptos más importantes del tema. Cada uno una frase concreta y memorable.
- Si el usuario te pasa un texto de referencia, basá el resumen en ese texto. Si no, generá en base al conocimiento general del tema.
- No incluyas markdown en "title" ni en "keyPoints". En "content" sí podés usar **negrita** y listas.
- No incluyas comillas extra, código markdown (\`\`\`json) ni texto fuera del JSON. Solo el JSON.`

// ── Validación de la respuesta ───────────────────────────────────────────────

function isValidSummary(data: unknown): boolean {
  if (!data || typeof data !== 'object') return false
  const obj = data as Record<string, unknown>
  if (typeof obj.title !== 'string' || obj.title.trim().length === 0) return false
  if (typeof obj.content !== 'string' || obj.content.trim().length === 0) return false
  if (!Array.isArray(obj.keyPoints)) return false
  if (obj.keyPoints.length < 1 || obj.keyPoints.length > 10) return false
  if (!obj.keyPoints.every((k: unknown) => typeof k === 'string' && k.trim().length > 0)) {
    return false
  }
  return true
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
      max_tokens: 2500,
    }),
  })

  if (response.status === 429) throw new Error('rate_limit')
  if (!response.ok) {
    const errBody = await response.text()
    console.error(`[generate-summary] GitHub Models respondió ${response.status}:`, errBody)
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

  const { subjectName, topic, text } = body

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

  // 3. Token del modelo
  const modelToken = Deno.env.get('GITHUB_MODELS_TOKEN')
  if (!modelToken) {
    console.error('[generate-summary] GITHUB_MODELS_TOKEN no configurado')
    return new Response(
      JSON.stringify({ error: 'internal', message: 'Configuración de servidor incompleta.' }),
      { status: 500, headers }
    )
  }

  // 4. Construir prompt
  let userPrompt = `Materia: ${subjectName.trim()}\nTema: ${topic.trim()}\n`
  if (typeof text === 'string' && text.trim().length > 0) {
    const truncated = text.trim().slice(0, MAX_TEXT_CHARS)
    userPrompt += `\nTexto de referencia (basate en esto):\n"""\n${truncated}\n"""\n`
  }
  userPrompt += `\nGenerá un resumen claro y didáctico. Devolveme solo el JSON.`

  // 5. Llamar al modelo con 1 reintento
  let attempts = 0
  let lastError: Error | null = null

  while (attempts <= MAX_RETRIES) {
    try {
      const data = await callModel(SYSTEM_PROMPT, userPrompt, modelToken)
      if (!isValidSummary(data)) throw new Error('invalid_shape')

      // Trimmeamos los strings para devolver respuesta limpia
      const obj = data as { title: string; content: string; keyPoints: string[] }
      const clean = {
        title: obj.title.trim(),
        content: obj.content.trim(),
        keyPoints: obj.keyPoints.map(k => k.trim()).filter(k => k.length > 0),
      }
      return new Response(JSON.stringify(clean), { status: 200, headers })
    } catch (err) {
      lastError = err as Error
      console.warn(
        `[generate-summary] intento ${attempts + 1}/${MAX_RETRIES + 1} falló:`,
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

  console.error('[generate-summary] fallo final tras reintentos:', lastError)
  return new Response(
    JSON.stringify({
      error: 'ai_invalid_response',
      message: 'No pudimos generar el resumen. Probá con otro tema o más tarde.',
    }),
    { status: 502, headers }
  )
})
