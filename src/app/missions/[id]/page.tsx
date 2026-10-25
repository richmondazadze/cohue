import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { IdSchema } from "@/contracts";
import { PageFrame } from "@/components/shell/app-shell";
import { MissionTheater } from "@/features/theater/theater";

export const metadata: Metadata = { title: "Mission Theater" };

export default async function MissionPage(props: PageProps<"/missions/[id]">) {
  const { id } = await props.params;
  if (!IdSchema.safeParse(id).success) notFound();
  return (
    <PageFrame width="wide" className="md:pt-6">
      <MissionTheater key={id} missionId={id} />
    </PageFrame>
  );
}
