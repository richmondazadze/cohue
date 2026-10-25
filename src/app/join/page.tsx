import type { Metadata } from "next";
import { PageFrame } from "@/components/shell/app-shell";
import { Onboarding } from "@/features/participants/onboarding";

export const metadata: Metadata = { title: "Join" };

export default function JoinPage() {
  return (
    <PageFrame width="form">
      <p className="eyebrow">Participant onboarding</p>
      <h1 className="type-experience mt-2 mb-2 max-w-[22ch]">
        Tell us what you can offer, and when.
      </h1>
      <p className="mb-8 max-w-[60ch] text-muted">
        Your profile is used only to propose you for missions you can then accept
        or decline. Type your profile or record a draft, then review it before saving.
      </p>
      <Onboarding />
    </PageFrame>
  );
}
