import { BuilderWorkspace } from "@/components/builder-workspace"

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return <BuilderWorkspace projectId={id} />
}
