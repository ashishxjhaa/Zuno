export function detectDependencies(
  files: Record<string, string>
): Record<string, string> {
  const deps: Record<string, string> = {}

  if (!files) return deps

  const allCode = Object.values(files).join("\n")
  const filePaths = Object.keys(files)

  const isLocalFileOrFolder = (pkgName: string) => {
    const name = pkgName.startsWith("@/") ? pkgName.substring(2) : pkgName

    return (
      pkgName.startsWith("@/") ||
      pkgName === "." ||
      filePaths.some(
        (p) =>
          p === `/${name}` ||
          p.startsWith(`/${name}/`) ||
          p.replace(/^\/[^/]+/, "") === `/${name}`
      )
    )
  }

  return deps
}
