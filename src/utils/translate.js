import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY)
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

const LANG_NAMES = { en: 'English', he: 'Hebrew' }

export async function translateText(text, targetLang) {
  const result = await model.generateContent(
    `Translate the following text to ${LANG_NAMES[targetLang] || targetLang}. Return ONLY the translated text, nothing else.\n\n${text}`
  )
  return result.response.text().trim()
}

export async function translateMultiple(texts, targetLang) {
  const langName = LANG_NAMES[targetLang] || targetLang
  const prompt = `Translate each of the following texts to ${langName}. Return ONLY a JSON array of translated strings, in the same order. No markdown, no backticks, just the JSON array.\n\n${JSON.stringify(texts)}`

  const result = await model.generateContent(prompt)
  const raw = result.response.text().trim()
    .replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()

  try {
    return JSON.parse(raw)
  } catch {
    // Fallback: translate one by one
    const results = []
    for (const text of texts) {
      results.push(await translateText(text, targetLang))
    }
    return results
  }
}

export async function detectLanguage(text) {
  const result = await model.generateContent(
    `What language is this text written in? Reply with ONLY the ISO 639-1 two-letter language code (e.g. "en" for English, "he" for Hebrew). Nothing else.\n\n${text}`
  )
  const code = result.response.text().trim().toLowerCase().replace(/[^a-z]/g, '')
  return code === 'iw' ? 'he' : code
}
