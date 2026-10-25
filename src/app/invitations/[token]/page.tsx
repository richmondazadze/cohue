import type { Metadata } from "next";
import { PageFrame } from "@/components/shell/app-shell";
import { InvitationGate } from "@/features/invitations/gate";

export const metadata: Metadata = { title: "Invitation" };

export default async function InvitationLinkPage(props: PageProps<"/invitations/[token]">) {
  const { token } = await props.params;
  return (
    <PageFrame width="reading">
      <InvitationGate token={token} />
    </PageFrame>
  );
}
