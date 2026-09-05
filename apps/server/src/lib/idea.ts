import OpenAI from "openai"

const FALLBACKS = [
  "A portfolio for a software engineer with case studies, a skills grid, and a contact form.",
  "A bakery shop site with a warm menu, weekend hours, and a simple online order CTA.",
  "A boutique fitness studio landing page with class schedule, trainers, and membership pricing.",
  "A travel journal for a photographer with cinematic galleries and trip stories.",
  "A dark SaaS marketing site for an AI notes app with features, pricing, and a waitlist.",
  "A local coffee roastery site with origin stories, a shop grid, and tasting-room hours.",
  "A interior design studio page with project case studies, a moodboard, and a consult booking CTA.",
  "A kids' coding club site with courses, a parent FAQ, and a bright signup form.",
]

function getDeepseek() {
  const apiKey = process.env.DEEPSEEK_API_KEY
  if (!apiKey) {
    throw new Error("DEEPSEEK_API_KEY is not set")
  }
  return new OpenAI({
    apiKey,
    baseURL: "https://api.deepseek.com",
  })
}

function fallbackIdea() {
  return FALLBACKS[Math.floor(Math.random() * FALLBACKS.length)]!
}

function cleanIdea(raw: string) {
  const line = raw
    .replace(/^["'\s]+|["'\s]+$/g, "")
    .replace(/^idea:\s*/i, "")
    .split("\n")
    .map((part) => part.trim())
    .find(Boolean)
  if (!line) return fallbackIdea()
  return line.slice(0, 280)
}

export async function generateRandomIdea() {
  try {
    const deepseek = getDeepseek()
    const spice = Math.random().toString(36).slice(2, 8)
    const completion = await deepseek.chat.completions.create({
      model: "deepseek-chat",
      temperature: 1.15,
      max_tokens: 80,
      messages: [
        {
          role: "system",
          content:
            "You invent website ideas for Zuno, an AI website builder. Reply with ONE sentence the user can paste as a prompt. 12 to 28 words. Name a specific audience, what the site is for, and 2-3 concrete sections. No quotes, no preamble, no lists.",
        },
        {
          role: "user",
          content: `Give me a fresh website idea. Seed: ${spice}. Avoid generic purple SaaS.`,
        },
      ],
    })
    const text = completion.choices[0]?.message?.content?.trim()
    if (!text) return fallbackIdea()
    return cleanIdea(text)
  } catch {
    return fallbackIdea()
  }
}
