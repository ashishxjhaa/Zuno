export function PreviewPanel({ src }: { src: string | null }) {
  if (!src) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        Preview appears after the first build.
      </div>
    )
  }

  return (
    <iframe
      title="Site preview"
      srcDoc={src}
      className="h-full w-full border-0 bg-white"
      sandbox="allow-scripts"
    />
  )
}
