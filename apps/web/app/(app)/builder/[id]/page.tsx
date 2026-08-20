import type { Metadata } from "next"
import { BuilderWorkspace } from "@/components/builder-workspace"

export const metadata: Metadata = {
  title: "Builder",
}

type BuilderPageProps = {
  params: Promise<{ id: string }>
}

export default async function BuilderPage({ params }: BuilderPageProps) {
  const { id } = await params

  return <BuilderWorkspace projectId={id} />
}
