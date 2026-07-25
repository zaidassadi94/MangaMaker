import { Reader } from "@/components/reader/reader";

export const dynamic = "force-dynamic";

export default async function ReadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <Reader projectId={id} />;
}
