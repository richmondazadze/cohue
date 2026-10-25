import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { IdSchema } from "@/contracts";
import { PageFrame } from "@/components/shell/app-shell";
import { ReplayAndImpact } from "@/features/replay/replay";

export const metadata: Metadata = { title: "Impact & replay" };

export default async function ReplayPage(props: PageProps<"/missions/[id]/replay">) {
  const { id } = await props.params;
  if (!IdSchema.safeParse(id).success) notFound();
  return (
    <PageFrame width="wide">
      <p className="eyebrow">Mission history</p>
      <h1 className="type-experience mt-2 mb-6">Impact &amp; replay</h1>
      <ReplayAndImpact key={id} missionId={id} />
    </PageFrame>
  );
}
