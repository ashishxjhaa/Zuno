import type { Metadata } from "next"
import { BuilderWorkspace } from "@/components/builder-workspace"

export const metadata: Metadata = {
  title: "Builder",
}

export default async function BuilderPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return <BuilderWorkspace projectId={id} />
}
