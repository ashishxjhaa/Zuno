import crypto from "crypto"

export function hashContent(content) {
  return crypto.createHash("md5").update(content).digest("hex").slice(0, 12)
}

export function applyOperations(currentFiles, operations) {
  const files = { ...currentFiles }
  const applied = []
  const errors = []
}

function searchReplace(content, search, replace) {
  if (content.includes(search)) {
    return content.replace(search, () => replace)
  }
}
