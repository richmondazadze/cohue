import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { IdSchema } from "@/contracts";
import { PageFrame } from "@/components/shell/app-shell";
import { InvitationResponse } from "@/features/invitations/respond";

export const metadata: Metadata = { title: "Your invitation" };

export default async function OpenedInvitationPage(props: PageProps<"/invitations/opened/[id]">) {
  const { id } = await props.params;
  if (!IdSchema.safeParse(id).success) notFound();
  return (
    <PageFrame width="reading">
      <InvitationResponse key={id} invitationId={id} />
    </PageFrame>
  );
}
