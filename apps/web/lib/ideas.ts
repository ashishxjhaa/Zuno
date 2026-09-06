export const LANDING_IDEAS = [
  "A portfolio for a software engineer with case studies, a skills grid, and a contact form.",
  "A bakery shop site with a warm menu, weekend hours, and a simple online order CTA.",
  "A boutique fitness studio landing page with class schedule, trainers, and membership pricing.",
  "A travel journal for a photographer with cinematic galleries and trip stories.",
  "A dark SaaS marketing site for an AI notes app with features, pricing, and a waitlist.",
  "A local coffee roastery site with origin stories, a shop grid, and tasting-room hours.",
  "An interior design studio page with project case studies, a moodboard, and a consult booking CTA.",
  "A kids' coding club site with courses, a parent FAQ, and a bright signup form.",
] as const

export function pickLandingIdea(): string {
  return LANDING_IDEAS[Math.floor(Math.random() * LANDING_IDEAS.length)]!
}
