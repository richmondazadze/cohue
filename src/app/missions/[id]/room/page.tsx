import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { IdSchema } from "@/contracts";
import { PageFrame } from "@/components/shell/app-shell";
import { MissionRoom } from "@/features/room/room";

export const metadata: Metadata = { title: "Mission Room" };

export default async function RoomPage(props: PageProps<"/missions/[id]/room">) {
  const { id } = await props.params;
  if (!IdSchema.safeParse(id).success) notFound();
  return (
    <PageFrame width="form">
      <MissionRoom key={id} missionId={id} />
    </PageFrame>
  );
}
