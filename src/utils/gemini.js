import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY)

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      // reader.result is "data:<mime>;base64,<data>" — strip the prefix
      const base64 = reader.result.split(',')[1]
      resolve({ inlineData: { data: base64, mimeType: file.type } })
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

const PROMPT = `Extract the recipe from these images.
Return ONLY a JSON object (no markdown, no backticks) with exactly three fields:
- "title": the recipe name (string)
- "ingredients": all ingredients, one per line (string). If the recipe has multiple sections (e.g. cake batter, frosting, filling), separate them with a header line formatted as "--- Section Name ---" followed by a blank line.
- "instructions": all steps, numbered (string). If the recipe has multiple sections, separate them with a header line formatted as "--- Section Name ---" followed by a blank line.

If the recipe spans multiple images, merge them into one complete recipe.
If you cannot read the image or it is not a recipe, return: {"title":"","ingredients":"","instructions":""}
`

export async function extractRecipeFromImages(files) {
  if (!files.length) {
    throw new Error('No images provided')
  }

  const imageParts = await Promise.all(files.map(fileToBase64))

  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })
  const result = await model.generateContent([PROMPT, ...imageParts])
  const text = result.response.text()

  // Gemini sometimes wraps JSON in ```json ... ``` — strip it
  const cleaned = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()

  try {
    const parsed = JSON.parse(cleaned)
    return {
      title: parsed.title || '',
      ingredients: parsed.ingredients || '',
      instructions: parsed.instructions || '',
    }
  } catch {
    throw new Error('PARSE_ERROR')
  }
}

export function getErrorMessage(error) {
  console.error('Gemini error:', error, error?.message, error?.status)
  if (error?.message === 'PARSE_ERROR') {
    return "Couldn't read the recipe. Try a clearer image."
  }
  if (error?.status === 429 || error?.message?.includes('429')) {
    return 'Too many scans right now. Wait a moment and try again.'
  }
  return "Couldn't reach the service. Check your internet and try again."
}
