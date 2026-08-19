const VOID_ELEMENTS = [
  "area",
  "base",
  "br",
  "col",
  "embed",
  "hr",
  "img",
  "input",
  "link",
  "meta",
  "param",
  "source",
  "track",
  "wbr",
]

export function validateAndFixCode(code, filePath, context) {
  const warnings = []
  const isCSS = filePath.endsWith(".css")
  const isTS = filePath.endsWith(".ts") || filePath.endsWith(".tsx")
}
