import { ExportPanel } from "@/components/export/export-panel";

export const dynamic = "force-dynamic";

export default async function ExportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ExportPanel projectId={id} />;
}
