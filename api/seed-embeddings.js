import { supabase } from '../lib/supabase.js'
import { generateBatchEmbeddings } from '../lib/ai-service.js'

// POST /api/seed-embeddings
export default async function handler(req, res) {
  // 1) Preflight — must come before your POST check
  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  // 2) Your existing CORS headers are still injected by vercel.json…

  // 3) Now block everything but POST
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method Not Allowed' })
  }

  const { properties } = req.body   // expect [{ id, … }, …]

  try {
    // 1. build your searchable text array
    const texts = properties.map((p) => p.texts)
    // 2. get OpenAI embeddings
    const embeddings = await generateBatchEmbeddings(texts)

    // 3. prepare upsert payload
    const payload = properties.map((p, i) => ({
      property_id:     p.id,
      searchable_text: texts[i],
      embedding:       embeddings[i]
    }))

    // 4. upsert + return the new/updated rows
    const { data: rows, error } = await supabase
      .from('property_embeddings')
      .upsert(payload, { onConflict: 'property_id' })
      .select('*')    // ← this tells Supabase to return the full rows

    if (error) throw error

    // 5. respond with the actual payload rows
    res.status(200).json({
      success: true,
      count:   rows.length,
      embeddings:    rows    // ← here’s your full-upserted payload
    })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: e.message })
  }
}
