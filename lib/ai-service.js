import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

export async function generateEmbedding(text) {
  const res = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text
  })
  return res.data[0].embedding
}

export async function generateBatchEmbeddings(texts) {
  const res = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: texts
  })
  return res.data.map((d) => d.embedding)
}
