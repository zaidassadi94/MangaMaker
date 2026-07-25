import { EditorShell } from "@/components/editor/editor-shell";

export const dynamic = "force-dynamic";

export default async function ProjectEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <EditorShell projectId={id} />;
}
