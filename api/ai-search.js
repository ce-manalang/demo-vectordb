import { supabase } from '../lib/supabase.js'
import { generateEmbedding } from '../lib/ai-service.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method Not Allowed' })
  }

  const { userQuery } = req.body
  try {
    // 1. create embedding
    const queryEmbedding = await generateEmbedding(userQuery)

    // 2. vector search in Supabase
    const { data, error } = await supabase
      .from('property_embeddings')
      .select('property_id, embedding')
      .order('embedding', {
        ascending: false,
        distance: queryEmbedding
      })
      .limit(20)

    if (error) throw error
    if (!data.length) return res.status(200).json([])

    // 3. fetch full properties
    const ids = data.map((r) => r.property_id)
    const { data: props, error: propErr } = await supabase
      .from('properties')
      .select('*')
      .in('id', ids)

    if (propErr) throw propErr

    // 4. combine with similarity
    const results = data.map((r) => {
      const prop = props.find((p) => p.id === r.property_id)
      const similarity = 1 - r.embedding.distance
      return prop ? { property: prop, similarity } : null
    }).filter(Boolean)

    res.status(200).json(results)
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: e.message })
  }
}
