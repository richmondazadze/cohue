import type { Metadata } from "next";
import { Suspense } from "react";
import { PageFrame } from "@/components/shell/app-shell";
import { Skeleton } from "@/components/ui/surface";
import { ParticipantHome } from "@/features/participants/home";

export const metadata: Metadata = { title: "My invitations" };

export default function MePage() {
  return (
    <PageFrame width="form">
      <p className="eyebrow">Participant</p>
      <h1 className="type-experience mt-2 mb-6">Your invitations</h1>
      <Suspense fallback={<Skeleton className="h-64 w-full rounded-panel" label="Loading profile" />}>
        <ParticipantHome />
      </Suspense>
    </PageFrame>
  );
}
