// Aplica las migraciones de v2 contra Supabase usando la Management API.
// Uso: SUPABASE_ACCESS_TOKEN=... node specs/008-v2/migrations/_apply.mjs [001|002|003|004|005|all]
//
// No requiere dependencias externas (fetch nativo de Node 18+).

import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const PROJECT_REF = 'hstxlrlzllhpzlcnodac'
const TOKEN = process.env.SUPABASE_ACCESS_TOKEN
if (!TOKEN) {
  console.error('Falta SUPABASE_ACCESS_TOKEN en el entorno.')
  process.exit(1)
}

const MIGRATIONS = [
  '001_alter_subject_correlatives_type.sql',
  '002_create_study_notes.sql',
  '003_create_flashcard_sets.sql',
  '004_create_flashcards.sql',
  '005_rls_policies_v2.sql',
]

const arg = process.argv[2] ?? 'all'

async function runOne(filename) {
  const filepath = path.join(__dirname, filename)
  const sql = await fs.readFile(filepath, 'utf-8')

  process.stdout.write(`▶ ${filename} ... `)
  const res = await fetch(
    `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: sql }),
    }
  )

  const text = await res.text()
  if (!res.ok) {
    console.log(`FAIL (${res.status})`)
    console.log(text)
    process.exit(1)
  }
  console.log('OK')
  if (text && text !== '[]' && text !== 'null') {
    // Solo loguea si hay output significativo
    const trimmed = text.length > 200 ? text.slice(0, 200) + '...' : text
    console.log('  ↳', trimmed)
  }
}

const target =
  arg === 'all' ? MIGRATIONS : MIGRATIONS.filter(m => m.startsWith(arg))
if (target.length === 0) {
  console.error(`No matchea ninguna migración con "${arg}"`)
  process.exit(1)
}

for (const m of target) {
  await runOne(m)
}
console.log('\nListo.')
