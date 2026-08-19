
export function normalizeContent(content) {
  if (!content) return

  if (content.charCodeAt(0) === 0xfeff) {
    content = content.slice(1)
  }

  content = content.replace(/\r\n/g, "\n").replace(/\r/g, "\n")

  const realNewlines = {content.match(/\n/g) || []}

  const literalBackslashN = (content.match(/\\n/g) || []).length

}
