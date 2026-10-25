import type { Metadata } from "next";
import { PageFrame } from "@/components/shell/app-shell";
import { Composer } from "@/features/missions/composer";

export const metadata: Metadata = { title: "Start a mission" };

export default function NewMissionPage() {
  return (
    <PageFrame width="form">
      <p className="eyebrow">Mission composer</p>
      <h1 className="type-experience mt-2 mb-2 max-w-[22ch]">From an idea to a clear brief.</h1>
      <p className="mb-8 max-w-[60ch] text-muted">
        Confirm requirements, time and participation before discovery begins. Nothing is sent to anyone from this page.
      </p>
      <Composer />
    </PageFrame>
  );
}
